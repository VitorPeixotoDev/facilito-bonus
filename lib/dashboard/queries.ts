import { getDemoDashboard } from "@/lib/dashboard/demo-data";
import { mapStatementEntries, mapWeekGoals } from "@/lib/dashboard/mappers";
import type {
  BonusReceipt,
  DayOffEntry,
  EmployeeDashboardData,
  StatementEntry,
  TodayJustification,
} from "@/lib/dashboard/types";
import {
  bonusScheduleFrom,
  explainScheduleBonus,
} from "@/lib/admin/regras/calculate-bonus";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import { asJustificationStatus, asJustificationKind } from "@/lib/admin/regras/justification";
import {
  daysOffScheduleFrom,
  formatDaysOffSummary,
  isScheduledDayOff,
  listScheduledDaysOffInMonth,
} from "@/lib/admin/regras/days-off";
import { nextUtcMonth } from "@/lib/admin/arquivos/aej-timesheet";
import { COMPANY_FILE_PURPOSES } from "@/lib/admin/arquivos/constants";
import { resolveTimesheetMonth } from "@/lib/admin/arquivos/months";
import { createClient } from "@/lib/supabase/server";
import { justificationKindColumnExists, timesheetSelect } from "@/lib/admin/arquivos/justification-kind-column";

const TIMESHEET_EVENT_SELECT =
  "id, employee_id, event_date, lateness_minutes, is_absence, is_day_off, has_manual_adjustment, justification_status, justification_claim_note, justification_review_note, notes, created_at";
const TIMESHEET_EVENT_SELECT_WITH_KIND =
  "id, employee_id, event_date, lateness_minutes, is_absence, is_day_off, has_manual_adjustment, justification_status, justification_kind, justification_claim_note, justification_review_note, notes, created_at";

export async function getEmployeeDashboard(
  monthParam?: string | string[] | null
): Promise<EmployeeDashboardData> {
  try {
    const fromSupabase = await fetchDashboardFromSupabase(monthParam);
    if (fromSupabase) {
      return fromSupabase;
    }
  } catch (error) {
    console.error("Falha ao carregar o dashboard no Supabase.", error);
  }

  return getDemoDashboard();
}

function scheduledDayOffEntry(date: string): StatementEntry {
  return {
    id: `day-off-${date}`,
    date,
    description: "Folga programada",
    status: "day_off",
    statusLabel: "Folga programada",
    canClaim: false,
    justificationKind: null,
    claimNote: null,
    reviewNote: null,
  };
}

function mapDayOffEntries(
  dates: string[],
  today: string
): DayOffEntry[] {
  return dates.map((date) => ({
    date,
    isToday: date === today,
    isPast: date < today,
  }));
}

function mapReceipts(input: {
  summaries: { reference_month: string; earned_amount: number }[];
  payouts: { reference_month: string; earned_amount: number; status: string }[];
  selectedMonth: string;
  currentMonth: string;
  selectedAmount: number | null;
}): BonusReceipt[] {
  const payoutByMonth = new Map(
    input.payouts.map((row) => [row.reference_month, row])
  );

  return [...input.summaries]
    .sort((left, right) =>
      left.reference_month.localeCompare(right.reference_month)
    )
    .map((row) => {
      const month = row.reference_month;
      const payout = payoutByMonth.get(month);
      const amount =
        month === input.selectedMonth && input.selectedAmount != null
          ? input.selectedAmount
          : Number(row.earned_amount);

      if (payout?.status === "PAID") {
        return {
          month,
          amount: Number(payout.earned_amount),
          kind: "paid" as const,
          statusLabel: "Pago",
        };
      }

      if (month < input.currentMonth) {
        return {
          month,
          amount,
          kind: "closed" as const,
          statusLabel: "A receber",
        };
      }

      return {
        month,
        amount,
        kind: "forecast" as const,
        statusLabel: "Previsão",
      };
    });
}

async function fetchDashboardFromSupabase(
  monthParam?: string | string[] | null
): Promise<EmployeeDashboardData | null> {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (typeof userId !== "string") {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select(
      "id, name, company_id, work_schedule_id, work_schedules(bonus_base_amount, absence_penalty_percent, lateness_penalty_percent, accumulated_lateness_tolerance_minutes, fixed_days_off, sunday_rule_type, fixed_sundays, floating_sundays)"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (employeeError || !employee) {
    const demo = getDemoDashboard();
    const profileName = profile?.full_name?.trim() || profile?.email;

    return profileName ? { ...demo, employeeName: profileName } : demo;
  }

  const today = todayIsoDate();

  const { data: summaries } = await supabase
    .from("timesheet_summaries")
    .select(
      "id, employee_id, reference_month, total_absences, total_lateness_minutes, manual_adjustments_count, earned_amount, created_at"
    )
    .eq("employee_id", employee.id)
    .order("reference_month", { ascending: false });

  const resolved = resolveTimesheetMonth({
    requested: monthParam,
    availableMonths: (summaries ?? []).map((row) => row.reference_month),
  });
  const latestSummary =
    (summaries ?? []).find(
      (row) => row.reference_month === resolved.selectedMonth
    ) ?? null;
  const referenceMonth = resolved.selectedMonth;
  const periodEnd = nextUtcMonth(referenceMonth);
  const hasJustificationKind = await justificationKindColumnExists(supabase);
  const eventSelect = timesheetSelect(
    hasJustificationKind,
    TIMESHEET_EVENT_SELECT_WITH_KIND,
    TIMESHEET_EVENT_SELECT
  );

  const [{ data: payouts }, { data: events }, { data: todayRow }, { data: lastFile }] =
    await Promise.all([
      supabase
        .from("payouts")
        .select("reference_month, earned_amount, status")
        .eq("employee_id", employee.id)
        .order("reference_month", { ascending: true }),
      supabase
        .from("timesheet_events")
        .select(eventSelect)
        .eq("employee_id", employee.id)
        .gte("event_date", referenceMonth)
        .lt("event_date", periodEnd)
        .order("event_date", { ascending: true }),
      supabase
        .from("timesheet_events")
        .select(eventSelect)
        .eq("employee_id", employee.id)
        .eq("event_date", today)
        .maybeSingle(),
      supabase
        .from("company_files")
        .select("created_at")
        .eq("company_id", employee.company_id)
        .eq("purpose", COMPANY_FILE_PURPOSES.ponto)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const scheduleJoin = employee.work_schedules;
  const scheduleRow = Array.isArray(scheduleJoin)
    ? scheduleJoin[0]
    : scheduleJoin;

  const schedule = scheduleRow
    ? {
        bonusBaseAmount: Number(scheduleRow.bonus_base_amount),
        absencePenaltyPercent: Number(scheduleRow.absence_penalty_percent),
        latenessPenaltyPercent: Number(scheduleRow.lateness_penalty_percent),
        accumulatedLatenessToleranceMinutes:
          scheduleRow.accumulated_lateness_tolerance_minutes,
      }
    : null;

  const daysOffSchedule = scheduleRow
    ? daysOffScheduleFrom(scheduleRow)
    : null;

  const mappedDays = (events ?? []).map((row) => ({
    id: row.id,
    eventDate: row.event_date,
    isAbsence: row.is_absence,
    isDayOff: row.is_day_off,
    latenessMinutes: row.lateness_minutes,
    justificationStatus: asJustificationStatus(row.justification_status),
    justificationKind: asJustificationKind(row.justification_kind),
    claimNote: row.justification_claim_note,
    reviewNote: row.justification_review_note,
  }));

  const breakdown = schedule
    ? explainScheduleBonus(bonusScheduleFrom(schedule), mappedDays, today)
    : null;

  const bonusCeiling = schedule?.bonusBaseAmount ?? 0;
  const earnedAmount = breakdown
    ? breakdown.total
    : Number(latestSummary?.earned_amount ?? 0);

  const recentEntries = schedule
    ? mapStatementEntries(mappedDays, schedule, today)
    : [];

  const todayMapped = todayRow
    ? schedule
      ? mapStatementEntries(
          [
            {
              id: todayRow.id,
              eventDate: todayRow.event_date,
              isAbsence: todayRow.is_absence,
              isDayOff: todayRow.is_day_off,
              latenessMinutes: todayRow.lateness_minutes,
              justificationStatus: asJustificationStatus(
                todayRow.justification_status
              ),
              justificationKind: asJustificationKind(
                todayRow.justification_kind
              ),
              claimNote: todayRow.justification_claim_note,
              reviewNote: todayRow.justification_review_note,
            },
          ],
          schedule,
          today
        )[0] ?? null
      : null
    : null;

  const todayIsDayOff = Boolean(
    todayMapped?.status === "day_off" ||
      (daysOffSchedule && isScheduledDayOff(today, daysOffSchedule))
  );
  const todayEntry =
    todayMapped ?? (todayIsDayOff ? scheduledDayOffEntry(today) : null);
  const todayCanOpen =
    !todayIsDayOff &&
    (todayEntry == null ||
      todayEntry.canClaim ||
      (todayEntry.status !== "pending" && todayEntry.status !== "justified"));

  const todayJustification: TodayJustification = {
    date: today,
    isDayOff: todayIsDayOff,
    waitingForTimesheet: !todayMapped && !todayIsDayOff,
    canOpen: todayCanOpen,
    entry: todayEntry,
  };

  return {
    employeeName: employee.name,
    employeeId: employee.id,
    referenceMonth,
    isCurrentMonth: referenceMonth === resolved.currentMonth,
    availableMonths: resolved.months,
    earnedAmount,
    bonusCeiling,
    completeWeeks: breakdown?.completeWeeks ?? 0,
    lastTimesheetAt: lastFile?.created_at ?? null,
    daysOffSummary: daysOffSchedule
      ? formatDaysOffSummary(daysOffSchedule)
      : "Sem regra de folga atribuída",
    daysOff: mapDayOffEntries(
      daysOffSchedule
        ? listScheduledDaysOffInMonth(referenceMonth, daysOffSchedule)
        : [],
      today
    ),
    receipts: mapReceipts({
      summaries: summaries ?? [],
      payouts: payouts ?? [],
      selectedMonth: referenceMonth,
      currentMonth: resolved.currentMonth,
      selectedAmount: breakdown ? breakdown.total : earnedAmount,
    }),
    today: todayJustification,
    goals: breakdown ? mapWeekGoals(breakdown.weeks, bonusCeiling) : [],
    recentEntries,
  };
}
