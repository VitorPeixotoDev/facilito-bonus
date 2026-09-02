import type { PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppSupabaseClient = SupabaseClient<Database>;

let cached: boolean | null = null;

export function isMissingJustificationKindColumn(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined
): boolean {
  if (!error) {
    return false;
  }

  const haystack = `${error.code ?? ""} ${error.message} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return haystack.includes("justification_kind");
}

export async function justificationKindColumnExists(
  supabase: AppSupabaseClient
): Promise<boolean> {
  if (cached != null) {
    return cached;
  }

  const { error } = await supabase
    .from("timesheet_events")
    .select("id, justification_kind")
    .limit(1);

  if (!error) {
    cached = true;
    return true;
  }

  if (isMissingJustificationKindColumn(error)) {
    cached = false;
    return false;
  }

  cached = true;
  return true;
}

export function timesheetSelect<T extends string>(
  hasKind: boolean,
  withKind: T,
  withoutKind: string
): T {
  return (hasKind ? withKind : withoutKind) as T;
}

export function readJustificationKind(row: {
  justification_kind?: string | null;
}): string | null {
  return row.justification_kind ?? null;
}

export function omitJustificationKind<T extends { justification_kind?: unknown }>(
  row: T
): Omit<T, "justification_kind"> {
  const { justification_kind: _ignored, ...rest } = row;
  return rest;
}
