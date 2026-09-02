export const BONUS_WEEK_COUNT = 4;
export const BONUS_WEEK_SHARE = 1 / BONUS_WEEK_COUNT;

export type BonusWeekIndex = 0 | 1 | 2 | 3;

export function bonusWeekIndex(isoDate: string): BonusWeekIndex {
  const day = Number(isoDate.slice(8, 10));

  if (day <= 7) {
    return 0;
  }

  if (day <= 14) {
    return 1;
  }

  if (day <= 21) {
    return 2;
  }

  return 3;
}

export function bonusWeekRangeLabel(index: BonusWeekIndex, monthIso: string): string {
  const year = Number(monthIso.slice(0, 4));
  const month = Number(monthIso.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = index * 7 + 1;
  const end = index === 3 ? lastDay : (index + 1) * 7;

  return `${String(start).padStart(2, "0")} a ${String(end).padStart(2, "0")}`;
}

export function bonusWeekTitle(index: BonusWeekIndex): string {
  return `${index + 1}ª semana`;
}

export function todayIsoDate(
  now: Date = new Date(),
  timeZone = "America/Sao_Paulo"
): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

export function endOfMonth(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}
