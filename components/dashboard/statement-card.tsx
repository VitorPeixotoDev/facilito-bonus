import { CalendarOff, CheckCircle2, Clock, Hourglass } from "lucide-react";
import { TimesheetClaimButton } from "@/components/dashboard/timesheet-claim-button";
import { formatStatementDate } from "@/lib/dashboard/formatters";
import type { StatementEntry } from "@/lib/dashboard/types";

type StatementCardProps = {
  entry: StatementEntry;
};

function statusStyle(status: StatementEntry["status"]) {
  switch (status) {
    case "day_off":
      return { className: "text-violet-300", border: "border-violet-400/30" };
    case "justified":
      return { className: "text-emerald-300", border: "border-emerald-400/30" };
    case "pending":
      return { className: "text-amber-300", border: "border-amber-400/30" };
    case "future":
      return { className: "text-slate-400", border: "border-slate-700/30" };
    case "compliant":
      return { className: "text-cyan-400", border: "border-slate-700/30" };
    default:
      return { className: "text-rose-400", border: "border-rose-400/30" };
  }
}

export function StatementCard({ entry }: StatementCardProps) {
  const style = statusStyle(entry.status);
  const Icon =
    entry.status === "day_off"
      ? CalendarOff
      : entry.status === "pending"
        ? Hourglass
        : entry.status === "justified" || entry.status === "compliant"
          ? CheckCircle2
          : Clock;

  return (
    <div className={`rounded-2xl border bg-slate-800/80 p-4 ${style.border}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg bg-slate-900 p-2 ${style.className}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200">
            {formatStatementDate(entry.date)}
          </p>
          <p className={`mt-1 text-sm ${style.className}`}>{entry.statusLabel}</p>
          {entry.claimNote ? (
            <p className="mt-1 text-xs text-slate-500">{entry.claimNote}</p>
          ) : null}
          {entry.canClaim ? <TimesheetClaimButton eventId={entry.id} /> : null}
        </div>
      </div>
    </div>
  );
}
