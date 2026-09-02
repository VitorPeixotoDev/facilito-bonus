"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Trash2, X } from "lucide-react";
import { deleteCompanyFileHistory } from "@/lib/admin/arquivos/actions";
import { monthsInPeriod, startOfMonth } from "@/lib/admin/arquivos/aej-timesheet";
import {
  COMPANY_FILE_PURPOSES,
  formatFileSize,
  formatUploadedAt,
  purposeLabel,
} from "@/lib/admin/arquivos/constants";
import type { CompanyFile } from "@/lib/admin/arquivos/types";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import { formatMonthYear } from "@/lib/dashboard/formatters";

type CompanyFilesListProps = {
  files: CompanyFile[];
};

type FileGroup = {
  key: string;
  month: string | null;
  isCurrent: boolean;
  files: CompanyFile[];
};

function groupFilesByMonth(files: CompanyFile[], currentMonth: string): FileGroup[] {
  const monthGroups = new Map<string, CompanyFile[]>();
  const other: CompanyFile[] = [];

  for (const file of files) {
    if (file.purpose === COMPANY_FILE_PURPOSES.ponto) {
      const months =
        file.periodStart && file.periodEnd
          ? monthsInPeriod(file.periodStart, file.periodEnd)
          : [startOfMonth(file.createdAt)];

      for (const month of months) {
        const current = monthGroups.get(month) ?? [];
        if (!current.some((entry) => entry.id === file.id)) {
          current.push(file);
        }
        monthGroups.set(month, current);
      }
      continue;
    }

    other.push(file);
  }

  const groups: FileGroup[] = [...monthGroups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([month, grouped]) => ({
      key: month,
      month,
      isCurrent: month === currentMonth,
      files: grouped.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    }));

  if (!monthGroups.has(currentMonth)) {
    groups.unshift({
      key: currentMonth,
      month: currentMonth,
      isCurrent: true,
      files: [],
    });
  }

  if (other.length > 0) {
    groups.push({
      key: "outros",
      month: null,
      isCurrent: false,
      files: other,
    });
  }

  return groups;
}

function FileRow({
  file,
  onDelete,
}: {
  file: CompanyFile;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 sm:flex-row sm:items-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
        <FileText className="h-5 w-5 text-cyan-400" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-white">
          {file.originalName}
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          {purposeLabel(file.purpose)} · {formatFileSize(file.sizeBytes)} ·{" "}
          {formatUploadedAt(file.createdAt)}
          {file.periodStart && file.periodEnd
            ? ` · ${file.periodStart} a ${file.periodEnd}`
            : ""}
          {file.pendingCount > 0
            ? ` · ${file.pendingCount} aguardando aceite`
            : ""}
        </p>
        <Link
          href={`/admin/arquivos/${file.id}/colaboradores`}
          className="mt-3 inline-flex text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          {file.pendingCount > 0
            ? "Revisar e aceitar novatos"
            : "Ver colaboradores da folha"}
        </Link>
      </div>
      <button
        type="button"
        onClick={() => onDelete(file.id)}
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 sm:ml-auto"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </button>
    </li>
  );
}

export function CompanyFilesList({ files }: CompanyFilesListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const currentMonth = startOfMonth(todayIsoDate());
  const groups = groupFilesByMonth(files, currentMonth);

  if (files.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-700/60 bg-slate-800/40 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <FileText className="h-6 w-6 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Histórico vazio</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Os arquivos TXT enviados pela empresa aparecem aqui, agrupados por mês.
        </p>
      </section>
    );
  }

  const fileToDelete = files.find((file) => file.id === pendingId) ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Histórico</h2>
        <p className="text-sm text-slate-400">
          {files.length === 1
            ? "1 arquivo enviado"
            : `${files.length} arquivos enviados`}
          , separados por mês. Envios da mesma competência se acumulam no ponto.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {group.month ? formatMonthYear(group.month) : "Cadastro e outros"}
            </h3>
            {group.isCurrent ? (
              <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                Mês atual
              </span>
            ) : null}
          </div>
          {group.files.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-800/40 px-4 py-3 text-sm text-slate-400">
              Nenhum arquivo neste mês ainda. Envie um AEJ diário, semanal ou
              mensal para começar.
            </p>
          ) : (
            <ul className="space-y-3">
              {group.files.map((file) => (
                <FileRow
                  key={`${group.key}-${file.id}`}
                  file={file}
                  onDelete={(id) => {
                    setError(null);
                    setMessage(null);
                    setPendingId(id);
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      ))}

      {fileToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => !pending && setPendingId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="excluir-historico-titulo"
            className="w-full max-w-lg rounded-3xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="excluir-historico-titulo"
                className="text-lg font-semibold text-white"
              >
                Excluir do histórico
              </h2>
              <button
                type="button"
                onClick={() => setPendingId(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300">
              Remover <span className="font-medium text-white">{fileToDelete.originalName}</span>{" "}
              do histórico? Isso não apaga o arquivo original, apenas o registro
              histórico no sistema.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setPendingId(null)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteCompanyFileHistory(fileToDelete.id);
                    if (result.ok) {
                      setMessage(result.message);
                      setPendingId(null);
                    } else {
                      setError(result.message);
                    }
                  });
                }}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? "Excluindo..." : "Excluir histórico"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
