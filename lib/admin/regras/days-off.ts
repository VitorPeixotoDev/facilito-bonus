export const WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
export const NTH_SUNDAY_VALUES = [1, 2, 3, 4, 5] as const;
export const SUNDAY_RULE_TYPE_VALUES = ["none", "fixed_nth", "floating"] as const;

export type Weekday = (typeof WEEKDAY_VALUES)[number];
export type NthSunday = (typeof NTH_SUNDAY_VALUES)[number];
export type SundayRuleType = (typeof SUNDAY_RULE_TYPE_VALUES)[number];

export type DaysOffSchedule = {
  fixedDaysOff: number[];
  sundayRuleType: SundayRuleType;
  fixedSundays: number[];
  floatingSundays: string[];
};

export const WEEKDAYS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
] as const;

export const NTH_SUNDAYS = [
  { value: 1, label: "1º domingo" },
  { value: 2, label: "2º domingo" },
  { value: 3, label: "3º domingo" },
  { value: 4, label: "4º domingo" },
  { value: 5, label: "5º domingo" },
] as const;

export const SUNDAY_RULE_TYPES = [
  {
    value: "none",
    label: "Nenhuma regra extra",
    hint: "O domingo segue só os dias fixos: folga se estiver marcado, senão é dia de trabalho.",
  },
  {
    value: "fixed_nth",
    label: "Domingos fixos do mês",
    hint: "Ex.: 1º e 3º domingo de cada mês são folga; os demais são dia de trabalho.",
  },
  {
    value: "floating",
    label: "Datas avulsas",
    hint: "O RH escolhe os domingos de folga por data. Os demais domingos são dia de trabalho.",
  },
] as const;

export const DEFAULT_FIXED_DAYS_OFF: Weekday[] = [0, 6];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isSundayRuleType(value: string): value is SundayRuleType {
  return (SUNDAY_RULE_TYPE_VALUES as readonly string[]).includes(value);
}

export function isIsoDate(value: string): boolean {
  return (
    ISO_DATE_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  );
}

export function parseUtcDate(isoDate: string): Date | null {
  if (!isIsoDate(isoDate)) {
    return null;
  }

  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function uniqueSortedNumbers(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value)))].sort(
    (left, right) => left - right
  );
}

export function uniqueSortedDates(values: string[]): string[] {
  return [...new Set(values.filter(isIsoDate))].sort();
}

export function isSundayIsoDate(value: string): boolean {
  const date = parseUtcDate(value);
  return date != null && date.getUTCDay() === 0;
}

function getNthWeekdayOfMonth(date: Date): number {
  return Math.ceil(date.getUTCDate() / 7);
}

export function daysOffScheduleFrom(row: {
  fixed_days_off?: number[] | null;
  sunday_rule_type?: string | null;
  fixed_sundays?: number[] | null;
  floating_sundays?: string[] | null;
}): DaysOffSchedule {
  const sundayRule = row.sunday_rule_type ?? "none";

  return {
    fixedDaysOff: uniqueSortedNumbers(row.fixed_days_off ?? []),
    sundayRuleType: isSundayRuleType(sundayRule) ? sundayRule : "none",
    fixedSundays: uniqueSortedNumbers(row.fixed_sundays ?? []),
    floatingSundays: uniqueSortedDates(
      (row.floating_sundays ?? []).map((value) => String(value).slice(0, 10))
    ),
  };
}

export function listMonthDates(monthIso: string): string[] {
  const year = Number(monthIso.slice(0, 4));
  const month = Number(monthIso.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates: string[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    dates.push(`${monthIso.slice(0, 7)}-${String(day).padStart(2, "0")}`);
  }

  return dates;
}

export function listScheduledDaysOffInMonth(
  monthIso: string,
  schedule: DaysOffSchedule
): string[] {
  return listMonthDates(monthIso).filter((date) =>
    isScheduledDayOff(date, schedule)
  );
}

export function isScheduledDayOff(
  isoDate: string,
  schedule: DaysOffSchedule
): boolean {
  const date = parseUtcDate(isoDate);

  if (!date) {
    return false;
  }

  const dayOfWeek = date.getUTCDay();

  if (dayOfWeek !== 0 && schedule.fixedDaysOff.includes(dayOfWeek)) {
    return true;
  }

  if (dayOfWeek !== 0) {
    return false;
  }

  if (schedule.fixedDaysOff.includes(0)) {
    return true;
  }

  switch (schedule.sundayRuleType) {
    case "fixed_nth":
      return schedule.fixedSundays.includes(getNthWeekdayOfMonth(date));
    case "floating":
      return schedule.floatingSundays.includes(isoDate);
    case "none":
    default:
      return false;
  }
}

function joinPt(items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function weekdayLabel(value: number, lowercase = false): string {
  const label =
    WEEKDAYS.find((weekday) => weekday.value === value)?.label ?? String(value);
  return lowercase ? label.toLowerCase() : label;
}

function formatNthSundays(values: number[]): string {
  const labels = uniqueSortedNumbers(values).flatMap((value) => {
    const match = NTH_SUNDAYS.find((entry) => entry.value === value);
    return match ? [match.label] : [];
  });

  return joinPt(labels);
}

export function formatDaysOffSummary(schedule: DaysOffSchedule): string {
  const fixedDays = uniqueSortedNumbers(schedule.fixedDaysOff).filter(
    (day) => day !== 0 || schedule.sundayRuleType === "none"
  );
  const parts = fixedDays.map((day) => weekdayLabel(day, true));

  if (!schedule.fixedDaysOff.includes(0)) {
    if (schedule.sundayRuleType === "fixed_nth" && schedule.fixedSundays.length > 0) {
      parts.push(formatNthSundays(schedule.fixedSundays));
    } else if (
      schedule.sundayRuleType === "floating" &&
      schedule.floatingSundays.length > 0
    ) {
      parts.push(
        schedule.floatingSundays.length === 1
          ? "1 domingo avulso"
          : `${schedule.floatingSundays.length} domingos avulsos`
      );
    }
  }

  if (parts.length === 0) {
    return "Sem folga programada";
  }

  const summary = joinPt(parts);
  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

export function formatIsoDatePt(isoDate: string): string {
  const date = parseUtcDate(isoDate);

  if (!date) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
