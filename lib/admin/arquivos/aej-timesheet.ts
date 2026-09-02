import { parseClockMinutes } from "@/lib/admin/regras/schedule";
import { onlyDigits } from "@/lib/onboarding/documents";

export type AejPunchKind = "E" | "S";
export type AejPunchSource = "O" | "I" | "P";

export type AejEmployee = {
  seq: string;
  cpf: string;
  name: string;
};

export type AejContractSchedule = {
  code: string;
  entry1Minutes: number;
  entry2Minutes: number | null;
};

export type AejPunch = {
  employeeSeq: string;
  scheduleCode: string;
  date: string;
  minutes: number;
  kind: AejPunchKind;
  sequence: 1 | 2;
  source: AejPunchSource;
};

export type AejTimesheet = {
  periodStart: string | null;
  periodEnd: string | null;
  employees: AejEmployee[];
  schedules: Map<string, AejContractSchedule>;
  punches: AejPunch[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function parsePunchDateTime(
  value: string
): { date: string; minutes: number } | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);

  if (!match) {
    return null;
  }

  const date = match[1];
  const hours = Number(match[2]);
  const minutes = Number(match[3]);

  if (!isIsoDate(date) || hours > 23 || minutes > 59) {
    return null;
  }

  return { date, minutes: hours * 60 + minutes };
}

function parseHeaderPeriod(parts: string[]): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const periodStart = parts[6] ?? "";
  const periodEnd = parts[7] ?? "";

  return {
    periodStart: isIsoDate(periodStart) ? periodStart : null,
    periodEnd: isIsoDate(periodEnd) ? periodEnd : null,
  };
}

function parseContractSchedule(parts: string[]): AejContractSchedule | null {
  const code = (parts[1] ?? "").trim();
  const entry1Minutes = parseClockMinutes(parts[3] ?? "");
  const entry2Minutes = parseClockMinutes(parts[5] ?? "");

  if (!code || entry1Minutes == null) {
    return null;
  }

  return {
    code,
    entry1Minutes,
    entry2Minutes,
  };
}

export function parseAejTimesheet(text: string): AejTimesheet {
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  const punches: AejPunch[] = [];
  const employees: AejEmployee[] = [];
  const schedules = new Map<string, AejContractSchedule>();
  const seenCpfs = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const parts = line.split("|");
    const type = parts[0];

    if (type === "01" && !periodStart && !periodEnd) {
      const header = parseHeaderPeriod(parts);
      periodStart = header.periodStart;
      periodEnd = header.periodEnd;
      continue;
    }

    if (type === "03") {
      const seq = (parts[1] ?? "").trim();
      const cpf = onlyDigits(parts[2] ?? "");
      const name = (parts[3] ?? "").replace(/\s+/g, " ").trim();

      if (
        !seq ||
        !/^\d{11}$/.test(cpf) ||
        seenCpfs.has(cpf) ||
        name.length === 0
      ) {
        continue;
      }

      seenCpfs.add(cpf);
      employees.push({ seq, cpf, name: name.slice(0, 120) });
      continue;
    }

    if (type === "04") {
      const schedule = parseContractSchedule(parts);

      if (schedule && !schedules.has(schedule.code)) {
        schedules.set(schedule.code, schedule);
      }

      continue;
    }

    if (type !== "05") {
      continue;
    }

    const employeeSeq = (parts[1] ?? "").trim();
    const parsed = parsePunchDateTime(parts[2] ?? "");
    const scheduleCode = (parts[3] ?? "").trim();
    const kind = parts[4] === "S" ? "S" : parts[4] === "E" ? "E" : null;
    const sequence = parts[5] === "2" ? 2 : 1;
    const sourceRaw = (parts[6] ?? "O").trim().toUpperCase();
    const source: AejPunchSource =
      sourceRaw === "I" || sourceRaw === "P" ? sourceRaw : "O";

    if (!employeeSeq || !parsed || !kind) {
      continue;
    }

    punches.push({
      employeeSeq,
      scheduleCode,
      date: parsed.date,
      minutes: parsed.minutes,
      kind,
      sequence,
      source,
    });
  }

  return { periodStart, periodEnd, employees, schedules, punches };
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function endOfMonth(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

export function nextUtcMonth(isoDate: string): string {
  const date = new Date(`${startOfMonth(isoDate)}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export function previousUtcMonth(isoDate: string): string {
  const date = new Date(`${startOfMonth(isoDate)}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 10);
}

export function monthsInPeriod(periodStart: string, periodEnd: string): string[] {
  const months: string[] = [];
  let current = startOfMonth(periodStart);
  const last = startOfMonth(periodEnd);

  if (current > last) {
    return months;
  }

  while (current <= last) {
    months.push(current);
    current = nextUtcMonth(current);
  }

  return months;
}

export function clipPeriodToMonth(
  periodStart: string,
  periodEnd: string,
  month: string
): { start: string; end: string } | null {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(monthStart);
  const start = periodStart > monthStart ? periodStart : monthStart;
  const end = periodEnd < monthEnd ? periodEnd : monthEnd;

  if (start > end) {
    return null;
  }

  return { start, end };
}

export function eachCalendarDate(periodStart: string, periodEnd: string): string[] {
  const days: string[] = [];
  const current = new Date(`${periodStart}T00:00:00.000Z`);
  const end = new Date(`${periodEnd}T00:00:00.000Z`);

  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime()) || current > end) {
    return days;
  }

  while (current <= end) {
    days.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

export function eachWeekday(periodStart: string, periodEnd: string): string[] {
  return eachCalendarDate(periodStart, periodEnd).filter((isoDate) => {
    const day = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
    return day !== 0 && day !== 6;
  });
}

export function timesheetPeriod(sheet: AejTimesheet): {
  periodStart: string;
  periodEnd: string;
} | null {
  const punchDates = sheet.punches.map((punch) => punch.date).sort();
  const periodStart = sheet.periodStart ?? punchDates[0] ?? null;
  const periodEnd =
    sheet.periodEnd ?? punchDates[punchDates.length - 1] ?? null;

  if (!periodStart || !periodEnd) {
    return null;
  }

  return { periodStart, periodEnd };
}
