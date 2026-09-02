"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  BONUS_RULE_METRICS,
  BONUS_RULE_OPERATORS,
  defaultBonusRule,
  nextUnusedBonusMetric,
  type BonusRuleMetric,
  type BonusRuleOperator,
  type WorkScheduleBonusRuleInput,
} from "@/lib/admin/regras/bonus-rules";
import {
  bonusRuleFieldError,
  type WorkScheduleBonusRuleField,
  type WorkScheduleFieldErrors,
} from "@/lib/admin/regras/schema";

const selectClassName =
  "w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition";

function fieldClassName(hasError: boolean) {
  return [
    selectClassName,
    hasError
      ? "border-rose-400 focus:border-rose-400"
      : "border-slate-700 focus:border-cyan-400",
  ].join(" ");
}

type WorkScheduleBonusRulesFieldsProps = {
  rules: WorkScheduleBonusRuleInput[];
  errors: WorkScheduleFieldErrors;
  onChange: (rules: WorkScheduleBonusRuleInput[]) => void;
};

export function WorkScheduleBonusRulesFields({
  rules,
  errors,
  onChange,
}: WorkScheduleBonusRulesFieldsProps) {
  const unusedMetric = nextUnusedBonusMetric(rules.map((rule) => rule.metrica));

  function updateRule(
    index: number,
    field: WorkScheduleBonusRuleField,
    value: string
  ) {
    onChange(
      rules.map((rule, ruleIndex) => {
        if (ruleIndex !== index) {
          return rule;
        }

        if (field === "metrica") {
          return defaultBonusRule(value as BonusRuleMetric);
        }

        return { ...rule, [field]: value };
      })
    );
  }

  return (
    <fieldset className="space-y-4 rounded-2xl border border-slate-700/30 bg-slate-800/50 p-6">
      <legend className="px-1 text-sm font-semibold text-cyan-400">
        Regras customizadas
      </legend>
      <p className="text-sm text-slate-400">
        Metas extras desta escala: escolha a métrica, a condição e o valor da
        recompensa. Uma regra por métrica.
      </p>

      {errors.regrasCustomizadas ? (
        <p className="text-sm text-rose-400" role="alert">
          {errors.regrasCustomizadas}
        </p>
      ) : null}

      {rules.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700/70 bg-slate-900/40 px-4 py-3 text-sm text-slate-500">
          Nenhuma regra customizada. O plano continua valendo só com as
          variáveis de pontualidade e atraso.
        </p>
      ) : (
        <ul className="space-y-4">
          {rules.map((rule, index) => {
            const usedByOthers = rules
              .filter((_, ruleIndex) => ruleIndex !== index)
              .map((entry) => entry.metrica);
            const metricError = bonusRuleFieldError(errors, index, "metrica");
            const operatorError = bonusRuleFieldError(errors, index, "operador");
            const targetError = bonusRuleFieldError(errors, index, "valorAlvo");
            const rewardError = bonusRuleFieldError(
              errors,
              index,
              "valorRecompensa"
            );

            return (
              <li
                key={`${rule.metrica}-${index}`}
                className="space-y-4 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">
                    Regra {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(rules.filter((_, ruleIndex) => ruleIndex !== index))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">
                      Métrica
                    </span>
                    <select
                      value={rule.metrica}
                      aria-invalid={Boolean(metricError)}
                      className={fieldClassName(Boolean(metricError))}
                      onChange={(event) =>
                        updateRule(index, "metrica", event.target.value)
                      }
                    >
                      {BONUS_RULE_METRICS.filter(
                        (metric) =>
                          metric.value === rule.metrica ||
                          !usedByOthers.includes(metric.value)
                      ).map((metric) => (
                        <option key={metric.value} value={metric.value}>
                          {metric.label}
                        </option>
                      ))}
                    </select>
                    {metricError ? (
                      <span className="mt-1 block text-sm text-rose-400" role="alert">
                        {metricError}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">
                      Condição
                    </span>
                    <select
                      value={rule.operador}
                      aria-invalid={Boolean(operatorError)}
                      className={fieldClassName(Boolean(operatorError))}
                      onChange={(event) =>
                        updateRule(
                          index,
                          "operador",
                          event.target.value as BonusRuleOperator
                        )
                      }
                    >
                      {BONUS_RULE_OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                    {operatorError ? (
                      <span className="mt-1 block text-sm text-rose-400" role="alert">
                        {operatorError}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">
                      Valor alvo
                    </span>
                    <input
                      inputMode="numeric"
                      placeholder={rule.metrica === "lateness_minutes" ? "15" : "0"}
                      value={rule.valorAlvo}
                      aria-invalid={Boolean(targetError)}
                      className={fieldClassName(Boolean(targetError))}
                      onChange={(event) =>
                        updateRule(index, "valorAlvo", event.target.value)
                      }
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      {rule.metrica === "lateness_minutes"
                        ? "Minutos acumulados no mês."
                        : rule.metrica === "absences"
                          ? "Quantidade de faltas no período."
                          : "Quantidade de ajustes manuais."}
                    </span>
                    {targetError ? (
                      <span className="mt-1 block text-sm text-rose-400" role="alert">
                        {targetError}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-400">
                      Valor da recompensa
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                        R$
                      </span>
                      <input
                        inputMode="decimal"
                        placeholder="100,00"
                        value={rule.valorRecompensa}
                        aria-invalid={Boolean(rewardError)}
                        className={`${fieldClassName(Boolean(rewardError))} pl-10`}
                        onChange={(event) =>
                          updateRule(index, "valorRecompensa", event.target.value)
                        }
                      />
                    </div>
                    {rewardError ? (
                      <span className="mt-1 block text-sm text-rose-400" role="alert">
                        {rewardError}
                      </span>
                    ) : null}
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        disabled={!unusedMetric}
        onClick={() => {
          if (!unusedMetric) {
            return;
          }

          onChange([...rules, defaultBonusRule(unusedMetric)]);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {unusedMetric ? "Adicionar regra" : "Todas as métricas já têm regra"}
      </button>
    </fieldset>
  );
}
