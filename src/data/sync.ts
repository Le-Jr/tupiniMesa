// Sync engine, independent of any backend so it can be tested with a fake.
// Rule: for each record id the copy with the newest `updatedAt` wins
// (last-writer-wins). Deletions are records too (`deleted: true`).
import type { Rec, Records } from "../domain/model.ts";

export interface PullResult {
  rows: Rec[];
  /** Server cursor to pass to the next pull. */
  seq: number;
}

export interface Remote {
  push(rows: Rec[]): Promise<void>;
  pull(sinceSeq: number): Promise<PullResult>;
}

/** True when `incoming` should replace `local`. Deterministic on ties. */
export function wins(incoming: Rec, local: Rec | undefined): boolean {
  if (!local) return true;
  if (incoming.updatedAt !== local.updatedAt)
    return incoming.updatedAt > local.updatedAt;
  // Same timestamp from two devices: pick the same winner everywhere.
  return JSON.stringify(incoming) > JSON.stringify(local);
}

export function mergeRemote(
  local: Records,
  incoming: Rec[],
): { records: Records; changed: number } {
  let changed = 0;
  let records = local;
  for (const rec of incoming) {
    if (!rec || typeof rec.id !== "string") continue;
    if (!wins(rec, records[rec.id])) continue;
    if (records === local) records = { ...local };
    records[rec.id] = rec;
    changed++;
  }
  return { records, changed };
}

export interface SyncState {
  records: Records;
  /** Ids changed locally and not yet confirmed by the server. */
  dirty: string[];
  lastSeq: number;
}

/**
 * One push + pull round. Reads the state through `get` again after each
 * await, because the user may keep editing while the network is busy.
 */
export async function syncOnce(
  get: () => SyncState,
  apply: (patch: Partial<SyncState>) => void,
  remote: Remote,
  opts: { full?: boolean } = {},
): Promise<{ pushed: number; pulled: number }> {
  const before = get();
  const sent = before.dirty
    .map((id) => before.records[id])
    .filter((r): r is Rec => !!r);
  if (sent.length) {
    await remote.push(sent);
    const now = get();
    // Keep dirty anything edited again while the push was in flight.
    const stillDirty = now.dirty.filter((id) => {
      const pushed = sent.find((r) => r.id === id);
      return !pushed || now.records[id]?.updatedAt !== pushed.updatedAt;
    });
    apply({ dirty: stillDirty });
  }
  const { rows, seq } = await remote.pull(opts.full ? 0 : get().lastSeq);
  const now = get();
  const merged = mergeRemote(now.records, rows);
  apply({
    records: merged.records,
    lastSeq: Math.max(now.lastSeq, seq),
  });
  return { pushed: sent.length, pulled: merged.changed };
}
