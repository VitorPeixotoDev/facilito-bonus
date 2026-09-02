"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Save, X } from "lucide-react";
import {
  createWorkSchedule,
  updateWorkSchedule,
} from "@/lib/admin/regras/actions";
import {
  computeScheduleTotals,
  formatMinutesAsHours,
} from "@/lib/admin/regras/schedule";
import {
  DEFAULT_WORK_SCHEDULE_VALUES,
  WORK_SCHEDULE_INITIAL_STATE,
  fieldErrorsFromZod,
  workScheduleSchema,
  workScheduleToInput,
  type WorkScheduleField,
  type WorkScheduleFieldErrors,
  type WorkScheduleInput,
} from "@/lib/admin/regras/schema";
import { WorkScheduleDaysOffFields } from "@/components/admin/work-schedule-days-off-fields";
import type { WorkSchedule } from "@/lib/admin/regras/types";

const inputClassName =
  "w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition [color-scheme:dark]";

function fieldClassName(hasError: boolean) {
  return [
    inputClassName,
    hasError
      ? "border-rose-400 focus:border-rose-400"
      : "border-slate-700 focus:border-cyan-400",
  ].join(" ");
}

type WorkScheduleFormProps = {
  schedule?: WorkSchedule;
};

export function WorkScheduleForm({ schedule }: WorkScheduleFormProps) {
  const isEdit = Boolean(schedule);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasSecondShift, setHasSecondShift] = useState(
    schedule ? Boolean(schedule.entry2 && schedule.exit2) : true
  );
  const [values, setValues] = useState<WorkScheduleInput>(
    schedule ? workScheduleToInput(schedule) : DEFAULT_WORK_SCHEDULE_VALUES
  );
  const [clientErrors, setClientErrors] = useState<WorkScheduleFieldErrors>({});

  const [state, action, pending] = useActionState(
    isEdit ? updateWorkSchedule : createWorkSchedule,
    WORK_SCHEDULE_INITIAL_STATE
  );

  useEffect(() => {
    if (pending) {
      confirmedRef.current = false;
    }
  }, [pending]);

  const totals = computeScheduleTotals({
    ent1: values.ent1,
    sai1: values.sai1,
    ent2: hasSecondShift ? values.ent2 : "",
    sai2: hasSecondShift ? values.sai2 : "",
  });

  function errorFor(field: string) {
    return field in clientErrors
      ? clientErrors[field]
      : state.fieldErrors[field];
  }

  function updateField(
    field: Exclude<
      WorkScheduleField,
      "diasFolga" | "domingosFixos" | "domingosAvulsos" | "regraDomingo"
    >,
    value: string
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  const submitValues: WorkScheduleInput = {
    ...values,
    ent2: hasSecondShift ? values.ent2 : "",
    sai2: hasSecondShift ? values.sai2 : "",
  };

  function confirmSave() {
    confirmedRef.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          const result = workScheduleSchema.safeParse(submitValues);

          if (!result.success) {
            event.preventDefault();
            setClientErrors(fieldErrorsFromZod(result.error));
            return;
          }

          if (isEdit && !confirmedRef.current) {
            event.preventDefault();
            setConfirmOpen(true);
          }
        }}
      >
        {schedule ? (
          <input type="hidden" name="scheduleId" value={schedule.id} />
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            Nome do padrão
          </span>
          <input
            id="nome"
            name="nome"
            type="text"
            maxLength={120}
            placeholder="Ex: Padrão comercial (8 horas)"
            value={values.nome}
            aria-invalid={Boolean(errorFor("nome"))}
            aria-describedby={errorFor("nome") ? "nome-error" : undefined}
            className={`${fieldClassName(Boolean(errorFor("nome")))} px-4 py-3`}
            onChange={(event) => updateField("nome", event.target.value)}
          />
          {errorFor("nome") ? (
            <span id="nome-error" className="mt-1.5 block text-sm text-rose-400" role="alert">
              {errorFor("nome")}
            </span>
          ) : null}
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-3">
          <span className="text-sm text-slate-300">
            Jornada com intervalo (2º turno)
          </span>
          <input
            type="checkbox"
            checked={hasSecondShift}
            onChange={(event) => {
              const enabled = event.target.checked;
              setHasSecondShift(enabled);
              setValues((current) => ({
                ...current,
                ent2: enabled ? current.ent2 || "13:00" : "",
                sai2: enabled ? current.sai2 || "17:00" : "",
              }));
              setClientErrors((current) => ({
                ...current,
                ent2: undefined,
                sai2: undefined,
              }));
            }}
            className="h-4 w-4 accent-cyan-400"
          />
        </label>

        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-slate-700/30 bg-slate-800/50 p-6 sm:grid-cols-2">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-cyan-400">1º turno</legend>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Entrada 1</span>
              <input
                name="ent1"
                type="time"
                required
                value={values.ent1}
                aria-invalid={Boolean(errorFor("ent1"))}
                className={fieldClassName(Boolean(errorFor("ent1")))}
                onChange={(event) => updateField("ent1", event.target.value)}
              />
              {errorFor("ent1") ? (
                <span className="mt-1 block text-sm text-rose-400" role="alert">
                  {errorFor("ent1")}
                </span>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Saída 1</span>
              <input
                name="sai1"
                type="time"
                required
                value={values.sai1}
                aria-invalid={Boolean(errorFor("sai1"))}
                className={fieldClassName(Boolean(errorFor("sai1")))}
                onChange={(event) => updateField("sai1", event.target.value)}
              />
              {errorFor("sai1") ? (
                <span className="mt-1 block text-sm text-rose-400" role="alert">
                  {errorFor("sai1")}
                </span>
              ) : null}
            </label>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-cyan-400">2º turno</legend>
            {hasSecondShift ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">
                    Entrada 2 (opcional)
                  </span>
                  <input
                    name="ent2"
                    type="time"
                    value={values.ent2}
                    aria-invalid={Boolean(errorFor("ent2"))}
                    className={fieldClassName(Boolean(errorFor("ent2")))}
                    onChange={(event) => updateField("ent2", event.target.value)}
                  />
                  {errorFor("ent2") ? (
                    <span className="mt-1 block text-sm text-rose-400" role="alert">
                      {errorFor("ent2")}
                    </span>
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">
                    Saída 2 (opcional)
                  </span>
                  <input
                    name="sai2"
                    type="time"
                    value={values.sai2}
                    aria-invalid={Boolean(errorFor("sai2"))}
                    className={fieldClassName(Boolean(errorFor("sai2")))}
                    onChange={(event) => updateField("sai2", event.target.value)}
                  />
                  {errorFor("sai2") ? (
                    <span className="mt-1 block text-sm text-rose-400" role="alert">
                      {errorFor("sai2")}
                    </span>
                  ) : null}
                </label>
              </>
            ) : (
              <>
                <input type="hidden" name="ent2" value="" />
                <input type="hidden" name="sai2" value="" />
                <p className="text-sm text-slate-500">
                  Sem intervalo: a carga usa só o 1º turno, inclusive jornadas que
                  viram a meia-noite.
                </p>
              </>
            )}
          </fieldset>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Carga horária calculada
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatMinutesAsHours(totals.totalMinutes)}{" "}
              <span className="text-sm font-normal text-cyan-400">
                ({totals.totalMinutes} min)
              </span>
            </p>
          </div>

          {totals.isNight ? (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-400/10 px-3 py-2 text-sm text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span>Turno noturno detectado.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Turno diurno validado.</span>
            </div>
          )}
        </div>

        <WorkScheduleDaysOffFields
          values={{
            diasFolga: values.diasFolga,
            regraDomingo: values.regraDomingo,
            domingosFixos: values.domingosFixos,
            domingosAvulsos: values.domingosAvulsos,
          }}
          errors={{ ...state.fieldErrors, ...clientErrors }}
          onChange={(daysOff) => {
            setValues((current) => ({ ...current, ...daysOff }));
            setClientErrors((current) => {
              const next = { ...current };
              delete next.diasFolga;
              delete next.regraDomingo;
              delete next.domingosFixos;
              delete next.domingosAvulsos;

              for (const key of Object.keys(next)) {
                if (key.startsWith("domingosAvulsos.")) {
                  delete next[key];
                }
              }

              return next;
            });
          }}
        />

        <input
          type="hidden"
          name="diasFolga"
          value={JSON.stringify(values.diasFolga)}
        />
        <input type="hidden" name="regraDomingo" value={values.regraDomingo} />
        <input
          type="hidden"
          name="domingosFixos"
          value={JSON.stringify(values.domingosFixos)}
        />
        <input
          type="hidden"
          name="domingosAvulsos"
          value={JSON.stringify(values.domingosAvulsos)}
        />

        <fieldset className="space-y-4 rounded-2xl border border-slate-700/30 bg-slate-800/50 p-6">
          <legend className="px-1 text-sm font-semibold text-cyan-400">
            Plano de bonificação
          </legend>
          <p className="text-sm text-slate-400">
            O valor base é o teto do mês (100%), conquistado em quatro semanas
            de 25%. Cada falta ou atraso acima da tolerância, sem justificativa,
            desconta o percentual informado — com efeito retroativo no mês
            inteiro.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">
                Valor base da bonificação (teto)
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                  R$
                </span>
                <input
                  name="valorBaseBonificacao"
                  inputMode="decimal"
                  placeholder="500,00"
                  value={values.valorBaseBonificacao}
                  aria-invalid={Boolean(errorFor("valorBaseBonificacao"))}
                  aria-describedby={
                    errorFor("valorBaseBonificacao")
                      ? "valorBaseBonificacao-error"
                      : "valorBaseBonificacao-hint"
                  }
                  className={`${fieldClassName(Boolean(errorFor("valorBaseBonificacao")))} pl-10`}
                  onChange={(event) =>
                    updateField("valorBaseBonificacao", event.target.value)
                  }
                />
              </div>
              <span
                id="valorBaseBonificacao-hint"
                className="mt-1 block text-xs text-slate-500"
              >
                Máximo que o colaborador pode receber no mês.
              </span>
              {errorFor("valorBaseBonificacao") ? (
                <span
                  id="valorBaseBonificacao-error"
                  className="mt-1 block text-sm text-rose-400"
                  role="alert"
                >
                  {errorFor("valorBaseBonificacao")}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">
                Tolerância diária de atraso
              </span>
              <div className="relative">
                <input
                  name="toleranciaMinutosAcumulados"
                  inputMode="numeric"
                  placeholder="15"
                  value={values.toleranciaMinutosAcumulados}
                  aria-invalid={Boolean(errorFor("toleranciaMinutosAcumulados"))}
                  aria-describedby={
                    errorFor("toleranciaMinutosAcumulados")
                      ? "toleranciaMinutosAcumulados-error"
                      : "toleranciaMinutosAcumulados-hint"
                  }
                  className={`${fieldClassName(Boolean(errorFor("toleranciaMinutosAcumulados")))} pr-12`}
                  onChange={(event) =>
                    updateField("toleranciaMinutosAcumulados", event.target.value)
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                  min
                </span>
              </div>
              <span
                id="toleranciaMinutosAcumulados-hint"
                className="mt-1 block text-xs text-slate-500"
              >
                Atraso do dia só vira infração se passar deste limite.
              </span>
              {errorFor("toleranciaMinutosAcumulados") ? (
                <span
                  id="toleranciaMinutosAcumulados-error"
                  className="mt-1 block text-sm text-rose-400"
                  role="alert"
                >
                  {errorFor("toleranciaMinutosAcumulados")}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">
                Penalização por falta sem justificativa
              </span>
              <div className="relative">
                <input
                  name="percentualPenalizacaoFalta"
                  inputMode="decimal"
                  placeholder="50"
                  value={values.percentualPenalizacaoFalta}
                  aria-invalid={Boolean(errorFor("percentualPenalizacaoFalta"))}
                  aria-describedby={
                    errorFor("percentualPenalizacaoFalta")
                      ? "percentualPenalizacaoFalta-error"
                      : "percentualPenalizacaoFalta-hint"
                  }
                  className={`${fieldClassName(Boolean(errorFor("percentualPenalizacaoFalta")))} pr-10`}
                  onChange={(event) =>
                    updateField("percentualPenalizacaoFalta", event.target.value)
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                  %
                </span>
              </div>
              <span
                id="percentualPenalizacaoFalta-hint"
                className="mt-1 block text-xs text-slate-500"
              >
                Ex.: 50 para −50% do teto a cada falta injustificada.
              </span>
              {errorFor("percentualPenalizacaoFalta") ? (
                <span
                  id="percentualPenalizacaoFalta-error"
                  className="mt-1 block text-sm text-rose-400"
                  role="alert"
                >
                  {errorFor("percentualPenalizacaoFalta")}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">
                Penalização por atraso sem justificativa
              </span>
              <div className="relative">
                <input
                  name="percentualPenalizacaoAtraso"
                  inputMode="decimal"
                  placeholder="10"
                  value={values.percentualPenalizacaoAtraso}
                  aria-invalid={Boolean(errorFor("percentualPenalizacaoAtraso"))}
                  aria-describedby={
                    errorFor("percentualPenalizacaoAtraso")
                      ? "percentualPenalizacaoAtraso-error"
                      : "percentualPenalizacaoAtraso-hint"
                  }
                  className={`${fieldClassName(Boolean(errorFor("percentualPenalizacaoAtraso")))} pr-10`}
                  onChange={(event) =>
                    updateField("percentualPenalizacaoAtraso", event.target.value)
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                  %
                </span>
              </div>
              <span
                id="percentualPenalizacaoAtraso-hint"
                className="mt-1 block text-xs text-slate-500"
              >
                Ex.: 10 para −10% do teto a cada dia de atraso acima da tolerância.
              </span>
              {errorFor("percentualPenalizacaoAtraso") ? (
                <span
                  id="percentualPenalizacaoAtraso-error"
                  className="mt-1 block text-sm text-rose-400"
                  role="alert"
                >
                  {errorFor("percentualPenalizacaoAtraso")}
                </span>
              ) : null}
            </label>
          </div>
        </fieldset>

        {state.message && !state.ok ? (
          <p className="text-sm text-rose-400" role="alert">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.3)] transition hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isEdit ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {pending
            ? "Gravando..."
            : isEdit
              ? "Salvar alterações"
              : "Gravar escala e gerar código"}
        </button>
      </form>

      {confirmOpen && schedule ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => !pending && setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="salvar-escala-titulo"
            className="w-full max-w-lg rounded-3xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="salvar-escala-titulo"
                className="text-lg font-semibold text-white"
              >
                Salvar alterações
              </h2>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300">
              Atualizar a escala{" "}
              <span className="font-medium text-white">
                Código {schedule.code} ({schedule.name})
              </span>
              ? Colaboradores com esta regra passam a usar os novos horários,
              folgas e variáveis de bonificação.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmSave}
                className="flex-1 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? "Gravando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
