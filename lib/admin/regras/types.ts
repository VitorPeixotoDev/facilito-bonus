import type { WorkScheduleBonusRule } from "@/lib/admin/regras/bonus-rules";
import type { SundayRuleType } from "@/lib/admin/regras/days-off";

export type { SundayRuleType, WorkScheduleBonusRule };

export type WorkSchedule = {
  id: string;
  companyId: string;
  name: string;
  code: number;
  entry1: string;
  exit1: string;
  entry2: string | null;
  exit2: string | null;
  workloadMinutes: number;
  isNightShift: boolean;
  absencePenaltyPercent: number;
  latenessPenaltyPercent: number;
  accumulatedLatenessToleranceMinutes: number;
  bonusBaseAmount: number;
  fixedDaysOff: number[];
  sundayRuleType: SundayRuleType;
  fixedSundays: number[];
  floatingSundays: string[];
  bonusRules: WorkScheduleBonusRule[];
  createdAt: string;
};
