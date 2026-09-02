import { z } from "zod";
import {
  DEFAULT_FIXED_DAYS_OFF,
  NTH_SUNDAY_VALUES,
  SUNDAY_RULE_TYPE_VALUES,
  WEEKDAY_VALUES,
  isIsoDate,
  isSundayIsoDate,
  uniqueSortedDates,
  uniqueSortedNumbers,
  type SundayRuleType,
} from "@/lib/admin/regras/days-off";
import {
  formatMoneyInput,
  formatRateAsPercentInput,
  parsePtDecimal,
  parsePtInteger,
} from "@/lib/admin/regras/numbers";
import {
  computeScheduleTotals,
  formatTimeValue,
  isTimeValue,
} from "@/lib/admin/regras/schedule";
import type { WorkSchedule } from "@/lib/admin/regras/types";

const requiredTime = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine(isTimeValue, "Informe um horário válido.");

const optionalTime = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || isTimeValue(value),
    "Informe um horário válido."
  );

const percentRate = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .transform((value, ctx) => {
      const parsed = parsePtDecimal(value);

      if (parsed === null) {
        ctx.addIssue({ code: "custom", message: "Informe um percentual válido." });
        return z.NEVER;
      }

      if (parsed < 0 || parsed > 100) {
        ctx.addIssue({
          code: "custom",
          message: "Use um percentual entre 0 e 100.",
        });
        return z.NEVER;
      }

      return Number((parsed / 100).toFixed(4));
    });

const minutesField = z
  .string()
  .trim()
  .min(1, "Informe a tolerância diária de atraso.")
  .transform((value, ctx) => {
    const parsed = parsePtInteger(value);

    if (parsed === null) {
      ctx.addIssue({
        code: "custom",
        message: "Informe a tolerância em minutos inteiros.",
      });
      return z.NEVER;
    }

    if (parsed < 0 || parsed > 43200) {
      ctx.addIssue({
        code: "custom",
        message: "Use uma tolerância entre 0 e 43.200 minutos.",
      });
      return z.NEVER;
    }

    return parsed;
  });

const moneyField = (emptyMessage: string, rangeMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .transform((value, ctx) => {
      const parsed = parsePtDecimal(value);

      if (parsed === null) {
        ctx.addIssue({
          code: "custom",
          message: "Informe um valor em reais válido.",
        });
        return z.NEVER;
      }

      if (parsed < 0 || parsed > 99_999_999.99) {
        ctx.addIssue({
          code: "custom",
          message: rangeMessage,
        });
        return z.NEVER;
      }

      return Number(parsed.toFixed(2));
    });

export const workScheduleSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, "Informe o nome do padrão.")
      .max(120, "Use no máximo 120 caracteres."),
    ent1: requiredTime("Informe a entrada 1."),
    sai1: requiredTime("Informe a saída 1."),
    ent2: optionalTime,
    sai2: optionalTime,
    percentualPenalizacaoFalta: percentRate(
      "Informe o percentual de penalização por falta."
    ),
    percentualPenalizacaoAtraso: percentRate(
      "Informe o percentual de penalização por atraso."
    ),
    toleranciaMinutosAcumulados: minutesField,
    valorBaseBonificacao: moneyField(
      "Informe o valor base da bonificação.",
      "Informe um valor base maior ou igual a zero."
    ),
    diasFolga: z
      .array(z.number().int())
      .transform((values, ctx) => {
        const days = uniqueSortedNumbers(values);

        if (days.some((day) => !WEEKDAY_VALUES.includes(day as (typeof WEEKDAY_VALUES)[number]))) {
          ctx.addIssue({
            code: "custom",
            message: "Selecione dias da semana válidos.",
          });
          return z.NEVER;
        }

        return days;
      }),
    regraDomingo: z.enum(SUNDAY_RULE_TYPE_VALUES, {
      error: "Selecione a regra de domingos.",
    }),
    domingosFixos: z
      .array(z.number().int())
      .transform((values, ctx) => {
        const sundays = uniqueSortedNumbers(values);

        if (
          sundays.some(
            (value) =>
              !NTH_SUNDAY_VALUES.includes(value as (typeof NTH_SUNDAY_VALUES)[number])
          )
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Selecione ocorrências válidas de domingo no mês.",
          });
          return z.NEVER;
        }

        return sundays;
      }),
    domingosAvulsos: z
      .array(z.string())
      .transform((values, ctx) => {
        const dates = uniqueSortedDates(values);

        if (values.some((value) => value.trim() !== "" && !isIsoDate(value))) {
          ctx.addIssue({
            code: "custom",
            message: "Informe datas de domingo no formato AAAA-MM-DD.",
          });
          return z.NEVER;
        }

        return dates;
      }),
  })
  .superRefine((data, ctx) => {
    const hasEntry2 = data.ent2.length > 0;
    const hasExit2 = data.sai2.length > 0;

    if (hasEntry2 !== hasExit2) {
      ctx.addIssue({
        code: "custom",
        path: hasEntry2 ? ["sai2"] : ["ent2"],
        message: "Preencha entrada e saída do 2º turno, ou deixe os dois vazios.",
      });
    }

    const { totalMinutes } = computeScheduleTotals(data);

    if (totalMinutes <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["sai1"],
        message: "A carga horária precisa ser maior que zero.",
      });
    }

    const sundayIsFixedOff = data.diasFolga.includes(0);

    if (sundayIsFixedOff) {
      return;
    }

    if (data.regraDomingo === "fixed_nth" && data.domingosFixos.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["domingosFixos"],
        message: "Selecione ao menos um domingo do mês.",
      });
    }

    if (data.regraDomingo === "floating") {
      for (const [index, date] of data.domingosAvulsos.entries()) {
        if (!isSundayIsoDate(date)) {
          ctx.addIssue({
            code: "custom",
            path: ["domingosAvulsos", index],
            message: "Use apenas datas que caiam em domingo.",
          });
        }
      }
    }
  });

export type WorkScheduleInput = z.input<typeof workScheduleSchema>;
export type WorkScheduleValues = z.output<typeof workScheduleSchema>;
export type WorkScheduleField = keyof WorkScheduleInput;
export type WorkScheduleBonusRuleField =
  | "metrica"
  | "operador"
  | "valorAlvo"
  | "valorRecompensa";
export type WorkScheduleFieldErrors = Partial<Record<string, string>>;

export type WorkScheduleState = {
  ok: boolean;
  message: string | null;
  fieldErrors: WorkScheduleFieldErrors;
  code: number | null;
};

export const WORK_SCHEDULE_INITIAL_STATE: WorkScheduleState = {
  ok: false,
  message: null,
  fieldErrors: {},
  code: null,
};

export const DEFAULT_WORK_SCHEDULE_VALUES: WorkScheduleInput = {
  nome: "",
  ent1: "08:00",
  sai1: "12:00",
  ent2: "13:00",
  sai2: "17:00",
  percentualPenalizacaoFalta: "50",
  percentualPenalizacaoAtraso: "10",
  toleranciaMinutosAcumulados: "15",
  valorBaseBonificacao: "500,00",
  diasFolga: [...DEFAULT_FIXED_DAYS_OFF],
  regraDomingo: "none",
  domingosFixos: [],
  domingosAvulsos: [],
};

const WORK_SCHEDULE_FIELDS = [
  "nome",
  "ent1",
  "sai1",
  "ent2",
  "sai2",
  "percentualPenalizacaoFalta",
  "percentualPenalizacaoAtraso",
  "toleranciaMinutosAcumulados",
  "valorBaseBonificacao",
  "diasFolga",
  "regraDomingo",
  "domingosFixos",
  "domingosAvulsos",
] as const satisfies readonly WorkScheduleField[];

function errorKeyFromPath(path: PropertyKey[]): string | null {
  if (path.length === 0 || typeof path[0] !== "string") {
    return null;
  }

  if (!WORK_SCHEDULE_FIELDS.includes(path[0] as WorkScheduleField)) {
    return null;
  }

  return path.map((segment) => String(segment)).join(".");
}

export function fieldErrorsFromZod(
  error: z.ZodError
): WorkScheduleFieldErrors {
  const fieldErrors: WorkScheduleFieldErrors = {};

  for (const issue of error.issues) {
    const key = errorKeyFromPath(issue.path);

    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}

export function bonusRuleFieldError(
  errors: WorkScheduleFieldErrors,
  index: number,
  field: WorkScheduleBonusRuleField
): string | undefined {
  return errors[`regrasCustomizadas.${index}.${field}`];
}

function readJsonArray(formData: FormData, field: string): unknown {
  const raw = String(formData.get(field) ?? "").trim();

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readSundayRuleType(formData: FormData): SundayRuleType {
  const value = String(formData.get("regraDomingo") ?? "none");
  return value === "fixed_nth" || value === "floating" ? value : "none";
}

export function parseWorkScheduleForm(formData: FormData) {
  return workScheduleSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    ent1: formatTimeValue(String(formData.get("ent1") ?? "")),
    sai1: formatTimeValue(String(formData.get("sai1") ?? "")),
    ent2: formatTimeValue(String(formData.get("ent2") ?? "")),
    sai2: formatTimeValue(String(formData.get("sai2") ?? "")),
    percentualPenalizacaoFalta: String(
      formData.get("percentualPenalizacaoFalta") ?? ""
    ),
    percentualPenalizacaoAtraso: String(
      formData.get("percentualPenalizacaoAtraso") ?? ""
    ),
    toleranciaMinutosAcumulados: String(
      formData.get("toleranciaMinutosAcumulados") ?? ""
    ),
    valorBaseBonificacao: String(formData.get("valorBaseBonificacao") ?? ""),
    diasFolga: readJsonArray(formData, "diasFolga"),
    regraDomingo: readSundayRuleType(formData),
    domingosFixos: readJsonArray(formData, "domingosFixos"),
    domingosAvulsos: readJsonArray(formData, "domingosAvulsos"),
  });
}

export function workScheduleToInput(schedule: WorkSchedule): WorkScheduleInput {
  return {
    nome: schedule.name,
    ent1: schedule.entry1,
    sai1: schedule.exit1,
    ent2: schedule.entry2 ?? "",
    sai2: schedule.exit2 ?? "",
    percentualPenalizacaoFalta: formatRateAsPercentInput(
      schedule.absencePenaltyPercent
    ),
    percentualPenalizacaoAtraso: formatRateAsPercentInput(
      schedule.latenessPenaltyPercent
    ),
    toleranciaMinutosAcumulados: String(
      schedule.accumulatedLatenessToleranceMinutes
    ),
    valorBaseBonificacao: formatMoneyInput(schedule.bonusBaseAmount),
    diasFolga: uniqueSortedNumbers(schedule.fixedDaysOff),
    regraDomingo: schedule.sundayRuleType,
    domingosFixos: uniqueSortedNumbers(schedule.fixedSundays),
    domingosAvulsos: uniqueSortedDates(schedule.floatingSundays),
  };
}
