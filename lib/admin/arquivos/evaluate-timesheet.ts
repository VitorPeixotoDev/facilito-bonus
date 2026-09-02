import type {
  AejContractSchedule,
  AejPunch,
} from "@/lib/admin/arquivos/aej-timesheet";
import {
  isScheduledDayOff,
  type DaysOffSchedule,
} from "@/lib/admin/regras/days-off";
import {
  calculateScheduleBonus,
  timesheetDayNotes,
  type BonusScheduleInput,
} from "@/lib/admin/regras/calculate-bonus";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import {
  DEFAULT_JUSTIFICATION_STATUS,
  type JustificationStatus,
} from "@/lib/admin/regras/justification";
import { parseClockMinutes } from "@/lib/admin/regras/schedule";

export { timesheetDayNotes };

const MINUTES_IN_DAY = 24 * 60;
const LATE_WRAP_THRESHOLD = 12 * 60;
const MAX_SLOT_DISTANCE_MINUTES = 4 * 60;

export type EvaluatedDay = {
  eventDate: string;
  latenessMinutes: number;
  isAbsence: boolean;
  isDayOff: boolean;
  isFuture: boolean;
  hasManualAdjustment: boolean;
  notes: string;
};

export type EvaluatedTimesheet = {
  days: EvaluatedDay[];
  totalAbsences: number;
  totalLatenessMinutes: number;
  manualAdjustmentsCount: number;
  earnedAmount: number;
};

type ScheduledSlot = {
  sequence: 1 | 2;
  minutes: number;
};

function circularDelta(actualMinutes: number, scheduledMinutes: number): number {
  let delta = actualMinutes - scheduledMinutes;

  if (delta < -LATE_WRAP_THRESHOLD) {
    delta += MINUTES_IN_DAY;
  }

  return delta;
}

function slotDistance(actualMinutes: number, scheduledMinutes: number): number {
  const delta = circularDelta(actualMinutes, scheduledMinutes);
  return delta < 0 ? Math.min(-delta, MINUTES_IN_DAY + delta) : delta;
}

function minutesLate(actualMinutes: number, scheduledMinutes: number): number {
  const delta = circularDelta(actualMinutes, scheduledMinutes);
  return delta > 0 ? delta : 0;
}

const CLOCK_LIKE_MINUTES = 4 * 60;
const CLOCK_MATCH_WINDOW_MINUTES = 90;
const DEFAULT_DAY_ENTRY_SLOTS = [8 * 60, 13 * 60];

export function scheduledEntryMinutes(schedule: {
  entry1: string;
  entry2: string | null;
}): number[] {
  return [schedule.entry1, schedule.entry2].flatMap((value) => {
    const minutes = parseClockMinutes(value);
    return minutes != null && minutes > 0 ? [minutes] : [];
  });
}

export function normalizeStoredLatenessMinutes(
  storedMinutes: number,
  scheduledSlots: number[]
): number {
  if (storedMinutes < CLOCK_LIKE_MINUTES) {
    return storedMinutes;
  }

  const slots = scheduledSlots.filter((slot) => slot > 0);
  const candidates = slots.length > 0 ? slots : DEFAULT_DAY_ENTRY_SLOTS;

  let best: number | null = null;

  for (const slot of candidates) {
    if (Math.abs(storedMinutes - slot) > CLOCK_MATCH_WINDOW_MINUTES) {
      continue;
    }

    const delay = Math.max(0, storedMinutes - slot);

    if (best == null || delay < best) {
      best = delay;
    }
  }

  return best ?? storedMinutes;
}

function resolveSlotMinutes(
  assigned: string | null | undefined,
  fileMinutes: number | null | undefined
): number | null {
  if (fileMinutes != null) {
    return fileMinutes;
  }

  return parseClockMinutes(assigned);
}

function scheduledSlots(
  schedule: { entry1: string; entry2: string | null },
  fileSchedule: AejContractSchedule | null
): ScheduledSlot[] {
  const slots: ScheduledSlot[] = [];
  const entry1 = resolveSlotMinutes(schedule.entry1, fileSchedule?.entry1Minutes);

  if (entry1 != null) {
    slots.push({ sequence: 1, minutes: entry1 });
  }

  const entry2 = resolveSlotMinutes(schedule.entry2, fileSchedule?.entry2Minutes);

  if (entry2 != null) {
    slots.push({ sequence: 2, minutes: entry2 });
  }

  return slots;
}

function pickEntryIndex(
  entries: AejPunch[],
  used: Set<number>,
  slot: ScheduledSlot
): number {
  const bySequence = entries.findIndex(
    (entry, index) => !used.has(index) && entry.sequence === slot.sequence
  );

  if (bySequence >= 0) {
    return bySequence;
  }

  let best: { index: number; distance: number } | null = null;

  for (let index = 0; index < entries.length; index += 1) {
    if (used.has(index)) {
      continue;
    }

    const distance = slotDistance(entries[index].minutes, slot.minutes);

    if (distance > MAX_SLOT_DISTANCE_MINUTES) {
      continue;
    }

    if (!best || distance < best.distance) {
      best = { index, distance };
    }
  }

  return best?.index ?? -1;
}

function latenessForDay(punches: AejPunch[], slots: ScheduledSlot[]): number {
  const entries = punches
    .filter((punch) => punch.kind === "E")
    .sort((left, right) => left.minutes - right.minutes || left.sequence - right.sequence);

  if (entries.length === 0 || slots.length === 0) {
    return 0;
  }

  const used = new Set<number>();
  let total = 0;

  for (const slot of slots) {
    const index = pickEntryIndex(entries, used, slot);

    if (index < 0) {
      continue;
    }

    used.add(index);
    total += minutesLate(entries[index].minutes, slot.minutes);
  }

  return total;
}

function evaluateDay(
  punches: AejPunch[],
  slots: ScheduledSlot[],
  isDayOff: boolean,
  isFuture: boolean
): Omit<EvaluatedDay, "eventDate"> {
  const hasManualAdjustment = punches.some((punch) => punch.source === "I");

  if (isDayOff) {
    return {
      latenessMinutes: 0,
      isAbsence: false,
      isDayOff: true,
      isFuture: false,
      hasManualAdjustment,
      notes: timesheetDayNotes({
        isAbsence: false,
        isDayOff: true,
        latenessMinutes: 0,
        hasManualAdjustment,
        hasPunchesOnDayOff: punches.length > 0,
      }),
    };
  }

  if (isFuture) {
    return {
      latenessMinutes: 0,
      isAbsence: false,
      isDayOff: false,
      isFuture: true,
      hasManualAdjustment,
      notes: timesheetDayNotes({
        isAbsence: false,
        latenessMinutes: 0,
        hasManualAdjustment,
        isFuture: true,
      }),
    };
  }

  if (punches.length === 0) {
    return {
      latenessMinutes: 0,
      isAbsence: true,
      isDayOff: false,
      isFuture: false,
      hasManualAdjustment,
      notes: timesheetDayNotes({
        isAbsence: true,
        latenessMinutes: 0,
        hasManualAdjustment,
        justificationStatus: DEFAULT_JUSTIFICATION_STATUS,
      }),
    };
  }

  const entries = punches.filter((punch) => punch.kind === "E");

  if (entries.length === 0) {
    return {
      latenessMinutes: 0,
      isAbsence: true,
      isDayOff: false,
      isFuture: false,
      hasManualAdjustment,
      notes: timesheetDayNotes({
        isAbsence: true,
        latenessMinutes: 0,
        hasManualAdjustment,
        justificationStatus: DEFAULT_JUSTIFICATION_STATUS,
      }),
    };
  }

  const latenessMinutes = latenessForDay(punches, slots);
  const result = {
    latenessMinutes,
    isAbsence: false,
    isDayOff: false,
    isFuture: false,
    hasManualAdjustment,
  };

  return {
    ...result,
    notes: timesheetDayNotes({
      ...result,
      justificationStatus: DEFAULT_JUSTIFICATION_STATUS,
    }),
  };
}

function fileScheduleForPunches(
  punches: AejPunch[],
  schedules: Map<string, AejContractSchedule>
): AejContractSchedule | null {
  for (const punch of punches) {
    const matched = schedules.get(punch.scheduleCode);

    if (matched) {
      return matched;
    }
  }

  if (schedules.size === 1) {
    return schedules.values().next().value ?? null;
  }

  return null;
}

export type EvaluationSchedule = BonusScheduleInput &
  DaysOffSchedule & {
    entry1: string;
    entry2: string | null;
  };

export function evaluateEmployeeTimesheet(
  dates: string[],
  punches: AejPunch[],
  schedule: EvaluationSchedule,
  fileSchedules: Map<string, AejContractSchedule> = new Map(),
  today: string = todayIsoDate(),
  justifications: Map<string, JustificationStatus> = new Map()
): EvaluatedTimesheet {
  const punchesByDate = new Map<string, AejPunch[]>();
  const slots = scheduledSlots(schedule, fileScheduleForPunches(punches, fileSchedules));

  for (const punch of punches) {
    const current = punchesByDate.get(punch.date) ?? [];
    current.push(punch);
    punchesByDate.set(punch.date, current);
  }

  const days = dates.map((eventDate) => {
    const dayPunches = punchesByDate.get(eventDate) ?? [];
    const evaluated = evaluateDay(
      dayPunches,
      slots,
      isScheduledDayOff(eventDate, schedule),
      eventDate > today
    );
    const justificationStatus =
      justifications.get(eventDate) ?? DEFAULT_JUSTIFICATION_STATUS;

    return {
      eventDate,
      ...evaluated,
      notes: timesheetDayNotes({
        isAbsence: evaluated.isAbsence,
        isDayOff: evaluated.isDayOff,
        latenessMinutes: evaluated.latenessMinutes,
        hasManualAdjustment: evaluated.hasManualAdjustment,
        hasPunchesOnDayOff: evaluated.isDayOff && dayPunches.length > 0,
        justificationStatus,
        isFuture: evaluated.isFuture,
      }),
    };
  });

  const totalAbsences = days.filter((day) => day.isAbsence).length;
  const totalLatenessMinutes = days.reduce(
    (total, day) => total + day.latenessMinutes,
    0
  );
  const manualAdjustmentsCount = days.filter(
    (day) => day.hasManualAdjustment && !day.isDayOff && !day.isFuture
  ).length;

  return {
    days,
    totalAbsences,
    totalLatenessMinutes,
    manualAdjustmentsCount,
    earnedAmount: calculateScheduleBonus(
      schedule,
      days.map((day) => ({
        eventDate: day.eventDate,
        isDayOff: day.isDayOff,
        isAbsence: day.isAbsence,
        latenessMinutes: day.latenessMinutes,
        justificationStatus:
          justifications.get(day.eventDate) ?? DEFAULT_JUSTIFICATION_STATUS,
      })),
      today
    ),
  };
}
