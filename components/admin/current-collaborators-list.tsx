import Link from "next/link";
import { Users } from "lucide-react";
import { TimesheetMonthNav } from "@/components/timesheet/timesheet-month-nav";
import { timesheetMonthHref } from "@/lib/admin/arquivos/months";
import type { CollaboratorsBonusMonth } from "@/lib/admin/arquivos/types";
import {
  formatCurrencyBRL,
  formatMonthYear,
} from "@/lib/dashboard/formatters";
import { maskCpf } from "@/lib/onboarding/documents";

type CurrentCollaboratorsListProps = {
  bonusMonth: CollaboratorsBonusMonth;
};

export function CurrentCollaboratorsList({
  bonusMonth,
}: CurrentCollaboratorsListProps) {
  const { collaborators, selectedMonth, currentMonth, availableMonths, totalBonus } =
    bonusMonth;

  if (collaborators.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-700/60 bg-slate-800/40 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <Users className="h-6 w-6 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Nenhum colaborador cadastrado
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          A lista atual da empresa aparece aqui após o cadastramento pela folha
          de ponto.
        </p>
      </section>
    );
  }

  const paidCount = collaborators.filter(
    (person) => person.bonusAmount !== null
  ).length;
  const detailsHref = timesheetMonthHref("/admin/colaboradores", selectedMonth);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">
        Lista atual de colaboradores
      </h2>
      <TimesheetMonthNav
        selectedMonth={selectedMonth}
        currentMonth={currentMonth}
        availableMonths={availableMonths}
        basePath="/admin/arquivos"
      />
      <div>
        <p className="text-sm text-slate-400">
          Bônus pagos em {formatMonthYear(selectedMonth)}
          {selectedMonth === currentMonth ? " (mês atual)" : ""}
        </p>
        <p className="mt-1 text-2xl font-bold text-emerald-300">
          {formatCurrencyBRL(totalBonus)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {paidCount === 0
            ? "Nenhum colaborador com ponto neste mês."
            : paidCount === 1
              ? "1 colaborador com bônus neste mês."
              : `${paidCount} colaboradores com bônus neste mês.`}
        </p>
      </div>
      <p className="text-sm text-slate-400">
        {collaborators.length === 1
          ? "1 colaborador na empresa"
          : `${collaborators.length} colaboradores na empresa`}
      </p>
      <Link
        href={detailsHref}
        className="inline-flex text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
      >
        Ver a lista em detalhes
      </Link>
      <div className="overflow-hidden rounded-2xl border border-slate-700/50">
        <div className="max-h-112 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Regra</th>
                <th className="px-4 py-3">Bônus</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((person) => (
                <tr key={person.id} className="border-t border-slate-800">
                  <td className="px-4 py-2.5 font-medium text-white">
                    <Link
                      href={timesheetMonthHref(
                        `/admin/colaboradores/${person.id}`,
                        selectedMonth
                      )}
                      className="transition hover:text-cyan-300"
                    >
                      {person.name}
                    </Link>
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
                    {person.workScheduleId && person.bonusAmount !== null
                      ? formatCurrencyBRL(person.bonusAmount)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
