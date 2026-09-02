import { Users } from "lucide-react";
import { CreateCollaboratorForm } from "@/components/admin/create-collaborator-form";
import { ImportedCollaboratorsPanel } from "@/components/admin/imported-collaborators-panel";
import { TimesheetMonthNav } from "@/components/timesheet/timesheet-month-nav";
import { requestedAnalysisMonth } from "@/lib/admin/arquivos/month-preference";
import {
  listCurrentCollaborators,
  listExistingJobTitles,
} from "@/lib/admin/arquivos/queries";
import { getAdminNavItem } from "@/lib/admin/nav";
import { listWorkSchedules } from "@/lib/admin/regras/queries";
import {
  formatCurrencyBRL,
  formatMonthYear,
} from "@/lib/dashboard/formatters";

export const dynamic = "force-dynamic";

export default async function AdminCollaboratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const item = getAdminNavItem("/admin/colaboradores");
  const { mes } = await searchParams;
  const analysisMonth = await requestedAnalysisMonth(mes);
  const [bonusMonth, schedules, jobTitles] = await Promise.all([
    listCurrentCollaborators(analysisMonth),
    listWorkSchedules(),
    listExistingJobTitles(),
  ]);

  const paidCount = bonusMonth.collaborators.filter(
    (person) => person.bonusAmount !== null
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <Users className="h-6 w-6 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{item.label}</h1>
        <p className="mt-2 max-w-xl text-slate-400">{item.description}</p>
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {bonusMonth.collaborators.length > 0 ? (
            <div className="min-w-0 flex-1">
              <TimesheetMonthNav
                selectedMonth={bonusMonth.selectedMonth}
                currentMonth={bonusMonth.currentMonth}
                availableMonths={bonusMonth.availableMonths}
                basePath="/admin/colaboradores"
                persistMonth
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Nenhum colaborador cadastrado na empresa. Cadastre manualmente ou
              importe pela folha de ponto.
            </p>
          )}
          <CreateCollaboratorForm
            schedules={schedules}
            jobTitles={jobTitles}
          />
        </div>

        {bonusMonth.collaborators.length > 0 ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-400">
                Bônus pagos em {formatMonthYear(bonusMonth.selectedMonth)}
                {bonusMonth.selectedMonth === bonusMonth.currentMonth
                  ? " (mês atual)"
                  : ""}
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {formatCurrencyBRL(bonusMonth.totalBonus)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {paidCount === 0
                  ? "Nenhum colaborador com ponto neste mês."
                  : paidCount === 1
                    ? "1 colaborador com bônus neste mês."
                    : `${paidCount} colaboradores com bônus neste mês.`}
              </p>
            </div>
            <ImportedCollaboratorsPanel
              fileId={null}
              collaborators={bonusMonth.collaborators}
              schedules={schedules}
              jobTitles={jobTitles}
              searchable
              linkToDetail
              persistSelection
              detailMonth={bonusMonth.selectedMonth}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
