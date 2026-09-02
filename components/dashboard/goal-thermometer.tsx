import { GoalProgressItem } from "@/components/dashboard/goal-progress-item";
import type { GoalProgress } from "@/lib/dashboard/types";

type GoalThermometerProps = {
  goals: GoalProgress[];
};

export function GoalThermometer({ goals }: GoalThermometerProps) {
  return (
    <section className="bg-slate-800 rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <h2 className="text-xl font-semibold text-white mb-6">
        Semanas do mês
      </h2>

      {goals.length === 0 ? (
        <p className="text-sm text-slate-400">
          Ainda não há ponto deste mês para montar as quatro semanas. Envie o
          acompanhamento de ponto após atribuir a regra.
        </p>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => (
            <GoalProgressItem key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </section>
  );
}
