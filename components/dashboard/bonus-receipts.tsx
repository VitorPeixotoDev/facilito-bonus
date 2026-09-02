import { Banknote } from "lucide-react";
import {
  formatCurrencyBRL,
  formatMonthYear,
} from "@/lib/dashboard/formatters";
import type { BonusReceipt } from "@/lib/dashboard/types";

type BonusReceiptsProps = {
  receipts: BonusReceipt[];
};

function kindClass(kind: BonusReceipt["kind"]) {
  switch (kind) {
    case "paid":
      return "text-emerald-300";
    case "forecast":
      return "text-cyan-300";
    default:
      return "text-slate-200";
  }
}

export function BonusReceipts({ receipts }: BonusReceiptsProps) {
  return (
    <section className="rounded-3xl border border-slate-700/50 bg-slate-800/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-cyan-400/10 p-2.5">
          <Banknote className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Recebimentos</h2>
          <p className="text-xs text-slate-400">
            Histórico fechado e previsão do mês em andamento.
          </p>
        </div>
      </div>

      {receipts.length === 0 ? (
        <p className="text-sm text-slate-400">
          Ainda não há bônus calculado. Ele entra aqui quando o RH enviar a
          folha de ponto.
        </p>
      ) : (
        <ul className="divide-y divide-slate-700/60">
          {receipts.map((receipt) => (
            <li
              key={receipt.month}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {formatMonthYear(receipt.month)}
                </p>
                <p className="text-xs text-slate-500">{receipt.statusLabel}</p>
              </div>
              <p className={`text-sm font-semibold ${kindClass(receipt.kind)}`}>
                {formatCurrencyBRL(receipt.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
