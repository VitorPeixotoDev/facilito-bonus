"use client";

import { useActionState, useState } from "react";
import { completeCompanyAdminOnboarding } from "@/lib/onboarding/actions";
import {
  maskCnpj,
  maskCompanyName,
  maskCpf,
  maskPersonName,
} from "@/lib/onboarding/documents";
import {
  COMPANY_ONBOARDING_INITIAL_STATE,
  companyOnboardingSchema,
  fieldErrorsFromZod,
  validateOnboardingField,
  type CompanyOnboardingField,
  type CompanyOnboardingFieldErrors,
  type CompanyOnboardingInput,
} from "@/lib/onboarding/schema";

type CompanyOnboardingFormProps = {
  defaultFullName: string;
};

const inputClassName =
  "w-full rounded-xl border bg-slate-900 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500";

const MASKS: Record<
  CompanyOnboardingField,
  (value: string) => string
> = {
  fullName: maskPersonName,
  cpf: maskCpf,
  companyName: maskCompanyName,
  cnpj: maskCnpj,
};

function fieldClassName(hasError: boolean) {
  return [
    inputClassName,
    hasError
      ? "border-rose-400 focus:border-rose-400"
      : "border-slate-700 focus:border-cyan-400",
  ].join(" ");
}

export function CompanyOnboardingForm({
  defaultFullName,
}: CompanyOnboardingFormProps) {
  const [state, action, pending] = useActionState(
    completeCompanyAdminOnboarding,
    COMPANY_ONBOARDING_INITIAL_STATE
  );
  const [values, setValues] = useState<CompanyOnboardingInput>({
    fullName: maskPersonName(defaultFullName),
    cpf: "",
    companyName: "",
    cnpj: "",
  });
  const [clientErrors, setClientErrors] = useState<CompanyOnboardingFieldErrors>(
    {}
  );

  function errorFor(field: CompanyOnboardingField) {
    return field in clientErrors
      ? clientErrors[field]
      : state.fieldErrors[field];
  }

  function updateField(field: CompanyOnboardingField, value: string) {
    setValues((current) => ({ ...current, [field]: MASKS[field](value) }));
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function blurField(field: CompanyOnboardingField) {
    setClientErrors((current) => ({
      ...current,
      [field]: validateOnboardingField(field, values[field]),
    }));
  }

  return (
    <form
      action={action}
      noValidate
      className="space-y-4 text-left"
      onSubmit={(event) => {
        const result = companyOnboardingSchema.safeParse(values);

        if (!result.success) {
          event.preventDefault();
          setClientErrors(fieldErrorsFromZod(result.error));
        }
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">Nome completo</span>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          maxLength={120}
          value={values.fullName}
          aria-invalid={Boolean(errorFor("fullName"))}
          aria-describedby={errorFor("fullName") ? "fullName-error" : undefined}
          className={fieldClassName(Boolean(errorFor("fullName")))}
          onBlur={() => blurField("fullName")}
          onChange={(event) => updateField("fullName", event.target.value)}
        />
        {errorFor("fullName") ? (
          <span id="fullName-error" className="block text-sm text-rose-400" role="alert">
            {errorFor("fullName")}
          </span>
        ) : null}
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">CPF</span>
        <input
          id="cpf"
          name="cpf"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          maxLength={14}
          value={values.cpf}
          aria-invalid={Boolean(errorFor("cpf"))}
          aria-describedby={errorFor("cpf") ? "cpf-error" : undefined}
          className={fieldClassName(Boolean(errorFor("cpf")))}
          onBlur={() => blurField("cpf")}
          onChange={(event) => updateField("cpf", event.target.value)}
        />
        {errorFor("cpf") ? (
          <span id="cpf-error" className="block text-sm text-rose-400" role="alert">
            {errorFor("cpf")}
          </span>
        ) : null}
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">Nome da empresa</span>
        <input
          id="companyName"
          name="companyName"
          type="text"
          autoComplete="organization"
          maxLength={150}
          value={values.companyName}
          aria-invalid={Boolean(errorFor("companyName"))}
          aria-describedby={
            errorFor("companyName") ? "companyName-error" : undefined
          }
          className={fieldClassName(Boolean(errorFor("companyName")))}
          onBlur={() => blurField("companyName")}
          onChange={(event) => updateField("companyName", event.target.value)}
        />
        {errorFor("companyName") ? (
          <span
            id="companyName-error"
            className="block text-sm text-rose-400"
            role="alert"
          >
            {errorFor("companyName")}
          </span>
        ) : null}
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-300">CNPJ</span>
        <input
          id="cnpj"
          name="cnpj"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="AA.AAA.AAA/AAAA-00"
          maxLength={18}
          value={values.cnpj}
          aria-invalid={Boolean(errorFor("cnpj"))}
          aria-describedby={
            errorFor("cnpj") ? "cnpj-error" : "cnpj-hint"
          }
          className={`${fieldClassName(Boolean(errorFor("cnpj")))} uppercase`}
          onBlur={() => blurField("cnpj")}
          onChange={(event) => updateField("cnpj", event.target.value)}
        />
        {errorFor("cnpj") ? (
          <span id="cnpj-error" className="block text-sm text-rose-400" role="alert">
            {errorFor("cnpj")}
          </span>
        ) : (
          <span id="cnpj-hint" className="block text-xs text-slate-500">
            Formato numérico ou alfanumérico, com ou sem pontuação.
          </span>
        )}
      </label>
      {state.message ? (
        <p className="text-sm text-rose-400" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Salvando..." : "Continuar para o admin"}
      </button>
    </form>
  );
}
