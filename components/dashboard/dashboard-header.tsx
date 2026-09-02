import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { formatUploadedAt } from "@/lib/admin/arquivos/constants";
import { signOut } from "@/lib/auth/actions";
import {
  bonusProgressPercent,
  formatCurrencyBRL,
  formatMonthName,
  formatPercent,
} from "@/lib/dashboard/formatters";

type DashboardHeaderProps = {
  employeeName: string;
  referenceMonth: string;
  isCurrentMonth?: boolean;
  earnedAmount: number;
  bonusCeiling: number;
  completeWeeks?: number;
  lastTimesheetAt?: string | null;
  showSignOut?: boolean;
  showAdminLink?: boolean;
};

export function DashboardHeader({
  employeeName,
  referenceMonth,
  isCurrentMonth = false,
  earnedAmount,
  bonusCeiling,
  completeWeeks,
  lastTimesheetAt = null,
  showSignOut = false,
  showAdminLink = false,
}: DashboardHeaderProps) {
  const progressPercent = bonusProgressPercent(earnedAmount, bonusCeiling);

  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Facilitô!{" "}
            <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
              Bônus
            </span>
          </h1>
          <p className="truncate text-sm text-slate-400">Olá, {employeeName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showAdminLink ? (
            <Link
              href="/admin"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
              aria-label="Abrir admin"
            >
              <Shield className="h-4 w-4" />
            </Link>
          ) : null}
          {showSignOut ? (
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800 text-slate-300"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800 p-5 shadow-lg">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {isCurrentMonth
            ? "Previsto"
            : `Previsto de ${formatMonthName(referenceMonth)}`}
        </p>
        <p className="mt-1 text-3xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
          {formatCurrencyBRL(earnedAmount)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isCurrentMonth ? "Cotação atual da folha" : "Valor fechado da folha"}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-amber-200/80">
          Atrasos acima da tolerância sem justificativa aceita, assim como
          faltas, afetam diretamente o valor do bônus.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-900/50 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Máximo a alcançar
            </p>
            <p className="text-sm font-medium text-slate-400">
              {formatCurrencyBRL(bonusCeiling)}
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {formatPercent(progressPercent)} do máximo
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full border border-slate-700 bg-slate-950"
            role="progressbar"
            aria-label="Percentual do máximo da regra"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
          >
            <div
              className="h-2 rounded-full bg-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {typeof completeWeeks === "number" ? (
          <p className="mt-3 text-sm text-slate-400">
            {completeWeeks}/4 semanas completas
          </p>
        ) : null}
        {lastTimesheetAt ? (
          <p className="mt-2 text-xs text-slate-500">
            Folha atualizada em {formatUploadedAt(lastTimesheetAt)}
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Aguardando o primeiro envio da folha pelo RH.
          </p>
        )}
      </section>
    </header>
  );
}
