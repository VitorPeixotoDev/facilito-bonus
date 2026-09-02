export const SAVED_SUGGESTION_MIN_LENGTH = 2;
export const SAVED_SUGGESTION_MAX_LENGTH = 80;

export function normalizeSuggestionSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeSavedSuggestions(current: string[], incoming: string[]) {
  const merged = new Map<string, string>();

  for (const value of [...current, ...incoming]) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizeSuggestionSearch(trimmed);
    if (!merged.has(key)) {
      merged.set(key, trimmed);
    }
  }

  return [...merged.values()].sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

export function parseSavedSuggestion(value: string) {
  const trimmed = value.trim();

  if (
    trimmed.length < SAVED_SUGGESTION_MIN_LENGTH ||
    trimmed.length > SAVED_SUGGESTION_MAX_LENGTH
  ) {
    return null;
  }

  return trimmed;
}
