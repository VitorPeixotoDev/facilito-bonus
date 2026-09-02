const SELECTION_STORAGE_KEY = "facilito-admin-colaboradores-selected";
const EMPTY_SELECTION: string[] = [];

let snapshot = EMPTY_SELECTION;
let serialized = "";
const listeners = new Set<() => void>();

function parseSelection(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return EMPTY_SELECTION;
    }

    const ids = parsed.filter((id): id is string => typeof id === "string");
    return ids.length === 0 ? EMPTY_SELECTION : ids;
  } catch {
    return EMPTY_SELECTION;
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeCollaboratorSelection(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCollaboratorSelection(): string[] {
  try {
    const raw = sessionStorage.getItem(SELECTION_STORAGE_KEY) ?? "";

    if (raw === serialized) {
      return snapshot;
    }

    serialized = raw;
    snapshot = parseSelection(raw);
    return snapshot;
  } catch {
    return EMPTY_SELECTION;
  }
}

export function getServerCollaboratorSelection(): string[] {
  return EMPTY_SELECTION;
}

export function writeCollaboratorSelection(ids: string[]) {
  const next = [...new Set(ids)];
  const raw = JSON.stringify(next);
  serialized = raw;
  snapshot = next.length === 0 ? EMPTY_SELECTION : next;

  try {
    sessionStorage.setItem(SELECTION_STORAGE_KEY, raw);
  } catch {
    // Private mode or quota errors should not block the UI selection.
  }

  emit();
}
