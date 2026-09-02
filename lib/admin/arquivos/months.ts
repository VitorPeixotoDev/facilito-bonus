import { startOfMonth } from "@/lib/admin/arquivos/aej-timesheet";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

export const ADMIN_ANALYSIS_MONTH_COOKIE = "facilito-admin-mes";
export const ADMIN_ANALYSIS_MONTH_MAX_AGE = 60 * 60 * 24 * 400;

export function monthParam(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function parseMonthParam(
  value: string | string[] | undefined | null
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return null;
  }

  const key = raw.length >= 7 ? raw.slice(0, 7) : raw;
  const match = MONTH_KEY_PATTERN.exec(key);

  if (!match) {
    return null;
  }

  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  const iso = `${match[1]}-${match[2]}-01`;

  if (Number.isNaN(Date.parse(`${iso}T00:00:00.000Z`))) {
    return null;
  }

  return iso;
}

export function uniqueMonthsDesc(months: string[]): string[] {
  return [...new Set(months.map((month) => startOfMonth(month)))].sort((left, right) =>
    right.localeCompare(left)
  );
}

export function resolveTimesheetMonth(input: {
  requested?: string | string[] | undefined | null;
  availableMonths: string[];
  today?: string;
}): {
  selectedMonth: string;
  currentMonth: string;
  months: string[];
} {
  const currentMonth = startOfMonth(input.today ?? todayIsoDate());
  const available = uniqueMonthsDesc(input.availableMonths);
  const months = uniqueMonthsDesc([...available, currentMonth]);
  const requested = parseMonthParam(input.requested);

  const selectedMonth =
    requested && months.includes(requested)
      ? requested
      : available.includes(currentMonth)
        ? currentMonth
        : (available[0] ?? currentMonth);

  return { selectedMonth, currentMonth, months };
}

export function timesheetMonthHref(basePath: string, month: string): string {
  const query = `mes=${monthParam(month)}`;

  if (!basePath || basePath === "/") {
    return `/?${query}`;
  }

  return `${basePath}?${query}`;
}
