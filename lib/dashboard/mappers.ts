import {
  bonusScheduleFrom,
  dayBonusStatus,
  type BonusDayKind,
  type BonusWeekBreakdown,
} from "@/lib/admin/regras/calculate-bonus";
import {
  inferJustificationKind,
  type JustificationKind,
  type JustificationStatus,
} from "@/lib/admin/regras/justification";
import type {
  GoalProgress,
  StatementEntry,
  StatementStatus,
} from "@/lib/dashboard/types";

function statementStatusFromKind(kind: BonusDayKind): StatementStatus {
  if (kind === "day_off") {
    return "day_off";
  }

  if (kind === "future") {
    return "future";
  }

  if (kind.endsWith("_justified")) {
    return "justified";
  }

  if (kind.endsWith("_pending")) {
    return "pending";
  }

  if (kind === "compliant" || kind === "late_within_tolerance") {
    return "compliant";
  }

  return "warning";
}

export function mapWeekGoals(
  weeks: BonusWeekBreakdown[],
  bonusCeiling: number
): GoalProgress[] {
  return weeks.map((week) => ({
    id: `week-${week.index}`,
    title: `${week.title} (${week.rangeLabel})`,
    rewardAmount: Number((bonusCeiling * 0.25).toFixed(2)),
    progressPercent: week.complete ? 100 : 0,
    status: week.complete ? "achieved" : "at_risk",
    message: week.complete
      ? "Semana completa: sem ocorrência até agora."
      : "Semana incompleta: a punição vale para o mês inteiro.",
  }));
}

export function mapStatementEntries(
  events: {
    id: string;
    eventDate: string;
    isAbsence: boolean;
    isDayOff: boolean;
    latenessMinutes: number;
    justificationStatus: JustificationStatus;
    justificationKind?: JustificationKind | null;
    claimNote?: string | null;
    reviewNote?: string | null;
  }[],
  schedule: {
    bonusBaseAmount: number;
    absencePenaltyPercent: number;
    latenessPenaltyPercent: number;
    accumulatedLatenessToleranceMinutes: number;
  },
  today: string
): StatementEntry[] {
  const mapped = bonusScheduleFrom(schedule);

  return events.map((event) => {
    const status = dayBonusStatus(
      {
        eventDate: event.eventDate,
        isDayOff: event.isDayOff,
        isAbsence: event.isAbsence,
        latenessMinutes: event.latenessMinutes,
        justificationStatus: event.justificationStatus,
        justificationKind: event.justificationKind ?? null,
      },
      mapped,
      today
    );

    return {
      id: event.id,
      date: event.eventDate,
      description: status.label,
      status: statementStatusFromKind(status.kind),
      statusLabel: status.label,
      canClaim: status.isClaimable,
      justificationKind: inferJustificationKind({
        kind: event.justificationKind,
        isAbsence: event.isAbsence,
        latenessMinutes: event.latenessMinutes,
      }),
      claimNote: event.claimNote ?? null,
      reviewNote: event.reviewNote ?? null,
    };
  });
}
