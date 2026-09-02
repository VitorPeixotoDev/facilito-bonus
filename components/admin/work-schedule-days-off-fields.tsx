"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import {
  NTH_SUNDAYS,
  SUNDAY_RULE_TYPES,
  WEEKDAYS,
  formatIsoDatePt,
  isSundayIsoDate,
  uniqueSortedDates,
  uniqueSortedNumbers,
  type SundayRuleType,
} from "@/lib/admin/regras/days-off";
import type { WorkScheduleFieldErrors } from "@/lib/admin/regras/schema";

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

export type WorkScheduleDaysOffValues = {
  diasFolga: number[];
  regraDomingo: SundayRuleType;
  domingosFixos: number[];
  domingosAvulsos: string[];
};

type WorkScheduleDaysOffFieldsProps = {
  values: WorkScheduleDaysOffValues;
  errors: WorkScheduleFieldErrors;
  onChange: (values: WorkScheduleDaysOffValues) => void;
};

function toggleNumber(values: number[], value: number): number[] {
  return uniqueSortedNumbers(
    values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value]
  );
}

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let node = element?.parentElement ?? null;

  while (node) {
    const { overflowY } = getComputedStyle(node);

    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

export function WorkScheduleDaysOffFields({
  values,
  errors,
  onChange,
}: WorkScheduleDaysOffFieldsProps) {
  const [draftDate, setDraftDate] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const pendingScrollTop = useRef<number | null>(null);
  const sundayIsFixedOff = values.diasFolga.includes(0);
  const sundayRule = sundayIsFixedOff ? "none" : values.regraDomingo;

  useLayoutEffect(() => {
    if (pendingScrollTop.current === null) {
      return;
    }

    const scroller = findScrollParent(fieldsetRef.current);

    if (scroller) {
      scroller.scrollTop = pendingScrollTop.current;
    }

    pendingScrollTop.current = null;
  });

  function changeValues(next: WorkScheduleDaysOffValues) {
    const scroller = findScrollParent(fieldsetRef.current);
    pendingScrollTop.current = scroller?.scrollTop ?? null;
    onChange(next);
  }

  function errorFor(field: string) {
    return errors[field];
  }

  function addFloatingSunday() {
    if (!draftDate) {
      setDraftError("Informe a data do domingo.");
      return;
    }

    if (!isSundayIsoDate(draftDate)) {
      setDraftError("A data precisa cair em um domingo.");
      return;
    }

    if (values.domingosAvulsos.includes(draftDate)) {
      setDraftError("Este domingo já está na lista.");
      return;
    }

    onChange({
      ...values,
      regraDomingo: "floating",
      domingosAvulsos: uniqueSortedDates([...values.domingosAvulsos, draftDate]),
    });
    setDraftDate("");
    setDraftError(null);
  }

  return (
    <fieldset
      ref={fieldsetRef}
      className="space-y-4 rounded-2xl border border-slate-700/30 bg-slate-800/50 p-6 [overflow-anchor:none]"
    >
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-cyan-400">
        <CalendarOff className="h-4 w-4" />
        Folgas programadas
      </legend>
      <p className="text-sm text-slate-400">
        Dias sem jornada esperada. No acompanhamento de ponto eles aparecem como
        folga, não como falta.
      </p>

      <div>
        <p className="mb-2 text-xs text-slate-400">Dias fixos da semana</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAYS.map((weekday) => {
            const checked = values.diasFolga.includes(weekday.value);

            return (
              <label
                key={weekday.value}
                title={weekday.label}
                className={`relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition has-focus-visible:ring-2 has-focus-visible:ring-violet-400 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-slate-900 ${
                  checked
                    ? "border-violet-400/70 bg-violet-400/10 text-violet-200"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                }`}
              >
                <input
                  type="checkbox"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  checked={checked}
                  aria-label={weekday.label}
                  onChange={() => {
                    const diasFolga = toggleNumber(
                      values.diasFolga,
                      weekday.value
                    );
                    const sundayOff = diasFolga.includes(0);

                    changeValues({
                      ...values,
                      diasFolga,
                      regraDomingo: sundayOff ? "none" : values.regraDomingo,
                    });
                  }}
                />
                <span className="pointer-events-none">{weekday.short}</span>
              </label>
            );
          })}
        </div>
        {errorFor("diasFolga") ? (
          <p className="mt-2 text-sm text-rose-400" role="alert">
            {errorFor("diasFolga")}
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Sábado e domingo já vêm marcados. Desmarque um domingo para
            trabalhar nesse dia ou para usar 1º/3º domingo e datas avulsas.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs text-slate-400">Regra de domingos</p>
        {sundayIsFixedOff ? (
          <p className="rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-2.5 text-sm text-violet-200">
            Todo domingo já está marcado como folga. Desmarque Domingo nos dias
            fixos para programar só alguns (1º e 3º, ou datas avulsas).
          </p>
        ) : (
          <div className="space-y-2">
            {SUNDAY_RULE_TYPES.map((rule) => (
              <label
                key={rule.value}
                className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 transition ${
                  sundayRule === rule.value
                    ? "border-cyan-400/60 bg-cyan-400/5"
                    : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  className="mt-1 accent-cyan-400"
                  name="regraDomingoUi"
                  checked={sundayRule === rule.value}
                  onChange={() =>
                    changeValues({ ...values, regraDomingo: rule.value })
                  }
                />
                <span>
                  <span className="block text-sm font-medium text-white">
                    {rule.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {rule.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {errorFor("regraDomingo") ? (
          <p className="text-sm text-rose-400" role="alert">
            {errorFor("regraDomingo")}
          </p>
        ) : null}
      </div>

      {!sundayIsFixedOff && sundayRule === "fixed_nth" ? (
        <div>
          <p className="mb-2 text-xs text-slate-400">
            Quais domingos do mês são folga
          </p>
          <div className="flex flex-wrap gap-2">
            {NTH_SUNDAYS.map((entry) => {
              const checked = values.domingosFixos.includes(entry.value);

              return (
                <label
                  key={entry.value}
                  className={`relative cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition has-focus-visible:ring-2 has-focus-visible:ring-violet-400 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-slate-900 ${
                    checked
                      ? "border-violet-400/70 bg-violet-400/10 text-violet-200"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...values,
                        domingosFixos: toggleNumber(
                          values.domingosFixos,
                          entry.value
                        ),
                      })
                    }
                  />
                  <span className="pointer-events-none">{entry.label}</span>
                </label>
              );
            })}
          </div>
          {errorFor("domingosFixos") ? (
            <p className="mt-2 text-sm text-rose-400" role="alert">
              {errorFor("domingosFixos")}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Ex.: 1º e 3º domingo. Os outros domingos entram no cálculo de
              pontualidade e falta.
            </p>
          )}
        </div>
      ) : null}

      {!sundayIsFixedOff && sundayRule === "floating" ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Domingos avulsos de folga</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={draftDate}
              aria-invalid={Boolean(draftError)}
              className={fieldClassName(Boolean(draftError))}
              onChange={(event) => {
                setDraftDate(event.target.value);
                setDraftError(null);
              }}
            />
            <button
              type="button"
              onClick={addFloatingSunday}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Incluir domingo
            </button>
          </div>
          {draftError ? (
            <p className="text-sm text-rose-400" role="alert">
              {draftError}
            </p>
          ) : null}
          {errorFor("domingosAvulsos") ? (
            <p className="text-sm text-rose-400" role="alert">
              {errorFor("domingosAvulsos")}
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Só aceita domingo. Os demais permanecem como dia de trabalho.
            </p>
          )}
          {values.domingosAvulsos.length > 0 ? (
            <ul className="space-y-2">
              {values.domingosAvulsos.map((date, index) => (
                <li
                  key={date}
                  className="flex items-center justify-between gap-3 rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-2"
                >
                  <span className="text-sm text-violet-100">
                    {formatIsoDatePt(date)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...values,
                        domingosAvulsos: values.domingosAvulsos.filter(
                          (item) => item !== date
                        ),
                      })
                    }
                    className="rounded-lg p-1 text-slate-400 transition hover:text-white"
                    aria-label={`Remover ${formatIsoDatePt(date)}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {errors[`domingosAvulsos.${index}`] ? (
                    <span className="sr-only" role="alert">
                      {errors[`domingosAvulsos.${index}`]}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum domingo avulso cadastrado ainda.
            </p>
          )}
        </div>
      ) : null}
    </fieldset>
  );
}
