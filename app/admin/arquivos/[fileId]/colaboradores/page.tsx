import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { ImportedCollaboratorsPanel } from "@/components/admin/imported-collaborators-panel";
import { PendingCollaboratorsPanel } from "@/components/admin/pending-collaborators-panel";
import {
  getCompanyFile,
  listExistingJobTitles,
  listImportedCollaborators,
  listPendingCollaborators,
} from "@/lib/admin/arquivos/queries";
import { listWorkSchedules } from "@/lib/admin/regras/queries";

export default async function ImportedCollaboratorsPage({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const { fileId } = await params;
  const file = await getCompanyFile(fileId);

  if (!file) {
    notFound();
  }

  const [collaborators, pending, schedules, jobTitles] = await Promise.all([
    listImportedCollaborators(file.id),
    listPendingCollaborators(file.id),
    listWorkSchedules(),
    listExistingJobTitles(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <Link
          href="/admin/arquivos"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para arquivos
        </Link>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <Users className="h-6 w-6 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Colaboradores da folha</h1>
        <p className="mt-2 max-w-xl text-slate-400">
          Detalhes importados de {file.originalName}. Novatos aguardam aceite
          com uma regra. Os já cadastrados podem receber cargo, regra, convite
          ou exclusão.
        </p>
      </section>

      {pending.length > 0 ? (
        <section className="rounded-3xl border border-amber-400/30 bg-slate-800/60 p-8">
          <PendingCollaboratorsPanel
            fileId={file.id}
            pending={pending}
            schedules={schedules}
          />
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        {collaborators.length === 0 ? (
          <p className="text-sm text-slate-400">
            {pending.length > 0
              ? "Nenhum colaborador cadastrado nesta folha ainda. Aceite os novatos acima."
              : "Nenhum colaborador vinculado a este arquivo."}
          </p>
        ) : (
          <ImportedCollaboratorsPanel
            fileId={file.id}
            collaborators={collaborators}
            schedules={schedules}
            jobTitles={jobTitles}
          />
        )}
      </section>
    </div>
  );
}
