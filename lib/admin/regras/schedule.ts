const MINUTES_IN_DAY = 1440;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function padClock(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function isTimeValue(value: string): boolean {
  return TIME_PATTERN.test(formatTimeValue(value));
}

export function parseClockMinutes(
  value: string | Date | null | undefined
): number | null {
  const formatted = formatTimeValue(value);

  if (!TIME_PATTERN.test(formatted)) {
    return null;
  }

  const [hours, minutes] = formatted.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeToMinutes(timeStr: string): number {
  return parseClockMinutes(timeStr) ?? 0;
}

export function shiftDurationMinutes(entrada: string, saida: string): number {
  if (!entrada || !saida) {
    return 0;
  }

  const minEntrada = timeToMinutes(entrada);
  let minSaida = timeToMinutes(saida);

  if (minSaida < minEntrada) {
    minSaida += MINUTES_IN_DAY;
  }

  return minSaida - minEntrada;
}

export function isNightShift(entrada: string, saida: string): boolean {
  if (!entrada || !saida) {
    return false;
  }

  return timeToMinutes(saida) < timeToMinutes(entrada);
}

export function computeScheduleTotals(input: {
  ent1: string;
  sai1: string;
  ent2: string;
  sai2: string;
}) {
  const firstShift = shiftDurationMinutes(input.ent1, input.sai1);
  const secondShift = shiftDurationMinutes(input.ent2, input.sai2);

  return {
    totalMinutes: firstShift + secondShift,
    isNight:
      isNightShift(input.ent1, input.sai1) ||
      isNightShift(input.ent2, input.sai2),
  };
}

export function formatMinutesAsHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

export function formatTimeValue(value: string | Date | null | undefined): string {
  if (value == null || value === "") {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return padClock(value.getUTCHours(), value.getUTCMinutes());
  }

  const raw = String(value).trim();
  const timestamp = raw.match(
    /(?:^|T|\s)(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/i
  );

  if (timestamp && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return `${timestamp[1]}:${timestamp[2]}`;
  }

  const clock = raw.match(
    /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/i
  );

  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);

    if (hours <= 23 && minutes <= 59) {
      return padClock(hours, minutes);
    }
  }

  const compact = raw.match(/^(\d{2})(\d{2})(?:\d{2})?$/);

  if (compact) {
    const hours = Number(compact[1]);
    const minutes = Number(compact[2]);

    if (hours <= 23 && minutes <= 59) {
      return `${compact[1]}:${compact[2]}`;
    }
  }

  return TIME_PATTERN.test(raw.slice(0, 5)) ? raw.slice(0, 5) : "";
}

export function formatScheduleShifts(input: {
  entry1: string;
  exit1: string;
  entry2: string | null;
  exit2: string | null;
}): string {
  const first = `${formatTimeValue(input.entry1)}–${formatTimeValue(input.exit1)}`;

  if (!input.entry2 || !input.exit2) {
    return first;
  }

  return `${first} · ${formatTimeValue(input.entry2)}–${formatTimeValue(input.exit2)}`;
}
