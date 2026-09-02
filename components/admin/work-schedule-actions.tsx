"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteWorkSchedule } from "@/lib/admin/regras/actions";
import type { WorkSchedule } from "@/lib/admin/regras/types";

type WorkScheduleActionsProps = {
  schedule: WorkSchedule;
};

export function WorkScheduleActions({ schedule }: WorkScheduleActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/regras/${schedule.id}/editar`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-600/70 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </button>
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => !pending && setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="excluir-escala-titulo"
            className="w-full max-w-lg rounded-3xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="excluir-escala-titulo"
                className="text-lg font-semibold text-white"
              >
                Excluir escala
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
              Excluir a escala{" "}
              <span className="font-medium text-white">
                Código {schedule.code} ({schedule.name})
              </span>
              ? Os colaboradores vinculados ficam sem regra atribuída. Esta ação
              não pode ser desfeita.
            </p>
            {error ? (
              <p className="mt-3 text-sm text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
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
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteWorkSchedule(schedule.id);
                    if (result.ok) {
                      setConfirmOpen(false);
                    } else {
                      setError(result.message);
                    }
                  });
                }}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? "Excluindo..." : "Excluir escala"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
