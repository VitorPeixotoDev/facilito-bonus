const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function parsePtDecimal(value: string): number | null {
  const trimmed = value
    .trim()
    .replace(/\s/g, "")
    .replace(/^[rR]\$ ?/, "");

  if (!trimmed) {
    return null;
  }

  const normalized =
    trimmed.includes(",") && trimmed.includes(".")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed.includes(",")
        ? trimmed.replace(",", ".")
        : trimmed;

  if (!DECIMAL_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePtInteger(value: string): number | null {
  const parsed = parsePtDecimal(value);

  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

export function formatPercentFromRate(rate: number): string {
  const value = rate * 100;
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

export function formatSignedPercentFromRate(rate: number, sign: "+" | "-"): string {
  return `${sign}${formatPercentFromRate(rate)}`;
}

export function formatRateAsPercentInput(rate: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(rate * 100);
}

export function formatMoneyInput(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
