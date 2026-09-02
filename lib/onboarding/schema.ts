import { z } from "zod";
import {
  isValidCnpj,
  isValidCompanyName,
  isValidCpf,
  isValidPersonName,
  normalizeCnpj,
  onlyDigits,
} from "@/lib/onboarding/documents";

export const companyOnboardingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Informe o nome completo.")
    .refine(isValidPersonName, "Informe nome e sobrenome, apenas letras."),
  cpf: z
    .string()
    .trim()
    .min(1, "Informe o CPF.")
    .refine(isValidCpf, "Informe um CPF válido.")
    .transform(onlyDigits),
  companyName: z
    .string()
    .trim()
    .min(1, "Informe o nome da empresa.")
    .refine(isValidCompanyName, "Informe um nome de empresa válido."),
  cnpj: z
    .string()
    .trim()
    .min(1, "Informe o CNPJ.")
    .refine(isValidCnpj, "Informe um CNPJ válido.")
    .transform(normalizeCnpj),
});

export type CompanyOnboardingInput = z.input<typeof companyOnboardingSchema>;
export type CompanyOnboardingValues = z.output<typeof companyOnboardingSchema>;
export type CompanyOnboardingField = keyof CompanyOnboardingInput;
export type CompanyOnboardingFieldErrors = Partial<
  Record<CompanyOnboardingField, string>
>;

export type CompanyOnboardingState = {
  message: string | null;
  fieldErrors: CompanyOnboardingFieldErrors;
};

export const COMPANY_ONBOARDING_INITIAL_STATE: CompanyOnboardingState = {
  message: null,
  fieldErrors: {},
};

export function fieldErrorsFromZod(
  error: z.ZodError
): CompanyOnboardingFieldErrors {
  const fieldErrors: CompanyOnboardingFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      (field === "fullName" ||
        field === "cpf" ||
        field === "companyName" ||
        field === "cnpj") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

export function parseCompanyOnboardingForm(formData: FormData) {
  return companyOnboardingSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
  });
}

export function validateOnboardingField(
  field: CompanyOnboardingField,
  value: string
): string | undefined {
  const result = companyOnboardingSchema.shape[field].safeParse(value);

  if (result.success) {
    return undefined;
  }

  return result.error.issues[0]?.message;
}
