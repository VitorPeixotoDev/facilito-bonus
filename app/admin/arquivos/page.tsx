import Link from "next/link";
import { FileUp, History, Users } from "lucide-react";
import { CompanyFileUpload } from "@/components/admin/company-file-upload";
import { CompanyFilesList } from "@/components/admin/company-files-list";
import { CurrentCollaboratorsList } from "@/components/admin/current-collaborators-list";
import {
  listCompanyFiles,
  listCurrentCollaborators,
} from "@/lib/admin/arquivos/queries";
import { timesheetMonthHref } from "@/lib/admin/arquivos/months";
import { getAdminNavItem } from "@/lib/admin/nav";

const CHIPS = [
  { href: "#historico", label: "Histórico", icon: History },
  {
    href: "/admin/colaboradores",
    label: "Ver lista atual de colaboradores",
    icon: Users,
  },
] as const;

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const item = getAdminNavItem("/admin/arquivos");
  const { mes } = await searchParams;
  const [files, bonusMonth] = await Promise.all([
    listCompanyFiles(),
    listCurrentCollaborators(mes),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <FileUp className="h-6 w-6 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{item.label}</h1>
        <p className="mt-2 max-w-xl text-slate-400">{item.description}</p>
        <nav aria-label="Ações rápidas" className="mt-6 flex flex-wrap gap-2">
          {CHIPS.map((chip) => {
            const Icon = chip.icon;
            const href =
              chip.href === "/admin/colaboradores"
                ? timesheetMonthHref("/admin/colaboradores", bonusMonth.selectedMonth)
                : chip.href;

            return (
              <Link
                key={chip.href}
                href={href}
                className="inline-flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-900/50 px-3.5 py-1.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
              </Link>
            );
          })}
        </nav>
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <h2 className="mb-6 text-lg font-semibold text-white">
          Enviar folha de ponto
        </h2>
        <CompanyFileUpload />
      </section>

      <section id="colaboradores" className="scroll-mt-6 space-y-3">
        <CurrentCollaboratorsList bonusMonth={bonusMonth} />
      </section>

      <section id="historico" className="scroll-mt-6 space-y-3">
        <CompanyFilesList files={files} />
      </section>
    </div>
  );
}
