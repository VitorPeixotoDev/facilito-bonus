import { onlyDigits } from "@/lib/onboarding/documents";

export type ParsedCollaborator = {
  cpf: string;
  name: string;
};

export function decodeAejText(bytes: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("latin1").decode(bytes);
  }
  return utf8;
}

export function parseAejCollaborators(text: string): ParsedCollaborator[] {
  const seen = new Set<string>();
  const collaborators: ParsedCollaborator[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const parts = line.split("|");
    if (parts[0] !== "03") {
      continue;
    }

    const cpf = onlyDigits(parts[2] ?? "");
    const name = (parts[3] ?? "").replace(/\s+/g, " ").trim();

    if (!/^\d{11}$/.test(cpf) || name.length === 0 || seen.has(cpf)) {
      continue;
    }

    seen.add(cpf);
    collaborators.push({
      cpf,
      name: name.slice(0, 120),
    });
  }

  return collaborators;
}
