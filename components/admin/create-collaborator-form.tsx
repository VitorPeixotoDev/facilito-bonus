"use client";

import { useActionState, useMemo, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { SavedSuggestionField } from "@/components/admin/saved-suggestion-field";
import { createManualCollaborator } from "@/lib/admin/arquivos/collaborator-actions";
import {
  CREATE_COLLABORATOR_INITIAL_STATE,
  DEFAULT_CREATE_COLLABORATOR_VALUES,
  createCollaboratorFieldErrorsFromZod,
  createCollaboratorSchema,
  validateCreateCollaboratorField,
  type CreateCollaboratorField,
  type CreateCollaboratorFieldErrors,
  type CreateCollaboratorInput,
} from "@/lib/admin/arquivos/collaborator-schema";
import { mergeSavedSuggestions } from "@/lib/admin/saved-suggestions";
import type { WorkSchedule } from "@/lib/admin/regras/types";
import { maskCpf, maskPersonName } from "@/lib/onboarding/documents";

type CreateCollaboratorFormProps = {
  schedules: WorkSchedule[];
  jobTitles: string[];
};

const inputClassName =
  "w-full rounded-xl border bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500";

const MASKS: Record<
  Extract<CreateCollaboratorField, "name" | "cpf">,
  (value: string) => string
> = {
  name: maskPersonName,
  cpf: maskCpf,
};

function fieldClassName(hasError: boolean) {
  return [
    inputClassName,
    hasError
      ? "border-rose-400 focus:border-rose-400"
      : "border-slate-700 focus:border-cyan-400",
  ].join(" ");
}

export function CreateCollaboratorForm({
  schedules,
  jobTitles,
}: CreateCollaboratorFormProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createManualCollaborator,
    CREATE_COLLABORATOR_INITIAL_STATE
  );
  const [values, setValues] = useState<CreateCollaboratorInput>(
    DEFAULT_CREATE_COLLABORATOR_VALUES
  );
  const [clientErrors, setClientErrors] = useState<CreateCollaboratorFieldErrors>(
    {}
  );
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const savedTitles = useMemo(
    () => mergeSavedSuggestions(jobTitles, values.jobTitle ? [values.jobTitle] : []),
    [jobTitles, values.jobTitle]
  );

  if (state.ok && state.createdAt && closedAt !== state.createdAt) {
    setClosedAt(state.createdAt);
    setOpen(false);
    setClientErrors({});
    setValues(DEFAULT_CREATE_COLLABORATOR_VALUES);
  }

  function errorFor(field: CreateCollaboratorField) {
    return field in clientErrors
      ? clientErrors[field]
      : state.fieldErrors[field];
  }

  function updateField(field: CreateCollaboratorField, value: string) {
    const next =
      field === "name" || field === "cpf" ? MASKS[field](value) : value;

    setValues((current) => ({ ...current, [field]: next }));
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function blurField(field: CreateCollaboratorField) {
    setClientErrors((current) => ({
      ...current,
      [field]: validateCreateCollaboratorField(field, values[field]),
    }));
  }

  function closeDialog() {
    if (pending) {
      return;
    }

    setOpen(false);
    setClientErrors({});
  }

  return (
    <div className="shrink-0 space-y-3">
      <button
        type="button"
        onClick={() => {
          setClientErrors({});
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-cyan-400"
      >
        <UserPlus className="h-4 w-4" />
        Novo colaborador
      </button>
      {state.ok && state.message ? (
        <p className="text-sm text-emerald-400">{state.message}</p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-collaborator-title"
            className="w-full max-w-lg rounded-3xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="create-collaborator-title"
                className="text-lg font-semibold text-white"
              >
                Cadastrar colaborador
              </h2>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-1 text-slate-400 transition hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              action={action}
              noValidate
              className="space-y-4"
              onSubmit={(event) => {
                const result = createCollaboratorSchema.safeParse(values);

                if (!result.success) {
                  event.preventDefault();
                  setClientErrors(
                    createCollaboratorFieldErrorsFromZod(result.error)
                  );
                }
              }}
            >
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-300">
                  Nome completo
                </span>
                <input
                  id="create-collaborator-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  value={values.name}
                  aria-invalid={Boolean(errorFor("name"))}
                  aria-describedby={
                    errorFor("name") ? "create-collaborator-name-error" : undefined
                  }
                  className={fieldClassName(Boolean(errorFor("name")))}
                  onBlur={() => blurField("name")}
                  onChange={(event) => updateField("name", event.target.value)}
                />
                {errorFor("name") ? (
                  <span
                    id="create-collaborator-name-error"
                    className="block text-sm text-rose-400"
                    role="alert"
                  >
                    {errorFor("name")}
                  </span>
                ) : null}
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-300">CPF</span>
                <input
                  id="create-collaborator-cpf"
                  name="cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  value={values.cpf}
                  aria-invalid={Boolean(errorFor("cpf"))}
                  aria-describedby={
                    errorFor("cpf") ? "create-collaborator-cpf-error" : undefined
                  }
                  className={fieldClassName(Boolean(errorFor("cpf")))}
                  onBlur={() => blurField("cpf")}
                  onChange={(event) => updateField("cpf", event.target.value)}
                />
                {errorFor("cpf") ? (
                  <span
                    id="create-collaborator-cpf-error"
                    className="block text-sm text-rose-400"
                    role="alert"
                  >
                    {errorFor("cpf")}
                  </span>
                ) : null}
              </label>
              <input type="hidden" name="jobTitle" value={values.jobTitle} />
              <SavedSuggestionField
                label="Cargo (opcional)"
                value={values.jobTitle}
                onChange={(value) => updateField("jobTitle", value)}
                suggestions={savedTitles}
                placeholder="Digite para buscar ou cadastrar um cargo"
                emptyNone="Nenhum cargo salvo ainda. O texto digitado será salvo como sugestão."
                emptyNoMatch="Nenhum cargo salvo corresponde. O texto digitado será salvo como sugestão."
              />
              {errorFor("jobTitle") ? (
                <p className="text-sm text-rose-400" role="alert">
                  {errorFor("jobTitle")}
                </p>
              ) : null}
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-300">
                  Regra de jornada (opcional)
                </span>
                <select
                  id="create-collaborator-schedule"
                  name="workScheduleId"
                  value={values.workScheduleId}
                  aria-invalid={Boolean(errorFor("workScheduleId"))}
                  aria-describedby={
                    errorFor("workScheduleId")
                      ? "create-collaborator-schedule-error"
                      : undefined
                  }
                  className={fieldClassName(Boolean(errorFor("workScheduleId")))}
                  onBlur={() => blurField("workScheduleId")}
                  onChange={(event) =>
                    updateField("workScheduleId", event.target.value)
                  }
                >
                  <option value="">Sem regra atribuída</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name} (código {schedule.code})
                    </option>
                  ))}
                </select>
                {errorFor("workScheduleId") ? (
                  <span
                    id="create-collaborator-schedule-error"
                    className="block text-sm text-rose-400"
                    role="alert"
                  >
                    {errorFor("workScheduleId")}
                  </span>
                ) : null}
              </label>
              {state.message && !state.ok ? (
                <p className="text-sm text-rose-400" role="alert">
                  {state.message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? "Cadastrando..." : "Cadastrar"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
