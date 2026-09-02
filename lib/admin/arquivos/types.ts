import type { ParsedCollaborator } from "@/lib/admin/arquivos/aej-employees";
import type { CompanyFilePurpose } from "@/lib/admin/arquivos/constants";
import type {
  BonusBreakdownLine,
  BonusWeekBreakdown,
} from "@/lib/admin/regras/calculate-bonus";
import type {
  JustificationKind,
  JustificationStatus,
} from "@/lib/admin/regras/justification";
import type { WorkSchedule } from "@/lib/admin/regras/types";

export type CompanyFile = {
  id: string;
  companyId: string;
  originalName: string;
  storagePath: string;
  sizeBytes: number;
  purpose: CompanyFilePurpose;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  pendingCount: number;
};

export type UploadCompanyFileState = {
  ok: boolean;
  message: string | null;
  uploadedAt: number | null;
  purpose: CompanyFilePurpose | null;
  fileId: string | null;
  collaborators: ParsedCollaborator[];
  pending: ParsedCollaborator[];
  processed: number;
};

export const UPLOAD_COMPANY_FILE_INITIAL_STATE: UploadCompanyFileState = {
  ok: false,
  message: null,
  uploadedAt: null,
  purpose: null,
  fileId: null,
  collaborators: [],
  pending: [],
  processed: 0,
};

export type ImportedCollaborator = {
  id: string;
  name: string;
  cpf: string;
  jobTitle: string | null;
  workScheduleId: string | null;
  workScheduleName: string | null;
  invitedAt: string | null;
  hasUser: boolean;
  isAdmin: boolean;
  bonusAmount: number | null;
  toleranceAlertCount: number;
  absenceCount: number;
  justifiedAbsenceCount: number;
  pendingJustificationCount: number;
  pendingAbsenceJustificationCount: number;
  pendingLatenessJustificationCount: number;
};

export type CollaboratorsBonusMonth = {
  collaborators: ImportedCollaborator[];
  selectedMonth: string;
  currentMonth: string;
  availableMonths: string[];
  totalBonus: number;
};

export type CollaboratorTimesheetEvent = {
  id: string;
  eventDate: string;
  latenessMinutes: number;
  isAbsence: boolean;
  isDayOff: boolean;
  hasManualAdjustment: boolean;
  justificationStatus: JustificationStatus;
  justificationKind: JustificationKind | null;
  justificationClaimNote: string | null;
  justificationReviewNote: string | null;
  notes: string | null;
};

export type CollaboratorBonusPeriod = {
  referenceMonth: string;
  totalAbsences: number;
  totalLatenessMinutes: number;
  unjustifiedAbsences: number;
  unjustifiedLateDays: number;
  completeWeeks: number;
  weeks: BonusWeekBreakdown[];
  earnedAmount: number;
  lines: BonusBreakdownLine[];
  breakdownTotal: number;
};

export type CollaboratorDetail = {
  id: string;
  name: string;
  cpf: string;
  jobTitle: string | null;
  invitedAt: string | null;
  createdAt: string;
  hasUser: boolean;
  isAdmin: boolean;
  workSchedule: WorkSchedule | null;
  justificationReasons: string[];
  selectedMonth: string;
  isCurrentMonth: boolean;
  availableMonths: string[];
  latestBonus: CollaboratorBonusPeriod | null;
  previousBonuses: { referenceMonth: string; earnedAmount: number }[];
  events: CollaboratorTimesheetEvent[];
};
