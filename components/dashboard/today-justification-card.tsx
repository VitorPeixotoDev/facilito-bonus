import {
  CalendarOff,
  CheckCircle2,
  Clock,
  Hourglass,
  Inbox,
} from "lucide-react";
import { TimesheetClaimButton } from "@/components/dashboard/timesheet-claim-button";
import { justificationKindLabel } from "@/lib/admin/regras/justification";
import { formatDayHeading } from "@/lib/dashboard/formatters";
import type { StatementStatus, TodayJustification } from "@/lib/dashboard/types";

type TodayJustificationCardProps = {
  today: TodayJustification;
};

function tone(status: StatementStatus) {
  switch (status) {
    case "day_off":
      return "text-violet-300";
    case "justified":
      return "text-emerald-300";
    case "pending":
      return "text-amber-300";
    case "compliant":
      return "text-cyan-300";
    case "future":
      return "text-slate-400";
    default:
      return "text-rose-300";
  }
}

export function TodayJustificationCard({
  today,
}: TodayJustificationCardProps) {
  const entry = today.entry;
  const Icon = today.isDayOff
    ? CalendarOff
    : entry?.status === "pending"
      ? Hourglass
      : entry?.status === "justified" || entry?.status === "compliant"
        ? CheckCircle2
        : today.waitingForTimesheet
          ? Inbox
          : Clock;

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-slate-800/80 p-5 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
        Hoje
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        {formatDayHeading(today.date)}
      </h2>

      <div className="mt-4 flex items-start gap-3">
        <div className="rounded-2xl bg-slate-900 p-3 text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {today.isDayOff ? (
            <p className="text-sm text-violet-200">
              Folga pela regra do seu bônus. Não é necessário justificar.
            </p>
          ) : entry ? (
            <div>
              {entry.justificationKind ? (
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {justificationKindLabel(entry.justificationKind)}
                </p>
              ) : null}
              <p className={`text-sm font-medium ${tone(entry.status)}`}>
                {entry.statusLabel}
              </p>
              {entry.claimNote ? (
                <p className="mt-2 text-xs text-slate-400">
                  Sua justificativa: {entry.claimNote}
                </p>
              ) : null}
              {entry.reviewNote ? (
                <p className="mt-1 text-xs text-slate-400">
                  Resposta do RH: {entry.reviewNote}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              {today.waitingForTimesheet
                ? "Ainda não há ponto de hoje. Você já pode abrir uma justificativa de atraso ou falta."
                : "Se precisar, abra uma justificativa de atraso ou falta."}
            </p>
          )}
        </div>
      </div>

      {today.canOpen ? (
        <TimesheetClaimButton
          eventId={entry?.id && !entry.id.startsWith("day-off-") ? entry.id : null}
          featured
          chooseKind
          defaultKind={entry?.justificationKind ?? null}
        />
      ) : null}
    </section>
  );
}
