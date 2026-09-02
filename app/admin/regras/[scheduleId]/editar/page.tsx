import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { WorkScheduleForm } from "@/components/admin/work-schedule-form";
import { getWorkSchedule } from "@/lib/admin/regras/queries";

export default async function EditarEscalaPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const schedule = await getWorkSchedule(scheduleId);

  if (!schedule) {
    notFound();
  }

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
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          Código {schedule.code}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Editar escala</h1>
        <p className="mt-2 max-w-xl text-slate-400">
          Altere os horários, as folgas programadas, as variáveis de
          bonificação e as regras customizadas desta escala. O código da
          jornada permanece o mesmo.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <WorkScheduleForm schedule={schedule} />
      </section>
    </div>
  );
}
