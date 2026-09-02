"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckSquare, Clock, UserPlus, X } from "lucide-react";
import { acceptPendingCollaborators } from "@/lib/admin/arquivos/collaborator-actions";
import type { ParsedCollaborator } from "@/lib/admin/arquivos/aej-employees";
import { maskCpf } from "@/lib/onboarding/documents";
import type { WorkSchedule } from "@/lib/admin/regras/types";

type PendingCollaboratorsPanelProps = {
  fileId: string;
  pending: ParsedCollaborator[];
  schedules: WorkSchedule[];
};

export function PendingCollaboratorsPanel({
  fileId,
  pending,
  schedules,
}: PendingCollaboratorsPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleId, setScheduleId] = useState(schedules[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, startTransition] = useTransition();

  const pendingCpfs = useMemo(
    () => new Set(pending.map((person) => person.cpf)),
    [pending]
  );
  const activeSelected = useMemo(
    () => new Set([...selected].filter((cpf) => pendingCpfs.has(cpf))),
    [pendingCpfs, selected]
  );

  const allSelected =
    pending.length > 0 &&
    pending.every((person) => activeSelected.has(person.cpf));

  const selectedPeople = useMemo(
    () => pending.filter((person) => activeSelected.has(person.cpf)),
    [pending, activeSelected]
  );

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(pending.map((person) => person.cpf)));
  }

  function toggleOne(cpf: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(cpf)) {
        next.delete(cpf);
      } else {
        next.add(cpf);
      }
      return next;
    });
  }

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Aguardando aceite</h2>
          <p className="mt-1 text-sm text-slate-400">
            {pending.length === 1
              ? "1 colaborador novo nesta folha."
              : `${pending.length} colaboradores novos nesta folha.`}{" "}
            Aceite com uma regra para incluí-los no cálculo do ponto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            <CheckSquare className="h-4 w-4" />
            {allSelected ? "Limpar seleção" : "Selecionar todos"}
          </button>
          <button
            type="button"
            disabled={activeSelected.size === 0}
            onClick={() => {
              setError(null);
              setMessage(null);
              setScheduleId(schedules[0]?.id ?? "");
              setDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Aceitar selecionados
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-400/5">
        <div className="max-h-112 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Selecionar todos os pendentes"
                    className="h-4 w-4 accent-cyan-400"
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((person) => (
                <tr key={person.cpf} className="border-t border-slate-800">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={activeSelected.has(person.cpf)}
                      aria-label={`Selecionar ${person.name}`}
                      className="h-4 w-4 accent-cyan-400"
                      onChange={() => toggleOne(person.cpf)}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-medium text-white">
                    {person.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-cyan-300">
                    {maskCpf(person.cpf)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => !pendingAction && setDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aceitar-pendentes-titulo"
            className="w-full max-w-lg rounded-3xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="aceitar-pendentes-titulo"
                className="text-lg font-semibold text-white"
              >
                Aceitar colaboradores
              </h2>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {schedules.length === 0 ? (
              <p className="text-sm text-slate-400">
                Cadastre uma escala em Regras antes de aceitar. Sem regra eles
                não entram no cálculo da folha.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  {selectedPeople.length} colaborador
                  {selectedPeople.length === 1 ? "" : "es"} será
                  {selectedPeople.length === 1 ? "" : "ão"} cadastrado
                  {selectedPeople.length === 1 ? "" : "s"} com a regra escolhida
                  e incluído{selectedPeople.length === 1 ? "" : "s"} nesta folha.
                </p>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    Escala de trabalho
                  </span>
                  <select
                    value={scheduleId}
                    onChange={(event) => setScheduleId(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  >
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.name} (código {schedule.code})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pendingAction}
                    onClick={() => setDialogOpen(false)}
                    className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={pendingAction || !scheduleId}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await acceptPendingCollaborators(
                          fileId,
                          [...activeSelected],
                          scheduleId
                        );
                        if (result.ok) {
                          setMessage(result.message);
                          setError(null);
                          setSelected(new Set());
                          setDialogOpen(false);
                        } else {
                          setError(result.message);
                        }
                      });
                    }}
                    className="flex-1 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingAction ? "Aceitando..." : "Aceitar e incluir na folha"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
