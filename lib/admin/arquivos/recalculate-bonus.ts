import {
  bonusScheduleFrom,
  explainScheduleBonus,
  type BonusDayInput,
} from "@/lib/admin/regras/calculate-bonus";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import { asJustificationKind, asJustificationStatus } from "@/lib/admin/regras/justification";
import { justificationKindColumnExists, timesheetSelect } from "@/lib/admin/arquivos/justification-kind-column";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppSupabaseClient = SupabaseClient<Database>;

export async function persistEmployeeMonthBonus(
  supabase: AppSupabaseClient,
  employeeId: string,
  referenceMonth: string
): Promise<number | null> {
  const monthEnd = new Date(
    `${referenceMonth.slice(0, 7)}-01T00:00:00.000Z`
  );
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const periodEnd = monthEnd.toISOString().slice(0, 10);
  const hasJustificationKind = await justificationKindColumnExists(supabase);
  const eventSelect = timesheetSelect(
    hasJustificationKind,
    "event_date, is_absence, is_day_off, lateness_minutes, justification_status, justification_kind, has_manual_adjustment",
    "event_date, is_absence, is_day_off, lateness_minutes, justification_status, has_manual_adjustment"
  );

  const [{ data: employee }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase
        .from("employees")
        .select(
          "id, work_schedule_id, work_schedules(bonus_base_amount, absence_penalty_percent, lateness_penalty_percent, accumulated_lateness_tolerance_minutes)"
        )
        .eq("id", employeeId)
        .maybeSingle(),
      supabase
        .from("timesheet_events")
        .select(eventSelect)
        .eq("employee_id", employeeId)
        .gte("event_date", referenceMonth)
        .lt("event_date", periodEnd)
        .order("event_date", { ascending: true }),
    ]);

  if (eventsError) {
    console.error("Falha ao recalcular o bônus do mês.", eventsError);
    return null;
  }

  const scheduleJoin = employee?.work_schedules;
  const scheduleRow = Array.isArray(scheduleJoin)
    ? scheduleJoin[0]
    : scheduleJoin;

  if (!scheduleRow || !events) {
    return null;
  }

  const days: BonusDayInput[] = events.map((row) => ({
    eventDate: row.event_date,
    isDayOff: row.is_day_off,
    isAbsence: row.is_absence,
    latenessMinutes: row.lateness_minutes,
    justificationStatus: asJustificationStatus(row.justification_status),
    justificationKind: asJustificationKind(row.justification_kind),
  }));

  const breakdown = explainScheduleBonus(
    bonusScheduleFrom({
      bonusBaseAmount: Number(scheduleRow.bonus_base_amount),
      absencePenaltyPercent: Number(scheduleRow.absence_penalty_percent),
      latenessPenaltyPercent: Number(scheduleRow.lateness_penalty_percent),
      accumulatedLatenessToleranceMinutes:
        scheduleRow.accumulated_lateness_tolerance_minutes,
    }),
    days,
    todayIsoDate()
  );

  const totalAbsences = events.filter((row) => row.is_absence).length;
  const totalLatenessMinutes = events.reduce(
    (total, row) => total + row.lateness_minutes,
    0
  );
  const manualAdjustmentsCount = events.filter(
    (row) => row.has_manual_adjustment && !row.is_day_off
  ).length;

  const { error } = await supabase
    .from("timesheet_summaries")
    .update({
      earned_amount: breakdown.total,
      total_absences: totalAbsences,
      total_lateness_minutes: totalLatenessMinutes,
      manual_adjustments_count: manualAdjustmentsCount,
    })
    .eq("employee_id", employeeId)
    .eq("reference_month", referenceMonth);

  if (error) {
    console.error("Falha ao gravar o bônus recalculado.", error);
    return null;
  }

  return breakdown.total;
}
