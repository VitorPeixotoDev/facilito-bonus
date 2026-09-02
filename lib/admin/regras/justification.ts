export const JUSTIFICATION_STATUSES = [
  "unjustified",
  "pending",
  "justified",
  "rejected",
] as const;

export type JustificationStatus = (typeof JUSTIFICATION_STATUSES)[number];

export const JUSTIFICATION_KINDS = ["absence", "lateness"] as const;

export type JustificationKind = (typeof JUSTIFICATION_KINDS)[number];

export const DEFAULT_JUSTIFICATION_STATUS: JustificationStatus = "unjustified";

export function isJustificationStatus(
  value: string | null | undefined
): value is JustificationStatus {
  return (
    typeof value === "string" &&
    (JUSTIFICATION_STATUSES as readonly string[]).includes(value)
  );
}

export function asJustificationStatus(
  value: string | null | undefined
): JustificationStatus {
  return isJustificationStatus(value) ? value : DEFAULT_JUSTIFICATION_STATUS;
}

export function isJustified(status: JustificationStatus): boolean {
  return status === "justified";
}

export function canCollaboratorClaim(status: JustificationStatus): boolean {
  return status === "unjustified" || status === "rejected";
}

export function isJustificationKind(
  value: string | null | undefined
): value is JustificationKind {
  return (
    typeof value === "string" &&
    (JUSTIFICATION_KINDS as readonly string[]).includes(value)
  );
}

export function asJustificationKind(
  value: string | null | undefined
): JustificationKind | null {
  return isJustificationKind(value) ? value : null;
}

export function inferJustificationKind(input: {
  kind?: string | null;
  isAbsence: boolean;
  latenessMinutes: number;
}): JustificationKind | null {
  const explicit = asJustificationKind(input.kind);

  if (explicit) {
    return explicit;
  }

  if (input.isAbsence) {
    return "absence";
  }

  if (input.latenessMinutes > 0) {
    return "lateness";
  }

  return null;
}

export function justificationKindLabel(kind: JustificationKind | null): string {
  if (kind === "absence") {
    return "Falta";
  }

  if (kind === "lateness") {
    return "Atraso";
  }

  return "Justificativa";
}

export function justificationStatusLabel(status: string): string {
  if (!isJustificationStatus(status)) {
    return "Injustificado";
  }

  switch (status) {
    case "pending":
      return "Aguardando análise";
    case "justified":
      return "Justificado";
    case "rejected":
      return "Recusado";
    default:
      return "Injustificado";
  }
}
