import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import {
  daysOffScheduleFrom,
  formatDaysOffSummary,
  listScheduledDaysOffInMonth,
} from "@/lib/admin/regras/days-off";
import type { EmployeeDashboardData, StatementEntry } from "@/lib/dashboard/types";

export const DEMO_REFERENCE_MONTH = "2026-06-01";

const DEMO_DAYS_OFF = daysOffScheduleFrom({
  fixed_days_off: [0, 6],
  sunday_rule_type: "none",
  fixed_sundays: [],
  floating_sundays: [],
});

function demoToday(): StatementEntry {
  return {
    id: "2026-06-10",
    date: todayIsoDate(),
    description: "Ponto em conformidade",
    status: "compliant",
    statusLabel: "Ponto em conformidade",
    canClaim: false,
    justificationKind: null,
    claimNote: null,
    reviewNote: null,
  };
}

export function getDemoDashboard(): EmployeeDashboardData {
  const today = todayIsoDate();

  return {
    employeeName: "Gabriel",
    employeeId: null,
    referenceMonth: DEMO_REFERENCE_MONTH,
    isCurrentMonth: false,
    availableMonths: [DEMO_REFERENCE_MONTH],
    earnedAmount: 500,
    bonusCeiling: 500,
    completeWeeks: 4,
    lastTimesheetAt: "2026-06-10T18:00:00.000Z",
    daysOffSummary: formatDaysOffSummary(DEMO_DAYS_OFF),
    daysOff: listScheduledDaysOffInMonth(DEMO_REFERENCE_MONTH, DEMO_DAYS_OFF).map(
      (date) => ({
        date,
        isToday: date === today,
        isPast: date < today,
      })
    ),
    receipts: [
      {
        month: DEMO_REFERENCE_MONTH,
        amount: 500,
        kind: "closed",
        statusLabel: "A receber",
      },
    ],
    today: {
      date: today,
      isDayOff: false,
      waitingForTimesheet: false,
      canOpen: true,
      entry: demoToday(),
    },
    goals: [
      {
        id: "week-0",
        title: "1ª semana (01 a 07)",
        rewardAmount: 125,
        progressPercent: 100,
        status: "achieved",
        message: "Semana completa: sem ocorrência até agora.",
      },
      {
        id: "week-1",
        title: "2ª semana (08 a 14)",
        rewardAmount: 125,
        progressPercent: 100,
        status: "achieved",
        message: "Semana completa: sem ocorrência até agora.",
      },
      {
        id: "week-2",
        title: "3ª semana (15 a 21)",
        rewardAmount: 125,
        progressPercent: 100,
        status: "achieved",
        message: "Semana completa: sem ocorrência até agora.",
      },
      {
        id: "week-3",
        title: "4ª semana (22 a 30)",
        rewardAmount: 125,
        progressPercent: 100,
        status: "achieved",
        message: "Semana completa: sem ocorrência até agora.",
      },
    ],
    recentEntries: [
      {
        id: "2026-06-10",
        date: "2026-06-10",
        description: "Ponto em conformidade",
        status: "compliant",
        statusLabel: "Ponto em conformidade",
        canClaim: false,
        justificationKind: null,
        claimNote: null,
        reviewNote: null,
      },
      {
        id: "2026-06-08",
        date: "2026-06-08",
        description: "Atraso dentro da tolerância (4 min)",
        status: "compliant",
        statusLabel: "Atraso dentro da tolerância (4 min)",
        canClaim: false,
        justificationKind: null,
        claimNote: null,
        reviewNote: null,
      },
      {
        id: "2026-06-07",
        date: "2026-06-07",
        description: "Folga programada",
        status: "day_off",
        statusLabel: "Folga programada",
        canClaim: false,
        justificationKind: null,
        claimNote: null,
        reviewNote: null,
      },
    ],
  };
}
