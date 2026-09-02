"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckSquare,
  ChevronRight,
  Clock,
  Link2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  assignImportedJobTitle,
  assignImportedWorkSchedule,
  deleteImportedCollaborators,
  sendImportedInvites,
} from "@/lib/admin/arquivos/collaborator-actions";
import type { ImportedCollaborator } from "@/lib/admin/arquivos/types";
import { formatCurrencyBRL } from "@/lib/dashboard/formatters";
import { maskCpf } from "@/lib/onboarding/documents";
import type { WorkSchedule } from "@/lib/admin/regras/types";
import { SavedSuggestionField } from "@/components/admin/saved-suggestion-field";
import { TimesheetNotificationMarkers } from "@/components/admin/timesheet-notification-markers";
import {
  getCollaboratorSelection,
  getServerCollaboratorSelection,
  subscribeCollaboratorSelection,
  writeCollaboratorSelection,
} from "@/lib/admin/arquivos/collaborator-selection";
import { timesheetMonthHref } from "@/lib/admin/arquivos/months";
import {
  mergeSavedSuggestions,
  normalizeSuggestionSearch,
  parseSavedSuggestion,
} from "@/lib/admin/saved-suggestions";

type DialogKind = "cargo" | "regra" | "convite" | "excluir" | null;

type ImportedCollaboratorsPanelProps = {
  fileId: string | null;
  collaborators: ImportedCollaborator[];
  schedules: WorkSchedule[];
  jobTitles: string[];
  searchable?: boolean;
  linkToDetail?: boolean;
  detailMonth?: string | null;
  persistSelection?: boolean;
};

function inviteStatusLabel(person: ImportedCollaborator) {
  if (person.hasUser) {
    return "Vinculado";
  }

  if (person.invitedAt) {
    return "Enviado";
  }

  return "Pendente";
}

function bonusLabel(person: ImportedCollaborator) {
  if (person.workScheduleId && person.bonusAmount !== null) {
    return formatCurrencyBRL(person.bonusAmount);
  }

  return "—";
}

function matchesCollaborator(person: ImportedCollaborator, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    person.name,
    person.jobTitle ?? "",
    person.workScheduleName ?? "",
  ]
    .map(normalizeSuggestionSearch)
    .join(" ");

  return query.split(" ").every((term) => haystack.includes(term));
}

export function ImportedCollaboratorsPanel({
  fileId,
  collaborators,
  schedules,
  jobTitles,
  searchable = false,
  linkToDetail = false,
  detailMonth = null,
  persistSelection = false,
}: ImportedCollaboratorsPanelProps) {
  const [query, setQuery] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());
  const persistedIds = useSyncExternalStore(
    subscribeCollaboratorSelection,
    getCollaboratorSelection,
    getServerCollaboratorSelection
  );
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [localTitles, setLocalTitles] = useState<string[]>([]);
  const [scheduleId, setScheduleId] = useState(schedules[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<{ name: string; url: string }[]>([]);
  const [pending, startTransition] = useTransition();

  const savedTitles = useMemo(
    () => mergeSavedSuggestions(jobTitles, localTitles),
    [jobTitles, localTitles]
  );

  const selected = useMemo(() => {
    const ids = new Set(collaborators.map((person) => person.id));
    const source = persistSelection ? persistedIds : [...localSelected];
    return new Set(source.filter((id) => ids.has(id)));
  }, [collaborators, persistSelection, persistedIds, localSelected]);

  const visibleCollaborators = useMemo(() => {
    const normalizedQuery = normalizeSuggestionSearch(query);

    if (!searchable || !normalizedQuery) {
      return collaborators;
    }

    return collaborators.filter((person) =>
      matchesCollaborator(person, normalizedQuery)
    );
  }, [collaborators, query, searchable]);

  const selectedRows = useMemo(
    () => collaborators.filter((person) => selected.has(person.id)),
    [collaborators, selected]
  );

  const allSelected =
    visibleCollaborators.length > 0 &&
    visibleCollaborators.every((person) => selected.has(person.id));

  function commitSelection(next: Set<string>) {
    if (persistSelection) {
      writeCollaboratorSelection([...next]);
      return;
    }

    setLocalSelected(next);
  }

  function toggleAll() {
    const next = new Set(selected);

    if (allSelected) {
      for (const person of visibleCollaborators) {
        next.delete(person.id);
      }
    } else {
      for (const person of visibleCollaborators) {
        next.add(person.id);
      }
    }

    commitSelection(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    commitSelection(next);
  }

  function closeDialog() {
    setDialog(null);
  }

  function runAction(
    action: () => Promise<{
      ok: boolean;
      message: string;
      inviteLinks: { name: string; url: string }[];
    }>,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await action();
      if (result.ok) {
        setMessage(result.message);
        setInviteLinks(result.inviteLinks);
        onSuccess?.();
        if (result.inviteLinks.length === 0) {
          closeDialog();
        }
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {searchable ? (
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            placeholder="Buscar por nome, cargo ou regra"
            autoComplete="off"
            aria-label="Buscar colaborador por nome, cargo ou regra"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pr-10 pl-10 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-white"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-400">
          {selected.size === 0
            ? searchable && normalizeSuggestionSearch(query)
              ? visibleCollaborators.length === 0
                ? "Nenhum colaborador encontrado"
                : `${visibleCollaborators.length} de ${collaborators.length} colaborador${collaborators.length === 1 ? "" : "es"}`
              : `${collaborators.length} colaborador${collaborators.length === 1 ? "" : "es"} na lista`
            : `${selected.size} selecionado${selected.size === 1 ? "" : "s"}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={visibleCollaborators.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckSquare className="h-4 w-4" />
            {allSelected ? "Limpar seleção" : "Selecionar todos"}
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              setJobTitle(selectedRows[0]?.jobTitle ?? "");
              setDialog("cargo");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Briefcase className="h-4 w-4" />
            Atribuir cargo
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              setScheduleId(selectedRows[0]?.workScheduleId ?? schedules[0]?.id ?? "");
              setDialog("regra");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            Atribuir regra
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              setInviteLinks([]);
              setDialog("convite");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            Enviar convite
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => setDialog("excluir")}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      {linkToDetail ? (
        <div className="max-h-160 space-y-3 overflow-auto">
          {visibleCollaborators.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700/60 px-4 py-8 text-center text-sm text-slate-400">
              Nenhum colaborador corresponde à busca.
            </p>
          ) : (
            visibleCollaborators.map((person) => {
              const hasBonus =
                Boolean(person.workScheduleId) && person.bonusAmount !== null;

              return (
                <article
                  key={person.id}
                  className="relative rounded-2xl border border-slate-700/50 bg-slate-900/40 transition hover:border-cyan-400/40"
                >
                  <label
                    className="absolute top-5 left-4 z-10 flex h-6 w-6 items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(person.id)}
                      aria-label={`Selecionar ${person.name}`}
                      className="h-4 w-4 accent-cyan-400"
                      onChange={() => toggleOne(person.id)}
                    />
                  </label>
                  <Link
                    href={
                      detailMonth
                        ? timesheetMonthHref(
                            `/admin/colaboradores/${person.id}`,
                            detailMonth
                          )
                        : `/admin/colaboradores/${person.id}`
                    }
                    className="flex items-start gap-4 rounded-2xl py-4 pr-4 pl-12"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{person.name}</p>
                        <TimesheetNotificationMarkers collaborator={person} />
                      </div>
                      <p className="mt-1 font-mono text-sm text-cyan-300">
                        {maskCpf(person.cpf)}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div>
                          <dt className="text-xs text-slate-500">Cargo</dt>
                          <dd className="text-slate-300">
                            {person.jobTitle ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Regra</dt>
                          <dd className="text-slate-300">
                            {person.workScheduleName ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Bônus</dt>
                          <dd
                            className={
                              hasBonus
                                ? "font-medium text-emerald-300"
                                : "text-slate-300"
                            }
                          >
                            {bonusLabel(person)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Convite</dt>
                          <dd className="text-slate-300">
                            {inviteStatusLabel(person)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
                  </Link>
                </article>
              );
            })
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-700/50">
          <div className="max-h-160 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={visibleCollaborators.length === 0}
                      aria-label="Selecionar todos"
                      className="h-4 w-4 accent-cyan-400 disabled:opacity-50"
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Regra</th>
                  <th className="px-4 py-3">Bônus</th>
                  <th className="px-4 py-3">Convite</th>
                </tr>
              </thead>
              <tbody>
                {visibleCollaborators.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-slate-400"
                    >
                      Nenhum colaborador corresponde à busca.
                    </td>
                  </tr>
                ) : (
                  visibleCollaborators.map((person) => (
                    <tr key={person.id} className="border-t border-slate-800">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(person.id)}
                          aria-label={`Selecionar ${person.name}`}
                          className="h-4 w-4 accent-cyan-400"
                          onChange={() => toggleOne(person.id)}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-white">
                        {person.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-cyan-300">
                        {maskCpf(person.cpf)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {person.jobTitle ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {person.workScheduleName ?? "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-2.5 ${
                          person.workScheduleId && person.bonusAmount !== null
                            ? "font-medium text-emerald-300"
                            : "text-slate-300"
                        }`}
                      >
                        {bonusLabel(person)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {inviteStatusLabel(person)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-3xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                {dialog === "cargo"
                  ? "Atribuir cargo"
                  : dialog === "regra"
                    ? "Atribuir regra"
                    : dialog === "convite"
                      ? "Enviar convite"
                      : "Excluir colaboradores"}
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

            {dialog === "cargo" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  O cargo será aplicado aos {selected.size} selecionados.
                </p>
                <SavedSuggestionField
                  label="Cargo"
                  value={jobTitle}
                  onChange={setJobTitle}
                  suggestions={savedTitles}
                  placeholder="Digite para buscar ou cadastrar um cargo"
                  emptyNone="Nenhum cargo salvo ainda. O texto digitado será salvo como sugestão."
                  emptyNoMatch="Nenhum cargo salvo corresponde. O texto digitado será salvo como sugestão."
                />
                <button
                  type="button"
                  disabled={pending || !parseSavedSuggestion(jobTitle)}
                  onClick={() =>
                    runAction(
                      () =>
                        assignImportedJobTitle(fileId, [...selected], jobTitle),
                      () => {
                        setLocalTitles((current) =>
                          mergeSavedSuggestions(current, [jobTitle])
                        );
                      }
                    )
                  }
                  className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pending ? "Salvando..." : "Atribuir cargo"}
                </button>
              </div>
            ) : null}

            {dialog === "regra" ? (
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Cadastre uma escala em Regras antes de atribuir.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-400">
                      A jornada será aplicada aos {selected.size} selecionados.
                    </p>
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">
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
                    <button
                      type="button"
                      disabled={pending || !scheduleId}
                      onClick={() =>
                        runAction(() =>
                          assignImportedWorkSchedule(fileId, [...selected], scheduleId)
                        )
                      }
                      className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {pending ? "Salvando..." : "Atribuir regra"}
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {dialog === "convite" ? (
              <div className="space-y-4">
                {inviteLinks.length === 0 ? (
                  <>
                    <p className="text-sm text-slate-400">
                      Gerar links de convite para os {selected.size} selecionados.
                      Quem já tem conta vinculada será ignorado.
                    </p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(() => sendImportedInvites(fileId, [...selected]))
                      }
                      className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {pending ? "Gerando..." : "Gerar convites"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-emerald-400">
                      Copie e envie os links abaixo.
                    </p>
                    <ul className="max-h-64 space-y-2 overflow-auto">
                      {inviteLinks.map((invite) => (
                        <li
                          key={invite.url}
                          className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-3"
                        >
                          <p className="text-sm font-medium text-white">{invite.name}</p>
                          <p className="mt-1 break-all font-mono text-xs text-cyan-300">
                            {invite.url}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          inviteLinks.map((invite) => `${invite.name}: ${invite.url}`).join("\n")
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Copiar todos
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {dialog === "excluir" ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Excluir {selected.size} colaborador{selected.size === 1 ? "" : "es"} da
                  empresa? Administradores e quem já entrou com a conta não serão
                  removidos. Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      runAction(() =>
                        deleteImportedCollaborators(fileId, [...selected])
                      )
                    }
                    className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pending ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
