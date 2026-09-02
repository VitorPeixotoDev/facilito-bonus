import {
  decodeAejText,
  parseAejCollaborators,
  type ParsedCollaborator,
} from "@/lib/admin/arquivos/aej-employees";
import {
  COMPANY_FILES_BUCKET,
  isCompanyFilePurpose,
} from "@/lib/admin/arquivos/constants";
import {
  COMPANY_FILE_SELECT,
  COMPANY_FILE_SELECT_WITHOUT_PERIOD,
  isMissingPeriodColumn,
} from "@/lib/admin/arquivos/company-file-columns";
import { nextUtcMonth, startOfMonth } from "@/lib/admin/arquivos/aej-timesheet";
import { resolveTimesheetMonth } from "@/lib/admin/arquivos/months";
import { reprocessLatestTimesheet } from "@/lib/admin/arquivos/sync-timesheets";
import {
  normalizeStoredLatenessMinutes,
  scheduledEntryMinutes,
} from "@/lib/admin/arquivos/evaluate-timesheet";
import type {
  CollaboratorBonusPeriod,
  CollaboratorDetail,
  CollaboratorsBonusMonth,
  CompanyFile,
  ImportedCollaborator,
} from "@/lib/admin/arquivos/types";
import {
  bonusScheduleFrom,
  explainScheduleBonus,
  timesheetDayNotes,
} from "@/lib/admin/regras/calculate-bonus";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import {
  asJustificationStatus,
  inferJustificationKind,
} from "@/lib/admin/regras/justification";
import { justificationKindColumnExists, timesheetSelect } from "@/lib/admin/arquivos/justification-kind-column";
import { mergeSavedSuggestions } from "@/lib/admin/saved-suggestions";
import { getWorkSchedule } from "@/lib/admin/regras/queries";
import { COMPANY_ADMIN_ROLE, COLLABORATOR_ROLE } from "@/lib/collaborator/types";
import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppSupabaseClient = SupabaseClient<Database>;

type EmployeeRow = {
  id: string;
  name: string;
  cpf: string;
  job_title: string | null;
  work_schedule_id: string | null;
  invited_at: string | null;
  user_id: string | null;
  role: string;
  work_schedules: { name: string } | { name: string }[] | null;
};

const ID_CHUNK = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function mapCompanyFile(row: {
  id: string;
  company_id: string;
  original_name: string;
  storage_path: string;
  size_bytes: number;
  purpose: string;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
}, pendingCount = 0): CompanyFile | null {
  if (!isCompanyFilePurpose(row.purpose)) {
    return null;
  }

  return {
    id: row.id,
    companyId: row.company_id,
    originalName: row.original_name,
    storagePath: row.storage_path,
    sizeBytes: row.size_bytes,
    purpose: row.purpose,
    periodStart: row.period_start ?? null,
    periodEnd: row.period_end ?? null,
    createdAt: row.created_at,
    pendingCount,
  };
}

function mapEmployee(employee: EmployeeRow): ImportedCollaborator {
  const schedule = Array.isArray(employee.work_schedules)
    ? employee.work_schedules[0]
    : employee.work_schedules;

  return {
    id: employee.id,
    name: employee.name,
    cpf: employee.cpf,
    jobTitle: employee.job_title,
    workScheduleId: employee.work_schedule_id,
    workScheduleName: schedule?.name ?? null,
    invitedAt: employee.invited_at,
    hasUser: Boolean(employee.user_id),
    isAdmin: employee.role === COMPANY_ADMIN_ROLE,
    bonusAmount: null,
    toleranceAlertCount: 0,
    absenceCount: 0,
    justifiedAbsenceCount: 0,
    pendingJustificationCount: 0,
    pendingAbsenceJustificationCount: 0,
    pendingLatenessJustificationCount: 0,
  };
}

const EMPLOYEE_SELECT =
  "id, name, cpf, job_title, work_schedule_id, invited_at, user_id, role, work_schedules(name)";

async function listEmployeesByIds(
  supabase: AppSupabaseClient,
  companyId: string,
  ids: string[]
): Promise<ImportedCollaborator[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows: ImportedCollaborator[] = [];

  for (let index = 0; index < ids.length; index += ID_CHUNK) {
    const chunk = ids.slice(index, index + ID_CHUNK);
    const { data, error } = await supabase
      .from("employees")
      .select(EMPLOYEE_SELECT)
      .eq("company_id", companyId)
      .in("id", chunk);

    if (error) {
      console.error("Falha ao carregar colaboradores por id.", error);
      continue;
    }

    for (const employee of data ?? []) {
      rows.push(mapEmployee(employee));
    }
  }

  return attachLatestBonuses(
    supabase,
    rows.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
  );
}

async function listEmployeesByCpfs(
  supabase: AppSupabaseClient,
  companyId: string,
  cpfs: string[]
): Promise<ImportedCollaborator[]> {
  if (cpfs.length === 0) {
    return [];
  }

  const rows: ImportedCollaborator[] = [];

  for (let index = 0; index < cpfs.length; index += ID_CHUNK) {
    const chunk = cpfs.slice(index, index + ID_CHUNK);
    const { data, error } = await supabase
      .from("employees")
      .select(EMPLOYEE_SELECT)
      .eq("company_id", companyId)
      .in("cpf", chunk);

    if (error) {
      console.error("Falha ao carregar colaboradores por CPF.", error);
      continue;
    }

    for (const employee of data ?? []) {
      rows.push(mapEmployee(employee));
    }
  }

  return attachLatestBonuses(
    supabase,
    rows.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
  );
}

async function attachBonusesForMonth(
  supabase: AppSupabaseClient,
  collaborators: ImportedCollaborator[],
  requestedMonth?: string | string[] | null
): Promise<CollaboratorsBonusMonth> {
  const currentMonth = startOfMonth(todayIsoDate());
  const empty: CollaboratorsBonusMonth = {
    collaborators,
    selectedMonth: currentMonth,
    currentMonth,
    availableMonths: [currentMonth],
    totalBonus: 0,
  };

  const ids = collaborators.map((person) => person.id);

  if (ids.length === 0) {
    const resolved = resolveTimesheetMonth({
      requested: requestedMonth,
      availableMonths: [],
    });

    return {
      ...empty,
      selectedMonth: resolved.selectedMonth,
      currentMonth: resolved.currentMonth,
      availableMonths: resolved.months,
    };
  }

  const amounts = new Map<string, number>();
  const months: string[] = [];

  for (let index = 0; index < ids.length; index += ID_CHUNK) {
    const chunk = ids.slice(index, index + ID_CHUNK);
    const { data, error } = await supabase
      .from("timesheet_summaries")
      .select("employee_id, reference_month, earned_amount")
      .in("employee_id", chunk)
      .order("reference_month", { ascending: false });

    if (error) {
      console.error("Falha ao carregar bônus dos colaboradores.", error);
      continue;
    }

    for (const row of data ?? []) {
      months.push(row.reference_month);
      amounts.set(`${row.employee_id}:${row.reference_month}`, Number(row.earned_amount));
    }
  }

  const resolved = resolveTimesheetMonth({
    requested: requestedMonth,
    availableMonths: months,
  });
  const monthByEmployee = new Map(
    ids.map((id) => [id, resolved.selectedMonth] as const)
  );
  const alerts = await countLatestTimesheetAlerts(supabase, monthByEmployee);

  const withBonuses = collaborators.map((person) => {
    const counts = alerts.get(person.id);

    return {
      ...person,
      bonusAmount: person.workScheduleId
        ? amounts.get(`${person.id}:${resolved.selectedMonth}`) ?? null
        : null,
      toleranceAlertCount: counts?.toleranceAlerts ?? 0,
      absenceCount: counts?.absences ?? 0,
      justifiedAbsenceCount: counts?.justifiedAbsences ?? 0,
      pendingJustificationCount: counts?.pendingJustifications ?? 0,
      pendingAbsenceJustificationCount:
        counts?.pendingAbsenceJustifications ?? 0,
      pendingLatenessJustificationCount:
        counts?.pendingLatenessJustifications ?? 0,
    };
  });

  const totalBonus = withBonuses.reduce(
    (total, person) => total + (person.bonusAmount ?? 0),
    0
  );

  return {
    collaborators: withBonuses,
    selectedMonth: resolved.selectedMonth,
    currentMonth: resolved.currentMonth,
    availableMonths: resolved.months,
    totalBonus,
  };
}

async function attachLatestBonuses(
  supabase: AppSupabaseClient,
  collaborators: ImportedCollaborator[]
): Promise<ImportedCollaborator[]> {
  const ids = collaborators
    .filter((person) => person.workScheduleId)
    .map((person) => person.id);

  if (ids.length === 0) {
    return collaborators;
  }

  const latestAmount = new Map<string, number>();
  const latestMonth = new Map<string, string>();

  for (let index = 0; index < ids.length; index += ID_CHUNK) {
    const chunk = ids.slice(index, index + ID_CHUNK);
    const { data, error } = await supabase
      .from("timesheet_summaries")
      .select("employee_id, reference_month, earned_amount")
      .in("employee_id", chunk)
      .order("reference_month", { ascending: false });

    if (error) {
      console.error("Falha ao carregar bônus dos colaboradores.", error);
      continue;
    }

    for (const row of data ?? []) {
      if (latestAmount.has(row.employee_id)) {
        continue;
      }

      latestAmount.set(row.employee_id, Number(row.earned_amount));
      latestMonth.set(row.employee_id, row.reference_month);
    }
  }

  const currentMonth = startOfMonth(todayIsoDate());

  for (const id of ids) {
    if (!latestMonth.has(id)) {
      latestMonth.set(id, currentMonth);
    }
  }

  const alerts = await countLatestTimesheetAlerts(supabase, latestMonth);

  return collaborators.map((person) => {
    const counts = alerts.get(person.id);

    return {
      ...person,
      bonusAmount: latestAmount.get(person.id) ?? null,
      toleranceAlertCount: counts?.toleranceAlerts ?? 0,
      absenceCount: counts?.absences ?? 0,
      justifiedAbsenceCount: counts?.justifiedAbsences ?? 0,
      pendingJustificationCount: counts?.pendingJustifications ?? 0,
      pendingAbsenceJustificationCount:
        counts?.pendingAbsenceJustifications ?? 0,
      pendingLatenessJustificationCount:
        counts?.pendingLatenessJustifications ?? 0,
    };
  });
}

type TimesheetAlertCounts = {
  absences: number;
  justifiedAbsences: number;
  toleranceAlerts: number;
  pendingJustifications: number;
  pendingAbsenceJustifications: number;
  pendingLatenessJustifications: number;
};

async function countLatestTimesheetAlerts(
  supabase: AppSupabaseClient,
  latestMonth: Map<string, string>
): Promise<Map<string, TimesheetAlertCounts>> {
  const counts = new Map<string, TimesheetAlertCounts>();
  const idsByMonth = new Map<string, string[]>();
  const hasJustificationKind = await justificationKindColumnExists(supabase);
  const alertSelect = timesheetSelect(
    hasJustificationKind,
    "employee_id, is_absence, is_day_off, lateness_minutes, has_manual_adjustment, justification_status, justification_kind",
    "employee_id, is_absence, is_day_off, lateness_minutes, has_manual_adjustment, justification_status"
  );

  for (const [employeeId, referenceMonth] of latestMonth) {
    const ids = idsByMonth.get(referenceMonth) ?? [];
    ids.push(employeeId);
    idsByMonth.set(referenceMonth, ids);
  }

  for (const [referenceMonth, employeeIds] of idsByMonth) {
    const periodEnd = nextUtcMonth(referenceMonth);

    for (let index = 0; index < employeeIds.length; index += ID_CHUNK) {
      const chunk = employeeIds.slice(index, index + ID_CHUNK);
      const { data, error } = await supabase
        .from("timesheet_events")
        .select(alertSelect)
        .in("employee_id", chunk)
        .gte("event_date", referenceMonth)
        .lt("event_date", periodEnd);

      if (error) {
        console.error("Falha ao carregar alertas do ponto.", error);
        continue;
      }

      for (const row of data ?? []) {
        if (row.is_day_off) {
          continue;
        }

        const current = counts.get(row.employee_id) ?? {
          absences: 0,
          justifiedAbsences: 0,
          toleranceAlerts: 0,
          pendingJustifications: 0,
          pendingAbsenceJustifications: 0,
          pendingLatenessJustifications: 0,
        };
        const kind = inferJustificationKind({
          kind: row.justification_kind,
          isAbsence: row.is_absence,
          latenessMinutes: row.lateness_minutes,
        });

        if (row.is_absence) {
          if (row.justification_status === "justified") {
            current.justifiedAbsences += 1;
          } else {
            current.absences += 1;
          }
        } else if (row.lateness_minutes > 0 || row.has_manual_adjustment) {
          current.toleranceAlerts += 1;
        }

        if (row.justification_status === "pending") {
          current.pendingJustifications += 1;

          if (kind === "absence") {
            current.pendingAbsenceJustifications += 1;
          } else if (kind === "lateness") {
            current.pendingLatenessJustifications += 1;
          }
        }

        counts.set(row.employee_id, current);
      }
    }
  }

  return counts;
}

export async function listCompanyFiles(): Promise<CompanyFile[]> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  let { data, error } = await supabase
    .from("company_files")
    .select(COMPANY_FILE_SELECT)
    .eq("company_id", admin.companyId)
    .order("created_at", { ascending: false });

  if (isMissingPeriodColumn(error)) {
    const fallback = await supabase
      .from("company_files")
      .select(COMPANY_FILE_SELECT_WITHOUT_PERIOD)
      .eq("company_id", admin.companyId)
      .order("created_at", { ascending: false });
    data = (fallback.data ?? []).map((row) => ({
      ...row,
      period_start: null,
      period_end: null,
    }));
    error = fallback.error;
  }

  if (error || !data) {
    console.error("Falha ao carregar arquivos da empresa.", error);
    return [];
  }

  const pendingCountByFile = new Map<string, number>();

  if (data.length > 0) {
    const { data: pendingRows, error: pendingError } = await supabase
      .from("company_file_pending_employees")
      .select("file_id")
      .in(
        "file_id",
        data.map((row) => row.id)
      );

    if (pendingError) {
      console.error("Falha ao carregar pendentes dos arquivos.", pendingError);
    }

    for (const row of pendingRows ?? []) {
      pendingCountByFile.set(
        row.file_id,
        (pendingCountByFile.get(row.file_id) ?? 0) + 1
      );
    }
  }

  return data.flatMap((row) => {
    const mapped = mapCompanyFile(row, pendingCountByFile.get(row.id) ?? 0);
    return mapped ? [mapped] : [];
  });
}

export async function getCompanyFile(fileId: string): Promise<CompanyFile | null> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  let { data, error } = await supabase
    .from("company_files")
    .select(COMPANY_FILE_SELECT)
    .eq("id", fileId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (isMissingPeriodColumn(error)) {
    const fallback = await supabase
      .from("company_files")
      .select(COMPANY_FILE_SELECT_WITHOUT_PERIOD)
      .eq("id", fileId)
      .eq("company_id", admin.companyId)
      .maybeSingle();
    data = fallback.data
      ? { ...fallback.data, period_start: null, period_end: null }
      : fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    return null;
  }

  return mapCompanyFile(data);
}

export async function listImportedCollaborators(
  fileId: string
): Promise<ImportedCollaborator[]> {
  const admin = await requireCompanyAdmin();
  const file = await getCompanyFile(fileId);
  const supabase = await createClient();

  if (!file || !supabase) {
    return [];
  }

  const { data: links, error: linkError } = await supabase
    .from("company_file_employees")
    .select("employee_id")
    .eq("file_id", file.id);

  if (linkError) {
    console.error("Falha ao carregar vínculos do arquivo.", linkError);
  }

  if (!linkError && links && links.length > 0) {
    const fromLinks = await listEmployeesByIds(
      supabase,
      admin.companyId,
      links.map((row) => row.employee_id)
    );

    if (fromLinks.length > 0) {
      return fromLinks;
    }
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(COMPANY_FILES_BUCKET)
    .download(file.storagePath);

  if (downloadError || !blob) {
    console.error("Falha ao ler o arquivo enviado.", downloadError);
    return [];
  }

  const parsed = parseAejCollaborators(decodeAejText(await blob.arrayBuffer()));
  const collaborators = await listEmployeesByCpfs(
    supabase,
    admin.companyId,
    parsed.map((person) => person.cpf)
  );

  if (collaborators.length > 0 && !linkError) {
    const { error: repairError } = await supabase
      .from("company_file_employees")
      .upsert(
        collaborators.map((person) => ({
          file_id: fileId,
          employee_id: person.id,
        })),
        { onConflict: "file_id,employee_id" }
      );

    if (repairError) {
      console.error("Falha ao reconectar colaboradores ao arquivo.", repairError);
    }
  }

  return collaborators;
}

export async function listPendingCollaborators(
  fileId: string
): Promise<ParsedCollaborator[]> {
  const file = await getCompanyFile(fileId);
  const supabase = await createClient();

  if (!file || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("company_file_pending_employees")
    .select("cpf, name")
    .eq("file_id", file.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Falha ao carregar colaboradores pendentes.", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    cpf: row.cpf,
    name: row.name,
  }));
}

export async function listExistingJobTitles(): Promise<string[]> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("employees")
    .select("job_title")
    .eq("company_id", admin.companyId)
    .not("job_title", "is", null)
    .order("job_title", { ascending: true });

  if (error || !data) {
    return [];
  }

  return [...new Set(data.flatMap((row) => (row.job_title ? [row.job_title] : [])))];
}

async function listJustificationReasonsForCompany(
  supabase: SupabaseClient<Database>,
  companyId: string
): Promise<string[]> {
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", companyId);

  if (employeesError || !employees || employees.length === 0) {
    if (employeesError) {
      console.error("Falha ao carregar colaboradores para sugestões.", employeesError);
    }
    return [];
  }

  const notes: string[] = [];
  const ids = employees.map((row) => row.id);

  for (let index = 0; index < ids.length; index += 100) {
    const { data, error } = await supabase
      .from("timesheet_events")
      .select("justification_review_note")
      .in("employee_id", ids.slice(index, index + 100))
      .not("justification_review_note", "is", null);

    if (error) {
      console.error("Falha ao carregar sugestões de justificativa.", error);
      return mergeSavedSuggestions([], notes);
    }

    for (const row of data ?? []) {
      if (row.justification_review_note) {
        notes.push(row.justification_review_note);
      }
    }
  }

  return mergeSavedSuggestions([], notes);
}

export async function listExistingJustificationReasons(): Promise<string[]> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  return listJustificationReasonsForCompany(supabase, admin.companyId);
}

export async function listCurrentCollaborators(
  monthParam?: string | string[] | null
): Promise<CollaboratorsBonusMonth> {
  const currentMonth = startOfMonth(todayIsoDate());
  const empty: CollaboratorsBonusMonth = {
    collaborators: [],
    selectedMonth: currentMonth,
    currentMonth,
    availableMonths: [currentMonth],
    totalBonus: 0,
  };

  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return empty;
  }

  await reprocessLatestTimesheet(supabase, admin.companyId);

  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("company_id", admin.companyId)
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Falha ao carregar colaboradores da empresa.", error);
    return empty;
  }

  return attachBonusesForMonth(supabase, data.map(mapEmployee), monthParam);
}

export async function getCollaboratorDetail(
  employeeId: string,
  monthParam?: string | string[] | null
): Promise<CollaboratorDetail | null> {
  if (!isUuid(employeeId)) {
    return null;
  }

  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  await reprocessLatestTimesheet(supabase, admin.companyId);

  const { data: employee, error } = await supabase
    .from("employees")
    .select(
      "id, name, cpf, job_title, work_schedule_id, invited_at, user_id, role, created_at"
    )
    .eq("id", employeeId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (error || !employee) {
    return null;
  }

  const [schedule, summariesResult, justificationReasons] = await Promise.all([
    employee.work_schedule_id
      ? getWorkSchedule(employee.work_schedule_id)
      : Promise.resolve(null),
    supabase
      .from("timesheet_summaries")
      .select(
        "reference_month, total_absences, total_lateness_minutes, manual_adjustments_count, earned_amount"
      )
      .eq("employee_id", employee.id)
      .order("reference_month", { ascending: false }),
    listJustificationReasonsForCompany(supabase, admin.companyId),
  ]);

  if (summariesResult.error) {
    console.error(
      "Falha ao carregar bônus do colaborador.",
      summariesResult.error
    );
  }

  const summaries = summariesResult.data ?? [];
  const resolved = resolveTimesheetMonth({
    requested: monthParam,
    availableMonths: summaries.map((row) => row.reference_month),
  });
  const selectedSummary =
    summaries.find((row) => row.reference_month === resolved.selectedMonth) ??
    null;

  let events: CollaboratorDetail["events"] = [];
  const hasJustificationKind = await justificationKindColumnExists(supabase);
  const eventSelect = timesheetSelect(
    hasJustificationKind,
    "id, event_date, lateness_minutes, is_absence, is_day_off, has_manual_adjustment, justification_status, justification_kind, justification_claim_note, justification_review_note, notes",
    "id, event_date, lateness_minutes, is_absence, is_day_off, has_manual_adjustment, justification_status, justification_claim_note, justification_review_note, notes"
  );
  const { data: eventRows, error: eventsError } = await supabase
    .from("timesheet_events")
    .select(eventSelect)
    .eq("employee_id", employee.id)
    .gte("event_date", resolved.selectedMonth)
    .lt("event_date", nextUtcMonth(resolved.selectedMonth))
    .order("event_date", { ascending: true });

  if (eventsError) {
    console.error("Falha ao carregar o ponto do colaborador.", eventsError);
  } else {
    const slots = schedule ? scheduledEntryMinutes(schedule) : [];
    events = (eventRows ?? []).map((row) => {
      const latenessMinutes = normalizeStoredLatenessMinutes(
        row.lateness_minutes,
        slots
      );
      const justificationStatus = asJustificationStatus(
        row.justification_status
      );
      const justificationKind = inferJustificationKind({
        kind: row.justification_kind,
        isAbsence: row.is_absence,
        latenessMinutes,
      });

      return {
        id: row.id,
        eventDate: row.event_date,
        latenessMinutes,
        isAbsence: row.is_absence,
        isDayOff: row.is_day_off,
        hasManualAdjustment: row.has_manual_adjustment,
        justificationStatus,
        justificationKind,
        justificationClaimNote: row.justification_claim_note,
        justificationReviewNote: row.justification_review_note,
        notes: timesheetDayNotes({
          isAbsence: row.is_absence,
          isDayOff: row.is_day_off,
          latenessMinutes,
          hasManualAdjustment: row.has_manual_adjustment,
          justificationStatus,
          justificationKind,
        }),
      };
    });

    const staleEvents = events.filter((event, index) => {
      const row = eventRows?.[index];
      return (
        row != null &&
        (row.lateness_minutes !== event.latenessMinutes ||
          row.is_day_off !== event.isDayOff ||
          row.notes !== event.notes)
      );
    });

    if (staleEvents.length > 0 && selectedSummary) {
      const { error: persistError } = await supabase
        .from("timesheet_events")
        .upsert(
          staleEvents.map((event) => ({
            id: event.id,
            employee_id: employee.id,
            event_date: event.eventDate,
            lateness_minutes: event.latenessMinutes,
            is_absence: event.isAbsence,
            is_day_off: event.isDayOff,
            has_manual_adjustment: event.hasManualAdjustment,
            notes: event.notes,
          })),
          { onConflict: "employee_id,event_date" }
        );

      if (persistError) {
        console.error("Falha ao corrigir minutos de atraso gravados.", persistError);
      }
    }
  }

  const correctedLatenessMinutes =
    events.length > 0
      ? events.reduce((total, event) => total + event.latenessMinutes, 0)
      : (selectedSummary?.total_lateness_minutes ?? 0);

  const bonusDays = events.map((event) => ({
    eventDate: event.eventDate,
    isDayOff: event.isDayOff,
    isAbsence: event.isAbsence,
    latenessMinutes: event.latenessMinutes,
    justificationStatus: event.justificationStatus,
    justificationKind: event.justificationKind,
  }));
  const breakdown = schedule
    ? explainScheduleBonus(
        bonusScheduleFrom(schedule),
        bonusDays,
        todayIsoDate()
      )
    : {
        lines: [],
        weeks: [],
        completeWeeks: 0,
        unjustifiedAbsences: 0,
        unjustifiedLateDays: 0,
        total: Number(selectedSummary?.earned_amount ?? 0),
      };

  if (
    selectedSummary &&
    schedule &&
    Math.abs(breakdown.total - Number(selectedSummary.earned_amount)) > 0.009
  ) {
    selectedSummary.earned_amount = breakdown.total;
    selectedSummary.total_lateness_minutes = correctedLatenessMinutes;
    await supabase
      .from("timesheet_summaries")
      .update({
        total_lateness_minutes: correctedLatenessMinutes,
        earned_amount: breakdown.total,
      })
      .eq("employee_id", employee.id)
      .eq("reference_month", selectedSummary.reference_month);
  }

  const latestBonus: CollaboratorBonusPeriod | null = selectedSummary
    ? {
        referenceMonth: selectedSummary.reference_month,
        totalAbsences: selectedSummary.total_absences,
        totalLatenessMinutes: correctedLatenessMinutes,
        unjustifiedAbsences: breakdown.unjustifiedAbsences,
        unjustifiedLateDays: breakdown.unjustifiedLateDays,
        completeWeeks: breakdown.completeWeeks,
        weeks: breakdown.weeks,
        earnedAmount: schedule
          ? breakdown.total
          : Number(selectedSummary.earned_amount),
        lines: breakdown.lines,
        breakdownTotal: breakdown.total,
      }
    : null;

  return {
    id: employee.id,
    name: employee.name,
    cpf: employee.cpf,
    jobTitle: employee.job_title,
    invitedAt: employee.invited_at,
    createdAt: employee.created_at,
    hasUser: Boolean(employee.user_id),
    isAdmin: employee.role === COMPANY_ADMIN_ROLE,
    workSchedule: schedule,
    justificationReasons,
    selectedMonth: resolved.selectedMonth,
    isCurrentMonth: resolved.selectedMonth === resolved.currentMonth,
    availableMonths: resolved.months,
    latestBonus,
    previousBonuses: summaries
      .filter((row) => row.reference_month !== resolved.selectedMonth)
      .map((row) => ({
        referenceMonth: row.reference_month,
        earnedAmount: Number(row.earned_amount),
      })),
    events,
  };
}

export async function companyHasRegisteredCollaborators(): Promise<boolean> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return false;
  }

  const { count, error } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", admin.companyId)
    .eq("role", COLLABORATOR_ROLE);

  if (error) {
    console.error("Falha ao contar colaboradores da empresa.", error);
    return false;
  }

  return (count ?? 0) > 0;
}
