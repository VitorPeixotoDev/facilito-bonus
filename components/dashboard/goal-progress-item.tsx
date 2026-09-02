import { AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/dashboard/formatters";
import type { GoalProgress } from "@/lib/dashboard/types";

type GoalProgressItemProps = {
  goal: GoalProgress;
};

export function GoalProgressItem({ goal }: GoalProgressItemProps) {
  const StatusIcon = goal.status === "achieved" ? CheckCircle : AlertTriangle;
  const iconClassName =
    goal.status === "achieved" ? "text-cyan-400" : "text-yellow-500";

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-slate-300">{goal.title}</span>
        <span className="text-cyan-400 font-bold">
          {formatCurrencyBRL(goal.rewardAmount)}
        </span>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 overflow-hidden">
        <div
          className="bg-cyan-400 h-3 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.7)] transition-all duration-1000"
          style={{ width: `${goal.progressPercent}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
        <StatusIcon className={`w-3 h-3 ${iconClassName}`} /> {goal.message}
      </p>
    </div>
  );
}
