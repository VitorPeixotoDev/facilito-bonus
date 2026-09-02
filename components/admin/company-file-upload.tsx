"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { FileUp, Upload } from "lucide-react";
import { uploadCompanyFile } from "@/lib/admin/arquivos/actions";
import {
  COMPANY_FILE_FIELD,
  COMPANY_FILE_MAX_BYTES,
  COMPANY_FILE_MAX_LABEL,
  formatFileSize,
  isTxtFileName,
  originalFileName,
} from "@/lib/admin/arquivos/constants";
import { UPLOAD_COMPANY_FILE_INITIAL_STATE } from "@/lib/admin/arquivos/types";
import { maskCpf } from "@/lib/onboarding/documents";
import type { ParsedCollaborator } from "@/lib/admin/arquivos/aej-employees";

function PeopleTable({
  people,
  caption,
}: {
  people: ParsedCollaborator[];
  caption: string;
}) {
  if (people.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-300">{caption}</p>
      <div className="overflow-hidden rounded-2xl border border-slate-700/50">
        <div className="max-h-112 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Nome</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr
                  key={person.cpf}
                  className="border-t border-slate-800 text-slate-200"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-cyan-300">
                    {maskCpf(person.cpf)}
                  </td>
                  <td className="px-4 py-2.5 text-white">{person.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompanyFileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, action, pending] = useActionState(
    uploadCompanyFile,
    UPLOAD_COMPANY_FILE_INITIAL_STATE
  );
  const formKey = state.ok && state.uploadedAt ? String(state.uploadedAt) : "idle";

  function assignFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const name = originalFileName(file.name);

    if (!isTxtFileName(name)) {
      setClientError("Envie apenas arquivos .txt.");
      setSelectedName(null);
      setSelectedSize(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    if (file.size === 0) {
      setClientError("O arquivo está vazio.");
      setSelectedName(null);
      setSelectedSize(null);
      return;
    }

    if (file.size > COMPANY_FILE_MAX_BYTES) {
      setClientError(`O arquivo deve ter no máximo ${COMPANY_FILE_MAX_LABEL}.`);
      setSelectedName(null);
      setSelectedSize(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }

    setClientError(null);
    setSelectedName(name);
    setSelectedSize(file.size);
  }

  const errorMessage = clientError ?? (state.ok ? null : state.message);
  const showResult = !clientError && !selectedName && !pending && state.ok;

  return (
    <form
      key={formKey}
      action={action}
      className="space-y-6"
      onSubmit={() => {
        setClientError(null);
        setSelectedName(null);
        setSelectedSize(null);
      }}
    >
      <p className="text-sm text-slate-400">
        Envie o TXT da folha de ponto — o mês inteiro, uma semana ou só um dia.
        Os envios se acumulam no mês corrente e o histórico fica separado por
        mês. Se a empresa ainda não tem colaboradores, eles são cadastrados
        automaticamente. Novatos em uma folha já preenchida ficam apontados para
        aceite.
      </p>

      <label
        htmlFor={COMPANY_FILE_FIELD}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          assignFile(event.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-cyan-400 bg-cyan-400/10"
            : "border-slate-700/60 bg-slate-800/40 hover:border-cyan-400/40 hover:bg-slate-800/60"
        }`}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <FileUp className="h-6 w-6 text-cyan-400" />
        </div>
        <p className="text-base font-semibold text-white">
          {selectedName ?? "Solte o arquivo TXT aqui"}
        </p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          {selectedName && selectedSize !== null
            ? formatFileSize(selectedSize)
            : `Ou clique para selecionar. Até ${COMPANY_FILE_MAX_LABEL}.`}
        </p>
        <input
          ref={inputRef}
          id={COMPANY_FILE_FIELD}
          name={COMPANY_FILE_FIELD}
          type="file"
          accept=".txt,text/plain"
          className="sr-only"
          onChange={(event) => assignFile(event.target.files?.[0])}
        />
      </label>

      {errorMessage ? (
        <p className="text-sm text-rose-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !selectedName}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.3)] transition hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        <Upload className="h-5 w-5" />
        {pending ? "Enviando..." : "Enviar folha de ponto"}
      </button>

      {showResult && state.message ? (
        <p className="text-sm text-emerald-400">{state.message}</p>
      ) : null}

      {showResult ? (
        <div className="space-y-6">
          <PeopleTable
            people={state.pending}
            caption={`${state.pending.length} aguardando aceite`}
          />
          <PeopleTable
            people={state.collaborators}
            caption={`${state.collaborators.length} cadastrado${state.collaborators.length === 1 ? "" : "s"} agora`}
          />
          <div className="flex flex-wrap gap-2">
            {state.fileId && (state.pending.length > 0 || state.collaborators.length > 0) ? (
              <Link
                href={`/admin/arquivos/${state.fileId}/colaboradores`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                {state.pending.length > 0
                  ? "Revisar e aceitar novatos"
                  : "Ver a lista em detalhes"}
              </Link>
            ) : null}
            {state.processed > 0 ? (
              <Link
                href="/admin/colaboradores"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ver bônus dos colaboradores
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
