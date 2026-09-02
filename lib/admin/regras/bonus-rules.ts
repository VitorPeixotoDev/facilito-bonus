export const BONUS_RULE_METRICS = [
  { value: "absences", label: "Faltas" },
  { value: "lateness_minutes", label: "Minutos de atraso" },
  { value: "manual_adjustments", label: "Ajustes manuais" },
] as const;

export const BONUS_RULE_OPERATORS = [
  { value: "<=", label: "no máximo" },
  { value: "<", label: "menor que" },
  { value: "==", label: "igual a" },
  { value: ">=", label: "no mínimo" },
  { value: ">", label: "maior que" },
  { value: "!=", label: "diferente de" },
] as const;

export type BonusRuleMetric = (typeof BONUS_RULE_METRICS)[number]["value"];
export type BonusRuleOperator = (typeof BONUS_RULE_OPERATORS)[number]["value"];

export type WorkScheduleBonusRule = {
  id: string;
  metric: BonusRuleMetric;
  operator: BonusRuleOperator;
  targetValue: number;
  rewardAmount: number;
  sortOrder: number;
};

export type WorkScheduleBonusRuleInput = {
  metrica: BonusRuleMetric;
  operador: BonusRuleOperator;
  valorAlvo: string;
  valorRecompensa: string;
};

const DEFAULT_BY_METRIC: Record<
  BonusRuleMetric,
  Pick<WorkScheduleBonusRuleInput, "operador" | "valorAlvo" | "valorRecompensa">
> = {
  absences: {
    operador: "<=",
    valorAlvo: "0",
    valorRecompensa: "100,00",
  },
  lateness_minutes: {
    operador: "<=",
    valorAlvo: "15",
    valorRecompensa: "80,00",
  },
  manual_adjustments: {
    operador: "==",
    valorAlvo: "0",
    valorRecompensa: "50,00",
  },
};

export const BONUS_RULE_METRIC_VALUES = BONUS_RULE_METRICS.map(
  (metric) => metric.value
) as [BonusRuleMetric, ...BonusRuleMetric[]];

export const BONUS_RULE_OPERATOR_VALUES = BONUS_RULE_OPERATORS.map(
  (operator) => operator.value
) as [BonusRuleOperator, ...BonusRuleOperator[]];

export function defaultBonusRule(
  metric: BonusRuleMetric
): WorkScheduleBonusRuleInput {
  return {
    metrica: metric,
    ...DEFAULT_BY_METRIC[metric],
  };
}

export function nextUnusedBonusMetric(
  used: readonly BonusRuleMetric[]
): BonusRuleMetric | null {
  return BONUS_RULE_METRIC_VALUES.find((metric) => !used.includes(metric)) ?? null;
}

export function operatorLabel(operator: string): string {
  return (
    BONUS_RULE_OPERATORS.find((entry) => entry.value === operator)?.label ??
    operator
  );
}

export function titleForBonusRule(rule: {
  metric: string;
  operator: string;
  targetValue: number;
}): string {
  switch (rule.metric) {
    case "absences":
      return rule.targetValue === 0 &&
        (rule.operator === "<=" || rule.operator === "==")
        ? "Assiduidade Perfeita (Zero Faltas)"
        : `Faltas ${operatorLabel(rule.operator)} ${rule.targetValue}`;
    case "lateness_minutes":
      return `Tolerância de Atrasos (${operatorLabel(rule.operator)} ${rule.targetValue} min no mês)`;
    case "manual_adjustments":
      return rule.targetValue === 0 &&
        (rule.operator === "<=" || rule.operator === "==")
        ? "Sem ajustes manuais"
        : `Ajustes manuais ${operatorLabel(rule.operator)} ${rule.targetValue}`;
    default:
      return rule.metric;
  }
}
