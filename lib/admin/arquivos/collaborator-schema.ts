import { z } from "zod";
import { parseSavedSuggestion } from "@/lib/admin/saved-suggestions";
import {
  isValidCpf,
  isValidPersonName,
  onlyDigits,
} from "@/lib/onboarding/documents";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createCollaboratorSchema = z.object({
  name: z
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
  jobTitle: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value === "" || parseSavedSuggestion(value) !== null,
      "Informe um cargo com 2 a 80 caracteres."
    )
    .transform((value) => (value === "" ? null : value)),
  workScheduleId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || UUID_PATTERN.test(value),
      "Selecione uma regra de jornada válida."
    )
    .transform((value) => (value === "" ? null : value)),
});

export type CreateCollaboratorInput = z.input<typeof createCollaboratorSchema>;
export type CreateCollaboratorValues = z.output<typeof createCollaboratorSchema>;
export type CreateCollaboratorField = keyof CreateCollaboratorInput;
export type CreateCollaboratorFieldErrors = Partial<
  Record<CreateCollaboratorField, string>
>;

export type CreateCollaboratorState = {
  ok: boolean;
  message: string | null;
  fieldErrors: CreateCollaboratorFieldErrors;
  createdAt: number | null;
};

export const CREATE_COLLABORATOR_INITIAL_STATE: CreateCollaboratorState = {
  ok: false,
  message: null,
  fieldErrors: {},
  createdAt: null,
};

export const DEFAULT_CREATE_COLLABORATOR_VALUES: CreateCollaboratorInput = {
  name: "",
  cpf: "",
  jobTitle: "",
  workScheduleId: "",
};

const CREATE_COLLABORATOR_FIELDS = [
  "name",
  "cpf",
  "jobTitle",
  "workScheduleId",
] as const satisfies readonly CreateCollaboratorField[];

export function createCollaboratorFieldErrorsFromZod(
  error: z.ZodError
): CreateCollaboratorFieldErrors {
  const fieldErrors: CreateCollaboratorFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      typeof field === "string" &&
      CREATE_COLLABORATOR_FIELDS.includes(field as CreateCollaboratorField) &&
      !fieldErrors[field as CreateCollaboratorField]
    ) {
      fieldErrors[field as CreateCollaboratorField] = issue.message;
    }
  }

  return fieldErrors;
}

export function parseCreateCollaboratorForm(formData: FormData) {
  return createCollaboratorSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    workScheduleId: String(formData.get("workScheduleId") ?? ""),
  });
}

export function validateCreateCollaboratorField(
  field: CreateCollaboratorField,
  value: string
): string | undefined {
  const result = createCollaboratorSchema.shape[field].safeParse(value);

  if (result.success) {
    return undefined;
  }

  return result.error.issues[0]?.message;
}
