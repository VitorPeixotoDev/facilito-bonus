import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Plus } from "lucide-react";
import {
  formatSignedPercentFromRate,
} from "@/lib/admin/regras/numbers";
import { formatDaysOffSummary } from "@/lib/admin/regras/days-off";
import {
  formatMinutesAsHours,
  formatScheduleShifts,
} from "@/lib/admin/regras/schedule";
import { WorkScheduleActions } from "@/components/admin/work-schedule-actions";
import type { WorkSchedule } from "@/lib/admin/regras/types";
import { formatCurrencyBRL } from "@/lib/dashboard/formatters";

type WorkSchedulesPanelProps = {
  schedules: WorkSchedule[];
};

export function WorkSchedulesPanel({ schedules }: WorkSchedulesPanelProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          {schedules.length === 1
            ? "1 escala cadastrada"
            : `${schedules.length} escalas cadastradas`}
        </p>
        <Link
          href="/admin/regras/nova"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
        >
          <Plus className="h-4 w-4" />
          Nova escala
        </Link>
      </div>

      {schedules.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-700/60 bg-slate-800/40 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
            <Clock className="h-6 w-6 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Nenhuma escala cadastrada
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Crie o padrão de jornada usado para interpretar as batidas do AEJ e
            Crie o padrão de jornada usado para interpretar as batidas do AEJ e
            calcular atrasos, faltas e folgas programadas.
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {schedules.map((schedule) => (
            <li
              key={schedule.id}
              className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Código {schedule.code}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {schedule.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatScheduleShifts({
                      entry1: schedule.entry1,
                      exit1: schedule.exit1,
                      entry2: schedule.entry2,
                      exit2: schedule.exit2,
                    })}
                  </p>
                  <p className="mt-1 text-sm text-violet-300">
                    {formatDaysOffSummary(schedule)}
                  </p>
                  <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">Valor base (teto)</dt>
                      <dd className="font-medium text-slate-200">
                        {formatCurrencyBRL(schedule.bonusBaseAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Falta injustificada</dt>
                      <dd className="font-medium text-rose-300">
                        {formatSignedPercentFromRate(
                          schedule.absencePenaltyPercent,
                          "-"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Atraso injustificado</dt>
                      <dd className="font-medium text-rose-300">
                        {formatSignedPercentFromRate(
                          schedule.latenessPenaltyPercent,
                          "-"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        Tolerância diária de atraso
                      </dt>
                      <dd className="font-medium text-slate-200">
                        {schedule.accumulatedLatenessToleranceMinutes} min
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {formatMinutesAsHours(schedule.workloadMinutes)}{" "}
                      <span className="font-normal text-cyan-400">
                        ({schedule.workloadMinutes} min)
                      </span>
                    </p>
                    {schedule.isNightShift ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400/10 px-2.5 py-1 text-xs text-yellow-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Noturno
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Diurno
                      </span>
                    )}
                  </div>
                  <WorkScheduleActions schedule={schedule} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
