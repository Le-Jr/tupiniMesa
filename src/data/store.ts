// Local-first store: every change is applied and saved on this device first,
// then pushed to the household in the background when sync is connected.
import { useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collect, type Collections, type Rec, type Records } from "../domain/model";
import { syncOnce } from "./sync";
import {
  cloudConfigured,
  createHousehold,
  joinHousehold,
  remoteFor,
  subscribe as subscribeRemote,
} from "./supabase";

const STORAGE_KEY = "tupinimesa/v1";

export type SyncStatus = "local" | "syncing" | "ok" | "offline";

interface Meta {
  onboarded: boolean;
  householdId?: string;
  code?: string;
  lastSeq: number;
  dirty: string[];
}

export interface State {
  ready: boolean;
  records: Records;
  meta: Meta;
  sync: SyncStatus;
  syncError?: string;
  lastSyncAt?: number;
}

let state: State = {
  ready: false,
  records: {},
  meta: { onboarded: false, lastSeq: 0, dirty: [] },
  sync: "local",
};

const listeners = new Set<() => void>();
function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export const getState = () => state;
const subscribeStore = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribeStore,
    () => selector(state),
    () => selector(state),
  );
}

export function useData(): Collections {
  const records = useStore((s) => s.records);
  return useMemo(() => collect(records), [records]);
}

// ---------- persistence ----------

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { records, meta } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ records, meta })).catch(
      () => set({ syncError: "Não foi possível salvar neste aparelho." }),
    );
  }, 250);
}

export async function init(): Promise<void> {
  if (state.ready) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { records?: Records; meta?: Partial<Meta> };
      state = {
        ...state,
        records: saved.records ?? {},
        meta: { ...state.meta, ...saved.meta },
      };
    }
  } catch {
    // Unreadable save: start empty rather than refuse to open.
  }
  set({ ready: true, sync: state.meta.householdId ? "syncing" : "local" });
  startSync();
}

// ---------- local writes ----------

/** Monotonic per device so two quick edits never share a timestamp. */
let lastStamp = 0;
function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

/** Saves records as local edits (new timestamp, queued for sync). */
export function put(...recs: Rec[]): void {
  if (!recs.length) return;
  const records = { ...state.records };
  const dirty = new Set(state.meta.dirty);
  for (const r of recs) {
    records[r.id] = { ...r, updatedAt: stamp() };
    dirty.add(r.id);
  }
  set({ records, meta: { ...state.meta, dirty: [...dirty] } });
  scheduleSave();
  scheduleSync(600);
}

export function remove(...ids: string[]): void {
  const recs = ids
    .map((id) => state.records[id])
    .filter((r): r is Rec => !!r)
    .map((r) => ({ ...r, deleted: true }));
  put(...recs);
}

export function setOnboarded(): void {
  set({ meta: { ...state.meta, onboarded: true } });
  scheduleSave();
}

// ---------- sync ----------

let running = false;
let again = false;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let stopRealtime: (() => void) | undefined;
let poll: ReturnType<typeof setInterval> | undefined;

function scheduleSync(delay: number) {
  if (!state.meta.householdId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void syncNow(), delay);
}

export async function syncNow(full = false): Promise<void> {
  const householdId = state.meta.householdId;
  if (!householdId || !cloudConfigured) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  set({ sync: "syncing" });
  try {
    await syncOnce(
      () => ({
        records: state.records,
        dirty: state.meta.dirty,
        lastSeq: state.meta.lastSeq,
      }),
      (patch) => {
        set({
          records: patch.records ?? state.records,
          meta: {
            ...state.meta,
            dirty: patch.dirty ?? state.meta.dirty,
            lastSeq: patch.lastSeq ?? state.meta.lastSeq,
          },
        });
        scheduleSave();
      },
      remoteFor(householdId),
      { full },
    );
    set({ sync: "ok", syncError: undefined, lastSyncAt: Date.now() });
  } catch (e) {
    set({
      sync: "offline",
      syncError: e instanceof Error ? e.message : "Falha ao sincronizar.",
    });
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync(100);
    }
  }
}

function startSync() {
  stopRealtime?.();
  stopRealtime = undefined;
  if (poll) clearInterval(poll);
  const householdId = state.meta.householdId;
  if (!householdId || !cloudConfigured) return;
  // A full pull on start covers anything a cursor-based pull could miss.
  void syncNow(true);
  try {
    stopRealtime = subscribeRemote(householdId, () => scheduleSync(150));
  } catch {
    // Realtime is a bonus; the poll below still keeps devices in step.
  }
  poll = setInterval(() => void syncNow(), 45_000);
}

AppState.addEventListener("change", (s) => {
  if (s === "active") scheduleSync(0);
});

function connect(ref: { id: string; code: string }) {
  // Everything already on this device goes up to the household.
  set({
    meta: {
      ...state.meta,
      householdId: ref.id,
      code: ref.code,
      lastSeq: 0,
      dirty: Object.keys(state.records),
    },
  });
  scheduleSave();
  startSync();
}

/** Publishes this device's residence and returns its invite code. */
export async function shareHousehold(name: string): Promise<string> {
  const ref = await createHousehold(name);
  connect(ref);
  return ref.code;
}

/** Joins a residence created on another device. */
export async function enterHousehold(code: string): Promise<void> {
  const ref = await joinHousehold(code);
  connect(ref);
  set({ meta: { ...state.meta, onboarded: true } });
  scheduleSave();
}

/** Stops syncing; data stays on this device. */
export function disconnect(): void {
  stopRealtime?.();
  stopRealtime = undefined;
  if (poll) clearInterval(poll);
  set({
    sync: "local",
    syncError: undefined,
    meta: {
      ...state.meta,
      householdId: undefined,
      code: undefined,
      lastSeq: 0,
      dirty: [],
    },
  });
  scheduleSave();
}

export { cloudConfigured };
