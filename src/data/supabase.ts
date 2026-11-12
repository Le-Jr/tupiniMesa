// Thin Supabase adapter behind the `Remote` interface from sync.ts.
// Devices sign in anonymously; access to a household is granted by its
// invite code (see supabase/schema.sql).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Rec } from "../domain/model.ts";
import type { PullResult, Remote } from "./sync.ts";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const cloudConfigured = url.length > 0 && key.length > 0;

let client: SupabaseClient | undefined;
function db(): SupabaseClient {
  if (!cloudConfigured)
    throw new Error("Sincronização não configurada neste app.");
  client ??= createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

async function ensureSignedIn(): Promise<void> {
  const { data } = await db().auth.getSession();
  if (data.session) return;
  const { error } = await db().auth.signInAnonymously();
  if (error) throw new Error(explain(error.message));
}

function explain(message: string): string {
  if (/anonymous/i.test(message))
    return "Ative 'Allow anonymous sign-ins' no painel do Supabase (Authentication).";
  if (/invalid code/i.test(message)) return "Código de convite não encontrado.";
  if (/fetch|network/i.test(message))
    return "Sem conexão com o servidor. Tente de novo quando estiver online.";
  return message;
}

export interface HouseholdRef {
  id: string;
  code: string;
  name?: string;
}

export async function createHousehold(name: string): Promise<HouseholdRef> {
  await ensureSignedIn();
  const { data, error } = await db().rpc("create_household", { p_name: name });
  if (error) throw new Error(explain(error.message));
  const row = (Array.isArray(data) ? data[0] : data) as HouseholdRef | null;
  if (!row) throw new Error("O servidor não devolveu a residência criada.");
  return row;
}

export async function joinHousehold(code: string): Promise<HouseholdRef> {
  await ensureSignedIn();
  const { data, error } = await db().rpc("join_household", { p_code: code });
  if (error) throw new Error(explain(error.message));
  const row = (Array.isArray(data) ? data[0] : data) as HouseholdRef | null;
  if (!row) throw new Error("Código de convite não encontrado.");
  return row;
}

const PAGE = 1000;

export function remoteFor(householdId: string): Remote {
  return {
    async push(rows: Rec[]) {
      await ensureSignedIn();
      const { error } = await db()
        .from("records")
        .upsert(
          rows.map((r) => ({
            id: r.id,
            household_id: householdId,
            data: r,
            updated_at: r.updatedAt,
            deleted: !!r.deleted,
          })),
        );
      if (error) throw new Error(explain(error.message));
    },
    async pull(sinceSeq: number): Promise<PullResult> {
      await ensureSignedIn();
      const rows: Rec[] = [];
      let seq = sinceSeq;
      for (;;) {
        const { data, error } = await db()
          .from("records")
          .select("data, seq")
          .eq("household_id", householdId)
          .gt("seq", seq)
          .order("seq", { ascending: true })
          .limit(PAGE);
        if (error) throw new Error(explain(error.message));
        const page = (data ?? []) as { data: Rec; seq: number }[];
        for (const row of page) {
          rows.push(row.data);
          seq = Math.max(seq, Number(row.seq));
        }
        if (page.length < PAGE) break;
      }
      return { rows, seq };
    },
  };
}

/** Calls `onChange` whenever another device writes to this household. */
export function subscribe(householdId: string, onChange: () => void) {
  const channel = db()
    .channel(`records:${householdId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "records",
        filter: `household_id=eq.${householdId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    void db().removeChannel(channel);
  };
}
