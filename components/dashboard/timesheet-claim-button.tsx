"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimTimesheetJustification } from "@/lib/dashboard/justification-actions";
import {
  justificationKindLabel,
  type JustificationKind,
} from "@/lib/admin/regras/justification";

type TimesheetClaimButtonProps = {
  eventId?: string | null;
  featured?: boolean;
  chooseKind?: boolean;
  defaultKind?: JustificationKind | null;
};

const KINDS: JustificationKind[] = ["lateness", "absence"];

export function TimesheetClaimButton({
  eventId = null,
  featured = false,
  chooseKind = false,
  defaultKind = null,
}: TimesheetClaimButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<JustificationKind | null>(defaultKind);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (chooseKind && !kind) {
      setMessage("Escolha se a justificativa é de atraso ou de falta.");
      return;
    }

    startTransition(async () => {
      const result = await claimTimesheetJustification(
        eventId,
        note,
        kind
      );
      setMessage(result.message);

      if (result.ok) {
        setOpen(false);
        setNote("");
        setKind(defaultKind);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <div className={featured ? "mt-4" : "mt-3"}>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
          className={
            featured
              ? "flex min-h-12 w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:opacity-60"
              : "rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/25"
          }
        >
          {featured ? "Abrir justificativa" : "Justificar este dia"}
        </button>
        {message ? (
          <p className="mt-2 text-xs text-slate-400">{message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={featured ? "mt-4 space-y-3" : "mt-3 space-y-2"}>
      {chooseKind ? (
        <fieldset>
          <legend
            className={
              featured
                ? "mb-2 block text-sm text-slate-300"
                : "mb-1 block text-xs text-slate-400"
            }
          >
            Categoria
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((option) => {
              const selected = kind === option;

              return (
                <button
                  key={option}
                  type="button"
                  disabled={pending}
                  onClick={() => setKind(option)}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "min-h-11 rounded-xl border border-cyan-400 bg-cyan-400/15 px-3 py-2 text-sm font-semibold text-cyan-200"
                      : "min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300"
                  }
                >
                  {justificationKindLabel(option)}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <label className="block">
        <span
          className={
            featured
              ? "mb-2 block text-sm text-slate-300"
              : "mb-1 block text-xs text-slate-400"
          }
        >
          Motivo da justificativa
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={featured ? 4 : 3}
          placeholder={
            kind === "absence"
              ? "Ex.: consulta médica, atestado..."
              : kind === "lateness"
                ? "Ex.: atraso no transporte, imprevisto..."
                : "Ex.: consulta médica, atraso no transporte..."
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-base text-white outline-none focus:border-cyan-400"
        />
      </label>
      <div className={featured ? "grid grid-cols-1 gap-2" : "flex gap-2"}>
        <button
          type="button"
          disabled={pending || (chooseKind && !kind) || note.trim().length < 1}
          onClick={submit}
          className={
            featured
              ? "flex min-h-12 w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 disabled:opacity-60"
              : "rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-60"
          }
        >
          {pending ? "Enviando..." : "Enviar justificativa"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className={
            featured
              ? "flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300"
              : "rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
          }
        >
          Cancelar
        </button>
      </div>
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
