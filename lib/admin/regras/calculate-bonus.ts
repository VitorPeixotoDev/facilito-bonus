import {
  BONUS_WEEK_COUNT,
  BONUS_WEEK_SHARE,
  bonusWeekIndex,
  bonusWeekRangeLabel,
  bonusWeekTitle,
  type BonusWeekIndex,
} from "@/lib/admin/regras/bonus-weeks";
import {
  isJustified,
  type JustificationKind,
  type JustificationStatus,
} from "@/lib/admin/regras/justification";
import { formatPercentFromRate } from "@/lib/admin/regras/numbers";

export type BonusDayInput = {
  eventDate: string;
  isDayOff: boolean;
  isAbsence: boolean;
  latenessMinutes: number;
  justificationStatus: JustificationStatus;
  justificationKind?: JustificationKind | null;
};

export type BonusScheduleInput = {
  bonusBaseAmount: number;
  absencePenaltyPercent: number;
  latenessPenaltyPercent: number;
  dailyLatenessToleranceMinutes: number;
};

export function bonusScheduleFrom(schedule: {
  bonusBaseAmount: number;
  absencePenaltyPercent: number;
  latenessPenaltyPercent: number;
  accumulatedLatenessToleranceMinutes: number;
}): BonusScheduleInput {
  return {
    bonusBaseAmount: schedule.bonusBaseAmount,
    absencePenaltyPercent: schedule.absencePenaltyPercent,
    latenessPenaltyPercent: schedule.latenessPenaltyPercent,
    dailyLatenessToleranceMinutes: schedule.accumulatedLatenessToleranceMinutes,
  };
}

export type BonusDayKind =
  | "future"
  | "day_off"
  | "compliant"
  | "late_within_tolerance"
  | "late_unjustified"
  | "late_pending"
  | "late_justified"
  | "late_rejected"
  | "absence_unjustified"
  | "absence_pending"
  | "absence_justified"
  | "absence_rejected";

export type BonusDayStatus = {
  kind: BonusDayKind;
  label: string;
  isOccurrence: boolean;
  isClaimable: boolean;
  isLateInfraction: boolean;
};

export type BonusBreakdownLine = {
  id: string;
  label: string;
  applied: boolean;
  amount: number;
  detail: string;
};

export type BonusWeekBreakdown = {
  index: BonusWeekIndex;
  title: string;
  rangeLabel: string;
  complete: boolean;
  occurrenceDates: string[];
  shareAmount: number;
};

export type BonusBreakdown = {
  lines: BonusBreakdownLine[];
  weeks: BonusWeekBreakdown[];
  completeWeeks: number;
  weekShare: number;
  unjustifiedAbsences: number;
  unjustifiedLateDays: number;
  penaltyRate: number;
  remainingRate: number;
  total: number;
};

function isFutureDay(isoDate: string, today: string): boolean {
  return isoDate > today;
}

export function isLateInfraction(
  day: Pick<BonusDayInput, "isDayOff" | "isAbsence" | "latenessMinutes">,
  dailyToleranceMinutes: number
): boolean {
  return (
    !day.isDayOff &&
    !day.isAbsence &&
    day.latenessMinutes > dailyToleranceMinutes
  );
}

function absenceBonusStatus(status: JustificationStatus): BonusDayStatus {
  if (status === "justified") {
    return {
      kind: "absence_justified",
      label: "Falta justificada",
      isOccurrence: false,
      isClaimable: false,
      isLateInfraction: false,
    };
  }

  if (status === "pending") {
    return {
      kind: "absence_pending",
      label: "Falta aguardando análise",
      isOccurrence: true,
      isClaimable: false,
      isLateInfraction: false,
    };
  }

  if (status === "rejected") {
    return {
      kind: "absence_rejected",
      label: "Falta com justificativa recusada",
      isOccurrence: true,
      isClaimable: true,
      isLateInfraction: false,
    };
  }

  return {
    kind: "absence_unjustified",
    label: "Falta sem justificativa",
    isOccurrence: true,
    isClaimable: true,
    isLateInfraction: false,
  };
}

function latenessBonusStatus(
  status: JustificationStatus,
  minutes: number
): BonusDayStatus {
  const minutesLabel = minutes > 0 ? ` (${minutes} min)` : "";

  if (status === "justified") {
    return {
      kind: "late_justified",
      label: `Atraso justificado${minutesLabel}`,
      isOccurrence: false,
      isClaimable: false,
      isLateInfraction: true,
    };
  }

  if (status === "pending") {
    return {
      kind: "late_pending",
      label: `Atraso aguardando análise${minutesLabel}`,
      isOccurrence: true,
      isClaimable: false,
      isLateInfraction: true,
    };
  }

  if (status === "rejected") {
    return {
      kind: "late_rejected",
      label: `Atraso com justificativa recusada${minutesLabel}`,
      isOccurrence: true,
      isClaimable: true,
      isLateInfraction: true,
    };
  }

  return {
    kind: "late_unjustified",
    label: `Atraso sem justificativa${minutesLabel}`,
    isOccurrence: true,
    isClaimable: true,
    isLateInfraction: true,
  };
}

export function dayBonusStatus(
  day: BonusDayInput,
  schedule: Pick<BonusScheduleInput, "dailyLatenessToleranceMinutes">,
  today: string
): BonusDayStatus {
  if (isFutureDay(day.eventDate, today)) {
    return {
      kind: "future",
      label: "Dia ainda não ocorrido",
      isOccurrence: false,
      isClaimable: false,
      isLateInfraction: false,
    };
  }

  if (day.isDayOff) {
    return {
      kind: "day_off",
      label: "Folga programada",
      isOccurrence: false,
      isClaimable: false,
      isLateInfraction: false,
    };
  }

  if (day.isAbsence) {
    return absenceBonusStatus(day.justificationStatus);
  }

  const lateInfraction = isLateInfraction(
    day,
    schedule.dailyLatenessToleranceMinutes
  );

  if (lateInfraction) {
    return latenessBonusStatus(day.justificationStatus, day.latenessMinutes);
  }

  if (day.justificationStatus !== "unjustified") {
    if (day.justificationKind === "absence") {
      return absenceBonusStatus(day.justificationStatus);
    }

    if (day.justificationKind === "lateness") {
      return latenessBonusStatus(day.justificationStatus, day.latenessMinutes);
    }
  }

  if (day.latenessMinutes > 0) {
    return {
      kind: "late_within_tolerance",
      label: `Atraso dentro da tolerância (${day.latenessMinutes} min)`,
      isOccurrence: false,
      isClaimable: false,
      isLateInfraction: false,
    };
  }

  return {
    kind: "compliant",
    label: "Ponto em conformidade",
    isOccurrence: false,
    isClaimable: false,
    isLateInfraction: false,
  };
}

function money(value: number): number {
  return Number(value.toFixed(2));
}

export function explainScheduleBonus(
  schedule: BonusScheduleInput,
  days: BonusDayInput[],
  today: string
): BonusBreakdown {
  const lines: BonusBreakdownLine[] = [];
  const weekDays: BonusDayInput[][] = [[], [], [], []];

  for (const day of days) {
    weekDays[bonusWeekIndex(day.eventDate)].push(day);
  }

  const referenceMonth = days[0]?.eventDate ?? today;
  const weeks: BonusWeekBreakdown[] = [];
  let completeWeeks = 0;

  for (let index = 0; index < BONUS_WEEK_COUNT; index += 1) {
    const weekIndex = index as BonusWeekIndex;
    const occurrenceDates = weekDays[weekIndex]
      .filter(
        (day) => dayBonusStatus(day, schedule, today).isOccurrence
      )
      .map((day) => day.eventDate);
    const complete = weekDays[weekIndex].length > 0 && occurrenceDates.length === 0;
    const shareAmount = complete
      ? money(schedule.bonusBaseAmount * BONUS_WEEK_SHARE)
      : 0;

    if (complete) {
      completeWeeks += 1;
    }

    weeks.push({
      index: weekIndex,
      title: bonusWeekTitle(weekIndex),
      rangeLabel: bonusWeekRangeLabel(weekIndex, referenceMonth),
      complete,
      occurrenceDates,
      shareAmount,
    });
  }

  const weekShare = completeWeeks * BONUS_WEEK_SHARE;
  let amount = money(schedule.bonusBaseAmount * weekShare);

  lines.push({
    id: "ceiling",
    label: "Teto do bônus (valor base)",
    applied: true,
    amount: 0,
    detail: `Máximo do mês: ${schedule.bonusBaseAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Quatro semanas de 25% cada.`,
  });

  weeks.forEach((week) => {
    lines.push({
      id: `week-${week.index}`,
      label: `${week.title} (${week.rangeLabel})`,
      applied: week.complete,
      amount: week.shareAmount,
      detail: week.complete
        ? "Sem ocorrência até agora: semana completa."
        : week.occurrenceDates.length > 0
          ? `Ocorrência em ${week.occurrenceDates
              .map((date) => date.slice(8, 10))
              .join(", ")}: semana incompleta, com efeito retroativo no mês.`
          : "Ainda sem ponto importado nesta semana.",
    });
  });

  let unjustifiedAbsences = 0;
  let unjustifiedLateDays = 0;

  for (const day of days) {
    const status = dayBonusStatus(day, schedule, today);

    if (!status.isOccurrence) {
      continue;
    }

    if (day.isAbsence) {
      unjustifiedAbsences += 1;
    } else if (status.isLateInfraction) {
      unjustifiedLateDays += 1;
    }
  }

  const absencePenaltyAmount = money(
    schedule.bonusBaseAmount *
      unjustifiedAbsences *
      schedule.absencePenaltyPercent
  );
  const latenessPenaltyAmount = money(
    schedule.bonusBaseAmount *
      unjustifiedLateDays *
      schedule.latenessPenaltyPercent
  );

  if (unjustifiedAbsences > 0) {
    amount -= absencePenaltyAmount;
  }

  lines.push({
    id: "absence-penalty",
    label: `Faltas sem justificativa (${formatPercentFromRate(schedule.absencePenaltyPercent)} cada)`,
    applied: unjustifiedAbsences > 0,
    amount: unjustifiedAbsences > 0 ? -absencePenaltyAmount : 0,
    detail:
      unjustifiedAbsences === 0
        ? "Nenhuma falta injustificada no mês."
        : `${unjustifiedAbsences === 1 ? "1 falta" : `${unjustifiedAbsences} faltas`} injustificada(s). A punição incide sobre o mês inteiro, com retroatividade.`,
  });

  if (unjustifiedLateDays > 0) {
    amount -= latenessPenaltyAmount;
  }

  lines.push({
    id: "lateness-penalty",
    label: `Atrasos acima da tolerância sem justificativa (${formatPercentFromRate(schedule.latenessPenaltyPercent)} cada)`,
    applied: unjustifiedLateDays > 0,
    amount: unjustifiedLateDays > 0 ? -latenessPenaltyAmount : 0,
    detail:
      unjustifiedLateDays === 0
        ? `Nenhum atraso acima de ${schedule.dailyLatenessToleranceMinutes} min sem justificativa.`
        : `${unjustifiedLateDays === 1 ? "1 atraso" : `${unjustifiedLateDays} atrasos`} acima da tolerância diária de ${schedule.dailyLatenessToleranceMinutes} min. A punição incide sobre o mês inteiro, com retroatividade.`,
  });

  const total = Math.max(0, money(amount));
  const penaltyRate =
    unjustifiedAbsences * schedule.absencePenaltyPercent +
    unjustifiedLateDays * schedule.latenessPenaltyPercent;
  const remainingRate = Math.max(0, weekShare - penaltyRate);

  return {
    lines,
    weeks,
    completeWeeks,
    weekShare,
    unjustifiedAbsences,
    unjustifiedLateDays,
    penaltyRate,
    remainingRate,
    total,
  };
}

export function calculateScheduleBonus(
  schedule: BonusScheduleInput,
  days: BonusDayInput[],
  today: string
): number {
  return explainScheduleBonus(schedule, days, today).total;
}

export function timesheetDayNotes(input: {
  isAbsence: boolean;
  isDayOff?: boolean;
  latenessMinutes: number;
  hasManualAdjustment: boolean;
  hasPunchesOnDayOff?: boolean;
  justificationStatus?: JustificationStatus;
  justificationKind?: JustificationKind | null;
  isFuture?: boolean;
}): string {
  if (input.isFuture) {
    return "Dia ainda não ocorrido";
  }

  if (input.isDayOff) {
    return input.hasPunchesOnDayOff
      ? "Folga programada (há marcações no ponto)"
      : "Folga programada";
  }

  const status = input.justificationStatus ?? "unjustified";
  const claimedAbsence =
    input.isAbsence ||
    (input.justificationKind === "absence" && status !== "unjustified");
  const claimedLateness =
    input.latenessMinutes > 0 ||
    (input.justificationKind === "lateness" && status !== "unjustified");

  if (claimedAbsence) {
    if (isJustified(status)) {
      return "Falta justificada";
    }

    if (status === "pending") {
      return "Falta aguardando análise";
    }

    if (status === "rejected") {
      return "Falta com justificativa recusada";
    }

    return "Falta sem justificativa";
  }

  if (claimedLateness) {
    const minutesLabel =
      input.latenessMinutes > 0 ? ` (${input.latenessMinutes} min)` : "";

    if (isJustified(status)) {
      return `Atraso justificado${minutesLabel}`;
    }

    if (status === "pending") {
      return `Atraso aguardando análise${minutesLabel}`;
    }

    if (status === "rejected") {
      return `Atraso com justificativa recusada${minutesLabel}`;
    }

    return `Atraso na entrada${minutesLabel}`;
  }

  if (input.hasManualAdjustment) {
    return "Ajuste manual de ponto";
  }

  return "Ponto em conformidade";
}
