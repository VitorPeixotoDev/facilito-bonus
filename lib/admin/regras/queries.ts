import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";
import {
  BONUS_RULE_METRIC_VALUES,
  BONUS_RULE_OPERATOR_VALUES,
  type BonusRuleMetric,
  type BonusRuleOperator,
  type WorkScheduleBonusRule,
} from "@/lib/admin/regras/bonus-rules";
import {
  isSundayRuleType,
  uniqueSortedDates,
  uniqueSortedNumbers,
} from "@/lib/admin/regras/days-off";
import { formatTimeValue } from "@/lib/admin/regras/schedule";
import type { WorkSchedule } from "@/lib/admin/regras/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type WorkScheduleRow = Database["public"]["Tables"]["work_schedules"]["Row"];
type BonusRuleRow =
  Database["public"]["Tables"]["work_schedule_bonus_rules"]["Row"];

type WorkScheduleQueryRow = WorkScheduleRow & {
  work_schedule_bonus_rules: BonusRuleRow[] | null;
};

const BONUS_RULE_SELECT =
  "id, metric, operator, target_value, reward_amount, sort_order, work_schedule_id, created_at";

const WORK_SCHEDULE_SELECT =
  `id, company_id, name, code, entry_1, exit_1, entry_2, exit_2, workload_minutes, is_night_shift, punctuality_percent, absence_penalty_percent, lateness_penalty_percent, accumulated_lateness_tolerance_minutes, bonus_base_amount, fixed_days_off, sunday_rule_type, fixed_sundays, floating_sundays, created_at, work_schedule_bonus_rules(${BONUS_RULE_SELECT})` as const;

function isBonusRuleMetric(value: string): value is BonusRuleMetric {
  return (BONUS_RULE_METRIC_VALUES as readonly string[]).includes(value);
}

function isBonusRuleOperator(value: string): value is BonusRuleOperator {
  return (BONUS_RULE_OPERATOR_VALUES as readonly string[]).includes(value);
}

function mapBonusRules(rows: BonusRuleRow[] | null): WorkScheduleBonusRule[] {
  return (rows ?? [])
    .flatMap((row) => {
      if (!isBonusRuleMetric(row.metric) || !isBonusRuleOperator(row.operator)) {
        return [];
      }

      return [
        {
          id: row.id,
          metric: row.metric,
          operator: row.operator,
          targetValue: row.target_value,
          rewardAmount: Number(row.reward_amount),
          sortOrder: row.sort_order,
        },
      ];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function mapWorkSchedule(row: WorkScheduleQueryRow): WorkSchedule {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    code: row.code,
    entry1: formatTimeValue(row.entry_1),
    exit1: formatTimeValue(row.exit_1),
    entry2: row.entry_2 ? formatTimeValue(row.entry_2) : null,
    exit2: row.exit_2 ? formatTimeValue(row.exit_2) : null,
    workloadMinutes: row.workload_minutes ?? 0,
    isNightShift: row.is_night_shift ?? false,
    absencePenaltyPercent: Number(row.absence_penalty_percent),
    latenessPenaltyPercent: Number(row.lateness_penalty_percent),
    accumulatedLatenessToleranceMinutes:
      row.accumulated_lateness_tolerance_minutes,
    bonusBaseAmount: Number(row.bonus_base_amount),
    fixedDaysOff: uniqueSortedNumbers(row.fixed_days_off ?? []),
    sundayRuleType: isSundayRuleType(row.sunday_rule_type)
      ? row.sunday_rule_type
      : "none",
    fixedSundays: uniqueSortedNumbers(row.fixed_sundays ?? []),
    floatingSundays: uniqueSortedDates(
      (row.floating_sundays ?? []).map((value) => String(value).slice(0, 10))
    ),
    bonusRules: mapBonusRules(row.work_schedule_bonus_rules),
    createdAt: row.created_at,
  };
}

export async function listWorkSchedules(): Promise<WorkSchedule[]> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("work_schedules")
    .select(WORK_SCHEDULE_SELECT)
    .eq("company_id", admin.companyId)
    .order("code", { ascending: true });

  if (error || !data) {
    console.error("Falha ao carregar escalas de trabalho.", error);
    return [];
  }

  return data.map(mapWorkSchedule);
}

export async function getWorkSchedule(
  scheduleId: string
): Promise<WorkSchedule | null> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("work_schedules")
    .select(WORK_SCHEDULE_SELECT)
    .eq("id", scheduleId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapWorkSchedule(data);
}
