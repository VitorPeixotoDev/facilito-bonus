import { cookies } from "next/headers";
import {
  ADMIN_ANALYSIS_MONTH_COOKIE,
  parseMonthParam,
} from "@/lib/admin/arquivos/months";

export async function requestedAnalysisMonth(
  searchMonth?: string | string[] | null
): Promise<string | undefined> {
  if (parseMonthParam(searchMonth)) {
    return Array.isArray(searchMonth) ? searchMonth[0] : (searchMonth ?? undefined);
  }

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_ANALYSIS_MONTH_COOKIE)?.value;
}
