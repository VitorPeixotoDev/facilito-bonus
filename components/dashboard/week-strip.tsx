import { formatCurrencyBRL } from "@/lib/dashboard/formatters";
import type { GoalProgress } from "@/lib/dashboard/types";

type WeekStripProps = {
  goals: GoalProgress[];
};

export function WeekStrip({ goals }: WeekStripProps) {
  if (goals.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/70 p-5">
        <h2 className="text-base font-semibold text-white">Semanas do mês</h2>
        <p className="mt-2 text-sm text-slate-400">
          As quatro semanas aparecem depois que o RH enviar o ponto.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-700/50 bg-slate-800/70 p-5">
      <h2 className="text-base font-semibold text-white">Semanas do mês</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {goals.map((goal) => {
          const complete = goal.progressPercent === 100;

          return (
            <div
              key={goal.id}
              className={`rounded-2xl border px-3 py-3 ${
                complete
                  ? "border-cyan-400/40 bg-cyan-400/10"
                  : "border-slate-700/60 bg-slate-900/50"
              }`}
            >
              <p className="text-xs font-medium text-slate-300">{goal.title}</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  complete ? "text-cyan-300" : "text-slate-400"
                }`}
              >
                {complete ? formatCurrencyBRL(goal.rewardAmount) : "Incompleta"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
