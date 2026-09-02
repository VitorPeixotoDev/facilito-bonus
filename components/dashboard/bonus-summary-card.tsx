import { TrendingUp } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/dashboard/formatters";

type BonusSummaryCardProps = {
  amount: number;
};

export function BonusSummaryCard({ amount }: BonusSummaryCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
      <div className="p-3 bg-cyan-400/10 rounded-xl">
        <TrendingUp className="text-cyan-400 w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-400 font-medium">Estimativa do mês</p>
        <p className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
          {formatCurrencyBRL(amount)}
        </p>
      </div>
    </div>
  );
}
