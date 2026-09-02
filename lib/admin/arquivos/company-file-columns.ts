type PostgrestLikeError = {
  code?: string;
  message?: string;
} | null;

export const COMPANY_FILE_SELECT =
  "id, company_id, original_name, storage_path, size_bytes, purpose, period_start, period_end, created_at";

export const COMPANY_FILE_SELECT_WITHOUT_PERIOD =
  "id, company_id, original_name, storage_path, size_bytes, purpose, created_at";

export function isMissingPeriodColumn(error: PostgrestLikeError): boolean {
  if (!error) {
    return false;
  }

  const message = error.message ?? "";

  return (
    error.code === "42703" ||
    message.includes("period_start") ||
    message.includes("period_end")
  );
}
