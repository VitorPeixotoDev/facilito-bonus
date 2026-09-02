const SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

function parseUtcDate(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function bonusProgressPercent(
  earnedAmount: number,
  bonusCeiling: number
): number {
  if (bonusCeiling <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (earnedAmount / bonusCeiling) * 100));
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

export function formatStatementDate(isoDate: string): string {
  const date = parseUtcDate(isoDate);
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatMonthName(isoDate: string): string {
  const date = parseUtcDate(isoDate);
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(date);

  return month.charAt(0).toUpperCase() + month.slice(1);
}

export function formatMonthYear(isoDate: string): string {
  const date = parseUtcDate(isoDate);
  const value = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatSignedCurrencyBRL(value: number): string {
  const formatted = formatCurrencyBRL(Math.abs(value));

  if (value > 0) {
    return `+ ${formatted}`;
  }

  if (value < 0) {
    return `− ${formatted}`;
  }

  return formatted;
}

export function formatDayHeading(isoDate: string): string {
  const date = parseUtcDate(isoDate);
  const value = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);

  return value.charAt(0).toUpperCase() + value.slice(1);
}
