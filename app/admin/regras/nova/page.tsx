import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { WorkScheduleForm } from "@/components/admin/work-schedule-form";

export default function NovaEscalaPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <Link
          href="/admin/regras"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para escalas
        </Link>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <Clock className="h-6 w-6 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Nova escala de trabalho</h1>
        <p className="mt-2 max-w-xl text-slate-400">
          Configure os horários usados nos arquivos AEJ, as folgas da escala,
          as variáveis do plano e regras customizadas de recompensa. O código
          da jornada é gerado automaticamente.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <WorkScheduleForm />
      </section>
    </div>
  );
}
