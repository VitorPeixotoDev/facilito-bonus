export const COMPANY_FILES_BUCKET = "company-files";
export const COMPANY_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const COMPANY_FILE_MAX_LABEL = "10 MB";
export const COMPANY_FILE_FIELD = "arquivo";

export const COMPANY_FILE_PURPOSES = {
  colaboradores: "colaboradores",
  ponto: "ponto",
} as const;

export type CompanyFilePurpose =
  (typeof COMPANY_FILE_PURPOSES)[keyof typeof COMPANY_FILE_PURPOSES];

export const COMPANY_FILE_PURPOSE_OPTIONS: {
  value: CompanyFilePurpose;
  label: string;
  description: string;
}[] = [
  {
    value: COMPANY_FILE_PURPOSES.ponto,
    label: "Folha de ponto",
    description:
      "Envia o TXT da folha: aceita o mês inteiro, uma semana ou um dia. Os envios se acumulam no mês e o bônus é recalculado.",
  },
  {
    value: COMPANY_FILE_PURPOSES.colaboradores,
    label: "Cadastramento de colaboradores",
    description:
      "Cadastra novos colaboradores diretamente pela folha de ponto, lendo CPF e nome no AEJ.",
  },
];

export function isCompanyFilePurpose(value: string): value is CompanyFilePurpose {
  return (
    value === COMPANY_FILE_PURPOSES.colaboradores ||
    value === COMPANY_FILE_PURPOSES.ponto
  );
}

export function purposeLabel(purpose: CompanyFilePurpose): string {
  return (
    COMPANY_FILE_PURPOSE_OPTIONS.find((option) => option.value === purpose)
      ?.label ?? purpose
  );
}

export function isTxtFileName(name: string): boolean {
  return name.toLowerCase().endsWith(".txt");
}

export function originalFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop()?.trim() || "arquivo.txt";
  return base.slice(0, 255);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadedAt(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDate));
}
