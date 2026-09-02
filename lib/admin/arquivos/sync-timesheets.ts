import { decodeAejText } from "@/lib/admin/arquivos/aej-employees";
import {
  clipPeriodToMonth,
  eachCalendarDate,
  endOfMonth,
  monthsInPeriod,
  parseAejTimesheet,
  startOfMonth,
  timesheetPeriod,
  type AejContractSchedule,
  type AejPunch,
  type AejTimesheet,
} from "@/lib/admin/arquivos/aej-timesheet";
import {
  COMPANY_FILES_BUCKET,
  COMPANY_FILE_PURPOSES,
} from "@/lib/admin/arquivos/constants";
import { isMissingPeriodColumn } from "@/lib/admin/arquivos/company-file-columns";
import {
  justificationKindColumnExists,
  omitJustificationKind,
  timesheetSelect,
} from "@/lib/admin/arquivos/justification-kind-column";
import {
  evaluateEmployeeTimesheet,
  timesheetDayNotes,
  type EvaluationSchedule,
} from "@/lib/admin/arquivos/evaluate-timesheet";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import {
  asJustificationKind,
  asJustificationStatus,
  DEFAULT_JUSTIFICATION_STATUS,
  type JustificationKind,
  type JustificationStatus,
} from "@/lib/admin/regras/justification";
import { formatTimeValue } from "@/lib/admin/regras/schedule";
import {
  DEFAULT_FIXED_DAYS_OFF,
  isSundayRuleType,
  uniqueSortedDates,
  uniqueSortedNumbers,
} from "@/lib/admin/regras/days-off";
import { COLLABORATOR_ROLE } from "@/lib/collaborator/types";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppSupabaseClient = SupabaseClient<Database>;

type ScheduleRow = {
  id: string;
  entry_1: string;
  entry_2: string | null;
  absence_penalty_percent: number;
  lateness_penalty_percent: number;
  accumulated_lateness_tolerance_minutes: number;
  bonus_base_amount: number;
  fixed_days_off: number[] | null;
  sunday_rule_type: string | null;
  fixed_sundays: number[] | null;
  floating_sundays: string[] | null;
};

type AssignedEmployee = {
  id: string;
  cpf: string;
  work_schedule_id: string;
};

type StoredJustification = {
  status: JustificationStatus;
  kind: JustificationKind | null;
  claimNote: string | null;
  reviewNote: string | null;
  claimedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

type PontoSheetFile = {
  id: string;
  createdAt: string;
  sheet: AejTimesheet;
  periodStart: string;
  periodEnd: string;
};

type MergedEmployeeMonth = {
  cpf: string;
  name: string;
  punches: AejPunch[];
};

const CHUNK = 100;

function mapSchedule(row: ScheduleRow): EvaluationSchedule {
  const entry2 = row.entry_2 ? formatTimeValue(row.entry_2) : "";
  const sundayRuleType = row.sunday_rule_type ?? "none";

  return {
    entry1: formatTimeValue(row.entry_1),
    entry2: entry2 || null,
    absencePenaltyPercent: Number(row.absence_penalty_percent),
    latenessPenaltyPercent: Number(row.lateness_penalty_percent),
    dailyLatenessToleranceMinutes:
      row.accumulated_lateness_tolerance_minutes,
    bonusBaseAmount: Number(row.bonus_base_amount),
    fixedDaysOff: uniqueSortedNumbers(
      row.fixed_days_off ?? [...DEFAULT_FIXED_DAYS_OFF]
    ),
    sundayRuleType: isSundayRuleType(sundayRuleType) ? sundayRuleType : "none",
    fixedSundays: uniqueSortedNumbers(row.fixed_sundays ?? []),
    floatingSundays: uniqueSortedDates(
      (row.floating_sundays ?? []).map((value) => String(value).slice(0, 10))
    ),
  };
}

async function listByChunk<T>(
  ids: string[],
  load: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const rows: T[] = [];

  for (let index = 0; index < ids.length; index += CHUNK) {
    rows.push(...(await load(ids.slice(index, index + CHUNK))));
  }

  return rows;
}

function punchesBySeq(sheet: AejTimesheet): Map<string, AejPunch[]> {
  const grouped = new Map<string, AejPunch[]>();

  for (const punch of sheet.punches) {
    const current = grouped.get(punch.employeeSeq) ?? [];
    current.push(punch);
    grouped.set(punch.employeeSeq, current);
  }

  return grouped;
}

async function persistFilePeriod(
  supabase: AppSupabaseClient,
  fileId: string,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  const { error } = await supabase
    .from("company_files")
    .update({
      period_start: periodStart,
      period_end: periodEnd,
    })
    .eq("id", fileId);

  if (error) {
    if (isMissingPeriodColumn(error)) {
      return;
    }

    console.error("Falha ao gravar o período do arquivo de ponto.", error);
  }
}

function coverageDates(
  files: PontoSheetFile[],
  month: string,
  today: string
): string[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(monthStart);
  const dates = new Set<string>();

  for (const file of files) {
    const clipped = clipPeriodToMonth(file.periodStart, file.periodEnd, monthStart);

    if (!clipped) {
      continue;
    }

    for (const date of eachCalendarDate(clipped.start, clipped.end)) {
      dates.add(date);
    }
  }

  if (monthStart === startOfMonth(today)) {
    for (const date of eachCalendarDate(monthStart, monthEnd)) {
      if (date > today) {
        dates.add(date);
      }
    }
  }

  return [...dates].sort();
}

function mergeMonthEmployees(
  files: PontoSheetFile[],
  month: string
): { employees: MergedEmployeeMonth[]; schedules: Map<string, AejContractSchedule> } {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(monthStart);
  const ordered = [...files].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
  const byCpf = new Map<string, MergedEmployeeMonth>();
  const schedules = new Map<string, AejContractSchedule>();

  for (const file of ordered) {
    const clipped = clipPeriodToMonth(file.periodStart, file.periodEnd, monthStart);

    if (!clipped) {
      continue;
    }

    const covered = new Set(eachCalendarDate(clipped.start, clipped.end));
    const groupedPunches = punchesBySeq(file.sheet);

    for (const [code, schedule] of file.sheet.schedules) {
      schedules.set(code, schedule);
    }

    for (const person of file.sheet.employees) {
      const incoming = (groupedPunches.get(person.seq) ?? []).filter(
        (punch) => punch.date >= monthStart && punch.date <= monthEnd
      );
      const current = byCpf.get(person.cpf);

      if (!current) {
        byCpf.set(person.cpf, {
          cpf: person.cpf,
          name: person.name,
          punches: incoming,
        });
        continue;
      }

      current.name = person.name;
      current.punches = [
        ...current.punches.filter((punch) => !covered.has(punch.date)),
        ...incoming,
      ];
    }
  }

  return { employees: [...byCpf.values()], schedules };
}

export type SyncTimesheetsResult = {
  processed: number;
  skippedWithoutRule: number;
};

type MonthSyncResult = SyncTimesheetsResult & {
  employeeIds: string[];
};

async function evaluateAndStoreMonth(
  supabase: AppSupabaseClient,
  companyId: string,
  month: string,
  files: PontoSheetFile[],
  linkFileId: string | null
): Promise<MonthSyncResult> {
  const today = todayIsoDate();
  const dates = coverageDates(files, month, today);
  const { employees: mergedEmployees, schedules: fileSchedules } =
    mergeMonthEmployees(files, month);

  if (dates.length === 0 || mergedEmployees.length === 0) {
    return { processed: 0, skippedWithoutRule: 0, employeeIds: [] };
  }

  const cpfs = mergedEmployees.map((person) => person.cpf);
  const matched = await listByChunk(cpfs, async (chunk) => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, cpf, work_schedule_id, role")
      .eq("company_id", companyId)
      .eq("role", COLLABORATOR_ROLE)
      .in("cpf", chunk);

    if (error) {
      throw error;
    }

    return data ?? [];
  });

  const assigned: AssignedEmployee[] = matched.flatMap((row) =>
    row.work_schedule_id
      ? [{ id: row.id, cpf: row.cpf, work_schedule_id: row.work_schedule_id }]
      : []
  );

  const skippedWithoutRule = matched.length - assigned.length;

  if (assigned.length === 0) {
    return { processed: 0, skippedWithoutRule, employeeIds: [] };
  }

  const scheduleIds = [...new Set(assigned.map((row) => row.work_schedule_id))];
  const { data: scheduleRows, error: scheduleError } = await supabase
    .from("work_schedules")
    .select(
      "id, entry_1, entry_2, absence_penalty_percent, lateness_penalty_percent, accumulated_lateness_tolerance_minutes, bonus_base_amount, fixed_days_off, sunday_rule_type, fixed_sundays, floating_sundays"
    )
    .eq("company_id", companyId)
    .in("id", scheduleIds);

  if (scheduleError) {
    throw scheduleError;
  }

  const schedules = new Map(
    (scheduleRows ?? []).map((row) => [row.id, mapSchedule(row)])
  );
  const employeeByCpf = new Map(assigned.map((row) => [row.cpf, row]));
  const assignedIds = assigned.map((row) => row.id);
  const hasJustificationKind = await justificationKindColumnExists(supabase);
  const storedJustificationSelect = timesheetSelect(
    hasJustificationKind,
    "employee_id, event_date, justification_status, justification_kind, justification_claim_note, justification_review_note, justification_claimed_at, justification_reviewed_at, justification_reviewed_by",
    "employee_id, event_date, justification_status, justification_claim_note, justification_review_note, justification_claimed_at, justification_reviewed_at, justification_reviewed_by"
  );
  const justificationsByEmployee = new Map<
    string,
    Map<string, StoredJustification>
  >();
  const monthEnd = endOfMonth(month);

  for (let index = 0; index < assignedIds.length; index += CHUNK) {
    const chunk = assignedIds.slice(index, index + CHUNK);
    const { data, error } = await supabase
      .from("timesheet_events")
      .select(storedJustificationSelect)
      .in("employee_id", chunk)
      .gte("event_date", month)
      .lte("event_date", monthEnd);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const current = justificationsByEmployee.get(row.employee_id) ?? new Map();
      current.set(row.event_date, {
        status: asJustificationStatus(row.justification_status),
        kind: asJustificationKind(row.justification_kind),
        claimNote: row.justification_claim_note,
        reviewNote: row.justification_review_note,
        claimedAt: row.justification_claimed_at,
        reviewedAt: row.justification_reviewed_at,
        reviewedBy: row.justification_reviewed_by,
      });
      justificationsByEmployee.set(row.employee_id, current);
    }
  }

  const events: Database["public"]["Tables"]["timesheet_events"]["Insert"][] =
    [];
  const summaries: Database["public"]["Tables"]["timesheet_summaries"]["Insert"][] =
    [];
  const linkedIds: string[] = [];

  for (const person of mergedEmployees) {
    const employee = employeeByCpf.get(person.cpf);
    if (!employee) {
      continue;
    }

    const schedule = schedules.get(employee.work_schedule_id);
    if (!schedule) {
      continue;
    }

    const storedJustifications =
      justificationsByEmployee.get(employee.id) ?? new Map();
    const justificationStatuses = new Map(
      Array.from(storedJustifications, ([date, row]) => [date, row.status])
    );
    const evaluated = evaluateEmployeeTimesheet(
      dates,
      person.punches,
      schedule,
      fileSchedules,
      today,
      justificationStatuses
    );

    linkedIds.push(employee.id);
    summaries.push({
      employee_id: employee.id,
      reference_month: month,
      total_absences: evaluated.totalAbsences,
      total_lateness_minutes: evaluated.totalLatenessMinutes,
      manual_adjustments_count: evaluated.manualAdjustmentsCount,
      earned_amount: evaluated.earnedAmount,
    });

    for (const day of evaluated.days) {
      const stillOccurrence = day.isAbsence || day.latenessMinutes > 0;
      const existing = storedJustifications.get(day.eventDate);
      const keepClaim = stillOccurrence && existing != null;
      const justificationStatus = keepClaim
        ? (existing?.status ?? DEFAULT_JUSTIFICATION_STATUS)
        : DEFAULT_JUSTIFICATION_STATUS;
      const justificationKind = keepClaim ? existing?.kind ?? null : null;

      events.push({
        employee_id: employee.id,
        event_date: day.eventDate,
        lateness_minutes: day.latenessMinutes,
        is_absence: day.isAbsence,
        is_day_off: day.isDayOff,
        has_manual_adjustment: day.hasManualAdjustment,
        notes:
          day.isDayOff || day.isFuture
            ? day.notes
            : timesheetDayNotes({
                isAbsence: day.isAbsence,
                isDayOff: day.isDayOff,
                latenessMinutes: day.latenessMinutes,
                hasManualAdjustment: day.hasManualAdjustment,
                justificationStatus,
                justificationKind,
              }),
        justification_status: justificationStatus,
        justification_kind: justificationKind,
        justification_claim_note: keepClaim ? existing?.claimNote ?? null : null,
        justification_review_note: keepClaim ? existing?.reviewNote ?? null : null,
        justification_claimed_at: keepClaim ? existing?.claimedAt ?? null : null,
        justification_reviewed_at: keepClaim ? existing?.reviewedAt ?? null : null,
        justification_reviewed_by: keepClaim ? existing?.reviewedBy ?? null : null,
      });
    }
  }

  for (let index = 0; index < events.length; index += CHUNK) {
    const chunk = events.slice(index, index + CHUNK);
    const { error } = await supabase.from("timesheet_events").upsert(
      hasJustificationKind ? chunk : chunk.map(omitJustificationKind),
      { onConflict: "employee_id,event_date" }
    );

    if (error) {
      throw error;
    }
  }

  for (let index = 0; index < summaries.length; index += CHUNK) {
    const { error } = await supabase.from("timesheet_summaries").upsert(
      summaries.slice(index, index + CHUNK),
      { onConflict: "employee_id,reference_month" }
    );

    if (error) {
      throw error;
    }
  }

  if (linkFileId && linkedIds.length > 0) {
    const { error } = await supabase.from("company_file_employees").upsert(
      linkedIds.map((employeeId) => ({
        file_id: linkFileId,
        employee_id: employeeId,
      })),
      { onConflict: "file_id,employee_id" }
    );

    if (error) {
      console.error("Falha ao vincular colaboradores ao arquivo de ponto.", error);
    }
  }

  return { processed: summaries.length, skippedWithoutRule, employeeIds: linkedIds };
}

async function loadPontoSheets(
  supabase: AppSupabaseClient,
  companyId: string,
  known?: { id: string; sheet: AejTimesheet }
): Promise<PontoSheetFile[]> {
  const { data: files, error } = await supabase
    .from("company_files")
    .select("id, storage_path, created_at")
    .eq("company_id", companyId)
    .eq("purpose", COMPANY_FILE_PURPOSES.ponto)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const sheets: PontoSheetFile[] = [];

  for (const file of files ?? []) {
    let sheet: AejTimesheet | null = known?.id === file.id ? known.sheet : null;

    if (!sheet) {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(COMPANY_FILES_BUCKET)
        .download(file.storage_path);

      if (downloadError || !blob) {
        console.error("Falha ao baixar o arquivo de ponto.", downloadError);
        continue;
      }

      try {
        sheet = parseAejTimesheet(decodeAejText(await blob.arrayBuffer()));
      } catch (parseError) {
        console.error("Falha ao ler o arquivo de ponto.", parseError);
        continue;
      }
    }

    const period = timesheetPeriod(sheet);

    if (!period) {
      continue;
    }

    await persistFilePeriod(supabase, file.id, period.periodStart, period.periodEnd);

    sheets.push({
      id: file.id,
      createdAt: file.created_at,
      sheet,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });
  }

  return sheets;
}

async function syncMonths(
  supabase: AppSupabaseClient,
  companyId: string,
  sheets: PontoSheetFile[],
  months: string[],
  linkFileId: string | null
): Promise<SyncTimesheetsResult> {
  const processedIds = new Set<string>();
  let skippedWithoutRule = 0;

  for (const month of months) {
    const overlapping = sheets.filter((file) =>
      Boolean(clipPeriodToMonth(file.periodStart, file.periodEnd, month))
    );

    if (overlapping.length === 0) {
      continue;
    }

    const result = await evaluateAndStoreMonth(
      supabase,
      companyId,
      month,
      overlapping,
      linkFileId
    );
    for (const id of result.employeeIds) {
      processedIds.add(id);
    }
    skippedWithoutRule = Math.max(skippedWithoutRule, result.skippedWithoutRule);
  }

  return { processed: processedIds.size, skippedWithoutRule };
}

export async function syncTimesheetBonuses(
  supabase: AppSupabaseClient,
  companyId: string,
  fileId: string,
  text: string
): Promise<SyncTimesheetsResult> {
  const sheet = parseAejTimesheet(text);
  const period = timesheetPeriod(sheet);

  if (!period || sheet.punches.length === 0) {
    throw new Error("missing_punches");
  }

  await persistFilePeriod(supabase, fileId, period.periodStart, period.periodEnd);

  const sheets = await loadPontoSheets(supabase, companyId, { id: fileId, sheet });
  const months = monthsInPeriod(period.periodStart, period.periodEnd);

  return syncMonths(supabase, companyId, sheets, months, fileId);
}

const LATENESS_EVALUATION_VERSION = 6;
const reprocessedCompanies = new Set<string>();

export async function reprocessTimesheetByFileId(
  supabase: AppSupabaseClient,
  companyId: string,
  fileId: string
): Promise<SyncTimesheetsResult | null> {
  const { data: file, error } = await supabase
    .from("company_files")
    .select("id, storage_path, purpose")
    .eq("id", fileId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !file || file.purpose !== COMPANY_FILE_PURPOSES.ponto) {
    return null;
  }

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(COMPANY_FILES_BUCKET)
      .download(file.storage_path);

    if (downloadError || !blob) {
      console.error("Falha ao baixar o arquivo de ponto para recálculo.", downloadError);
      return null;
    }

    const text = decodeAejText(await blob.arrayBuffer());
    return await syncTimesheetBonuses(supabase, companyId, file.id, text);
  } catch (error) {
    console.error("Falha ao recalcular o ponto do arquivo.", error);
    return null;
  }
}

export async function reprocessLatestTimesheet(
  supabase: AppSupabaseClient,
  companyId: string,
  options: { force?: boolean } = {}
): Promise<void> {
  const reprocessKey = `${LATENESS_EVALUATION_VERSION}:${companyId}`;

  if (!options.force && reprocessedCompanies.has(reprocessKey)) {
    return;
  }

  reprocessedCompanies.add(reprocessKey);

  try {
    const sheets = await loadPontoSheets(supabase, companyId);

    if (sheets.length === 0) {
      reprocessedCompanies.delete(reprocessKey);
      return;
    }

    const months = [
      ...new Set(
        sheets.flatMap((file) => monthsInPeriod(file.periodStart, file.periodEnd))
      ),
    ].sort();

    await syncMonths(supabase, companyId, sheets, months, null);
  } catch (error) {
    reprocessedCompanies.delete(reprocessKey);
    console.error("Falha ao recalcular o ponto a partir dos arquivos enviados.", error);
  }
}
