import { StatementCard } from "@/components/dashboard/statement-card";
import type { StatementEntry } from "@/lib/dashboard/types";

type RecentStatementProps = {
  entries: StatementEntry[];
};

export function RecentStatement({ entries }: RecentStatementProps) {
  const visible = entries.filter(
    (entry) => entry.status !== "future" && entry.status !== "day_off"
  );
  const highlighted = visible.filter(
    (entry) =>
      entry.canClaim || entry.status === "pending" || entry.status === "warning"
  );
  const history = visible.filter(
    (entry) =>
      !entry.canClaim && entry.status !== "pending" && entry.status !== "warning"
  );

  if (visible.length === 0) {
    return (
      <section className="space-y-3 pb-4">
        <h3 className="text-base font-semibold text-white">Ponto do mês</h3>
        <p className="text-sm text-slate-400">
          Nenhum dia de trabalho neste mês ainda. Folgas ficam no calendário
          acima e o ponto entra quando o RH envia a folha.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-4">
      <h3 className="text-base font-semibold text-white">Ponto do mês</h3>
      {highlighted.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-300">
            Precisa de atenção
          </p>
          {highlighted.map((entry) => (
            <StatementCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : null}
      {history.length > 0 ? (
        <div className="space-y-2">
          {highlighted.length > 0 ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Demais dias
            </p>
          ) : null}
          {history.map((entry) => (
            <StatementCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
