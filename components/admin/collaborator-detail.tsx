import Link from "next/link";
import {
  ArrowLeft,
  CalendarOff,
  Clock,
  Gift,
  UserRound,
} from "lucide-react";
import { TimesheetJustificationActions } from "@/components/admin/timesheet-justification-actions";
import { TimesheetNotificationMarkers } from "@/components/admin/timesheet-notification-markers";
import { TimesheetMonthNav } from "@/components/timesheet/timesheet-month-nav";
import { timesheetMonthHref } from "@/lib/admin/arquivos/months";
import { startOfMonth } from "@/lib/admin/arquivos/aej-timesheet";
import {
  bonusScheduleFrom,
  dayBonusStatus,
} from "@/lib/admin/regras/calculate-bonus";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import { justificationKindLabel } from "@/lib/admin/regras/justification";
import { formatDaysOffSummary } from "@/lib/admin/regras/days-off";
import { formatPercentFromRate } from "@/lib/admin/regras/numbers";
import {
  formatMinutesAsHours,
  formatScheduleShifts,
} from "@/lib/admin/regras/schedule";
import type {
  CollaboratorDetail,
  CollaboratorTimesheetEvent,
} from "@/lib/admin/arquivos/types";
import {
  formatCurrencyBRL,
  formatMonthYear,
  formatSignedCurrencyBRL,
  formatStatementDate,
} from "@/lib/dashboard/formatters";
import { maskCpf } from "@/lib/onboarding/documents";

function inviteStatus(person: CollaboratorDetail) {
  if (person.hasUser) {
    return "Conta vinculada";
  }

  if (person.invitedAt) {
    return `Convite enviado em ${formatDateTime(person.invitedAt)}`;
  }

  return "Convite pendente";
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function breakdownLineAmount(
  line: { amount: number },
  earnedAmount: number
) {
  if (earnedAmount <= 0 && line.amount < 0) {
    return 0;
  }

  return line.amount;
}

function timesheetMarkersFromEvents(events: CollaboratorTimesheetEvent[]) {
  let pendingAbsenceJustificationCount = 0;
  let pendingLatenessJustificationCount = 0;
  let pendingJustificationCount = 0;
  let absenceCount = 0;
  let justifiedAbsenceCount = 0;
  let toleranceAlertCount = 0;

  for (const event of events) {
    if (event.isDayOff) {
      continue;
    }

    if (event.isAbsence) {
      if (event.justificationStatus === "justified") {
        justifiedAbsenceCount += 1;
      } else {
        absenceCount += 1;
      }
    } else if (event.latenessMinutes > 0 || event.hasManualAdjustment) {
      toleranceAlertCount += 1;
    }

    if (event.justificationStatus === "pending") {
      pendingJustificationCount += 1;

      if (event.justificationKind === "absence") {
        pendingAbsenceJustificationCount += 1;
      } else if (event.justificationKind === "lateness") {
        pendingLatenessJustificationCount += 1;
      }
    }
  }

  return {
    toleranceAlertCount,
    absenceCount,
    justifiedAbsenceCount,
    pendingJustificationCount,
    pendingAbsenceJustificationCount,
    pendingLatenessJustificationCount,
  };
}

function eventTone(kind: string) {
  if (kind === "day_off") {
    return {
      className: "text-violet-300",
      itemClassName: "border-violet-400/40 bg-violet-400/5",
    };
  }

  if (kind === "future" || kind === "compliant" || kind === "late_within_tolerance") {
    return {
      className: "text-cyan-400",
      itemClassName: "border-slate-700/40 bg-slate-900/40",
    };
  }

  if (kind.endsWith("_justified")) {
    return {
      className: "text-emerald-300",
      itemClassName: "border-emerald-400/40 bg-emerald-400/5",
    };
  }

  if (kind.endsWith("_pending")) {
    return {
      className: "text-amber-300",
      itemClassName: "border-amber-400/40 bg-amber-400/5",
    };
  }

  return {
    className: "text-rose-400",
    itemClassName: "border-rose-400/40 bg-rose-400/5",
  };
}

type CollaboratorDetailViewProps = {
  collaborator: CollaboratorDetail;
};

export function CollaboratorDetailView({
  collaborator,
}: CollaboratorDetailViewProps) {
  const schedule = collaborator.workSchedule;
  const bonus = collaborator.latestBonus;
  const today = todayIsoDate();
  const currentMonth = startOfMonth(today);
  const monthBasePath = `/admin/colaboradores/${collaborator.id}`;
  const rulesChanged =
    bonus !== null &&
    bonus.lines.length > 0 &&
    Math.abs(bonus.breakdownTotal - bonus.earnedAmount) > 0.009;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <Link
          href={timesheetMonthHref(
            "/admin/colaboradores",
            collaborator.selectedMonth
          )}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para colaboradores
        </Link>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <UserRound className="h-6 w-6 text-cyan-400" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {collaborator.isAdmin ? "Administrador" : "Colaborador"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {collaborator.name}
        </h1>
        <p className="mt-2 font-mono text-cyan-300">{maskCpf(collaborator.cpf)}</p>
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <h2 className="text-lg font-semibold text-white">Dados cadastrais</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Cargo</dt>
            <dd className="mt-1 text-sm text-slate-200">
              {collaborator.jobTitle ?? "Não atribuído"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Convite</dt>
            <dd className="mt-1 text-sm text-slate-200">
              {inviteStatus(collaborator)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Cadastrado em</dt>
            <dd className="mt-1 text-sm text-slate-200">
              {formatDateTime(collaborator.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Perfil</dt>
            <dd className="mt-1 text-sm text-slate-200">
              {collaborator.isAdmin ? "Administrador da empresa" : "Colaborador"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10">
          <Clock className="h-5 w-5 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Regra atribuída</h2>
        {schedule ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Código {schedule.code}
              </p>
              <p className="mt-1 text-base font-medium text-white">
                {schedule.name}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {formatScheduleShifts(schedule)} ·{" "}
                {formatMinutesAsHours(schedule.workloadMinutes)}
                {schedule.isNightShift ? " · turno noturno" : ""}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-violet-300">
                <CalendarOff className="h-3.5 w-3.5" />
                {formatDaysOffSummary(schedule)}
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Teto do bônus</dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {formatCurrencyBRL(schedule.bonusBaseAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  Falta sem justificativa
                </dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {formatPercentFromRate(schedule.absencePenaltyPercent)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  Atraso sem justificativa
                </dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {formatPercentFromRate(schedule.latenessPenaltyPercent)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  Tolerância diária de atraso
                </dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {schedule.accumulatedLatenessToleranceMinutes} min
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Nenhuma escala atribuída. O bônus só é calculado depois da regra e
            do acompanhamento de ponto.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10">
          <Gift className="h-5 w-5 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Bônus</h2>
        <div className="mt-4">
          <TimesheetMonthNav
            selectedMonth={collaborator.selectedMonth}
            currentMonth={currentMonth}
            availableMonths={collaborator.availableMonths}
            basePath={monthBasePath}
            persistMonth
          />
        </div>
        {bonus ? (
          <div className="mt-4 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-3xl font-bold text-emerald-300">
                  {formatCurrencyBRL(bonus.earnedAmount)}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Semanas completas</dt>
                  <dd className="font-medium text-slate-200">
                    {bonus.completeWeeks}/4
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Faltas injustificadas</dt>
                  <dd className="font-medium text-slate-200">
                    {bonus.unjustifiedAbsences}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Atrasos injustificados</dt>
                  <dd className="font-medium text-slate-200">
                    {bonus.unjustifiedLateDays}
                  </dd>
                </div>
              </dl>
            </div>

            {bonus.weeks.length > 0 ? (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {bonus.weeks.map((week) => (
                  <li
                    key={week.index}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-white">
                      {week.title} ({week.rangeLabel})
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {week.complete
                        ? "Completa — 25% do teto"
                        : "Incompleta — ocorrência no período"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            {bonus.lines.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Como o valor foi calculado
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  O teto é o valor base. Semanas sem ocorrência valem 25% cada;
                  punições de falta e atraso incidem no mês inteiro, com
                  retroatividade.
                </p>
                <ul className="mt-4 divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-700/50">
                  {bonus.lines
                    .filter((line) => line.id !== "floor")
                    .map((line) => {
                      const amount = breakdownLineAmount(
                        line,
                        bonus.earnedAmount
                      );

                      return (
                        <li
                          key={line.id}
                          className="flex flex-col gap-1 bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {line.label}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {line.detail}
                            </p>
                          </div>
                          <p
                            className={`shrink-0 text-sm font-semibold ${
                              amount > 0
                                ? "text-emerald-300"
                                : amount < 0
                                  ? "text-rose-300"
                                  : "text-slate-500"
                            }`}
                          >
                            {line.applied && amount !== 0
                              ? formatSignedCurrencyBRL(amount)
                              : formatCurrencyBRL(0)}
                          </p>
                        </li>
                      );
                    })}
                  <li className="flex items-center justify-between bg-slate-900 px-4 py-3">
                    <p className="text-sm font-semibold text-white">Total</p>
                    <p className="text-sm font-bold text-emerald-300">
                      {formatCurrencyBRL(bonus.earnedAmount)}
                    </p>
                  </li>
                </ul>
                {rulesChanged ? (
                  <p className="mt-3 text-xs text-amber-300">
                    A regra atual recalcularia {formatCurrencyBRL(bonus.breakdownTotal)}.
                    O valor gravado no ponto permanece {formatCurrencyBRL(bonus.earnedAmount)}.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Não há regra atribuída para detalhar este cálculo. O valor
                gravado no acompanhamento de ponto é{" "}
                {formatCurrencyBRL(bonus.earnedAmount)}.
              </p>
            )}

            {collaborator.previousBonuses.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Meses anteriores
                </h3>
                <ul className="mt-3 space-y-2">
                  {collaborator.previousBonuses.map((period) => (
                    <li
                      key={period.referenceMonth}
                      className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-sm"
                    >
                      <Link
                        href={timesheetMonthHref(monthBasePath, period.referenceMonth)}
                        className="text-cyan-300 transition hover:text-cyan-200"
                      >
                        {formatMonthYear(period.referenceMonth)}
                      </Link>
                      <span className="font-medium text-emerald-300">
                        {formatCurrencyBRL(period.earnedAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Nenhum bônus calculado para {formatMonthYear(collaborator.selectedMonth)}
            {collaborator.isCurrentMonth ? " ainda" : ""}. Envie a folha de ponto
            depois de atribuir a regra.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            Ponto de {formatMonthYear(collaborator.selectedMonth)}
            {collaborator.isCurrentMonth ? " (mês atual)" : ""}
          </h2>
          <TimesheetNotificationMarkers
            collaborator={timesheetMarkersFromEvents(collaborator.events)}
          />
        </div>
        {collaborator.events.length > 0 ? (
          <ul className="mt-4 max-h-112 space-y-2 overflow-auto">
            {collaborator.events.map((event) => {
              const status = schedule
                ? dayBonusStatus(
                    {
                      eventDate: event.eventDate,
                      isDayOff: event.isDayOff,
                      isAbsence: event.isAbsence,
                      latenessMinutes: event.latenessMinutes,
                      justificationStatus: event.justificationStatus,
                      justificationKind: event.justificationKind,
                    },
                    bonusScheduleFrom(schedule),
                    today
                  )
                : {
                    kind: event.isDayOff
                      ? "day_off"
                      : event.isAbsence
                        ? "absence_unjustified"
                        : "compliant",
                    label: event.notes ?? "Ponto",
                  };
              const tone = eventTone(status.kind);

              return (
                <li
                  key={event.id}
                  className={`rounded-2xl border px-4 py-3 ${tone.itemClassName}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {formatStatementDate(event.eventDate)}
                      </p>
                      {event.justificationKind &&
                      event.justificationStatus !== "unjustified" ? (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {justificationKindLabel(event.justificationKind)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {event.notes}
                      </p>
                    </div>
                    <p className={`shrink-0 text-xs font-medium ${tone.className}`}>
                      {status.label}
                    </p>
                  </div>
                  {schedule ? (
                    <TimesheetJustificationActions
                      event={event}
                      schedule={schedule}
                      justificationReasons={collaborator.justificationReasons}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Nenhum dia de ponto neste mês ainda. Envios semanais ou diários
            entram neste histórico assim que o TXT for enviado.
          </p>
        )}
      </section>
    </div>
  );
}
