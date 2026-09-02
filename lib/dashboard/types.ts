import type { JustificationKind } from "@/lib/admin/regras/justification";

export type GoalStatus = "achieved" | "warning" | "at_risk";

export type StatementStatus =
  | "compliant"
  | "warning"
  | "day_off"
  | "future"
  | "pending"
  | "justified";

export type GoalProgress = {
  id: string;
  title: string;
  rewardAmount: number;
  progressPercent: number;
  status: GoalStatus;
  message: string;
};

export type StatementEntry = {
  id: string;
  date: string;
  description: string;
  status: StatementStatus;
  statusLabel: string;
  canClaim: boolean;
  justificationKind: JustificationKind | null;
  claimNote: string | null;
  reviewNote: string | null;
};

export type BonusReceiptKind = "paid" | "closed" | "forecast";

export type BonusReceipt = {
  month: string;
  amount: number;
  kind: BonusReceiptKind;
  statusLabel: string;
};

export type DayOffEntry = {
  date: string;
  isToday: boolean;
  isPast: boolean;
};

export type TodayJustification = {
  date: string;
  isDayOff: boolean;
  waitingForTimesheet: boolean;
  canOpen: boolean;
  entry: StatementEntry | null;
};

export type EmployeeDashboardData = {
  employeeName: string;
  employeeId: string | null;
  referenceMonth: string;
  isCurrentMonth: boolean;
  availableMonths: string[];
  earnedAmount: number;
  bonusCeiling: number;
  completeWeeks: number;
  lastTimesheetAt: string | null;
  daysOffSummary: string;
  daysOff: DayOffEntry[];
  receipts: BonusReceipt[];
  today: TodayJustification;
  goals: GoalProgress[];
  recentEntries: StatementEntry[];
};
