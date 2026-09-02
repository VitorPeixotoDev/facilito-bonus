"use server";

import { revalidatePath } from "next/cache";
import { timesheetDayNotes } from "@/lib/admin/regras/calculate-bonus";
import { todayIsoDate } from "@/lib/admin/regras/bonus-weeks";
import {
  daysOffScheduleFrom,
  isScheduledDayOff,
} from "@/lib/admin/regras/days-off";
import {
  asJustificationKind,
  asJustificationStatus,
  canCollaboratorClaim,
  inferJustificationKind,
  type JustificationKind,
} from "@/lib/admin/regras/justification";
import { getCollaboratorSession } from "@/lib/collaborator/session";
import {
  justificationKindColumnExists,
  timesheetSelect,
} from "@/lib/admin/arquivos/justification-kind-column";
import { createClient } from "@/lib/supabase/server";

export type ClaimJustificationResult = {
  ok: boolean;
  message: string;
};

function fail(message: string): ClaimJustificationResult {
  return { ok: false, message };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TimesheetEventRow = {
  id: string;
  employee_id: string;
  event_date: string;
  is_absence: boolean;
  is_day_off: boolean;
  lateness_minutes: number;
  has_manual_adjustment: boolean;
  justification_status: string;
  justification_kind?: string | null;
};

function scheduleFromJoin(employee: {
  work_schedules:
    | {
        accumulated_lateness_tolerance_minutes: number;
        fixed_days_off: number[] | null;
        sunday_rule_type: string | null;
        fixed_sundays: number[] | null;
        floating_sundays: string[] | null;
      }
    | {
        accumulated_lateness_tolerance_minutes: number;
        fixed_days_off: number[] | null;
        sunday_rule_type: string | null;
        fixed_sundays: number[] | null;
        floating_sundays: string[] | null;
      }[]
    | null;
}) {
  const scheduleJoin = employee.work_schedules;
  return Array.isArray(scheduleJoin) ? scheduleJoin[0] : scheduleJoin;
}

function resolveClaimKind(input: {
  requested: string | null;
  event: Pick<
    TimesheetEventRow,
    "is_absence" | "lateness_minutes" | "justification_kind"
  > | null;
  dailyTolerance: number;
}): JustificationKind | null {
  const requested = asJustificationKind(input.requested);

  if (input.event?.is_absence) {
    return "absence";
  }

  if (
    input.event &&
    !input.event.is_absence &&
    input.event.lateness_minutes > input.dailyTolerance
  ) {
    return "lateness";
  }

  if (requested) {
    return requested;
  }

  return inferJustificationKind({
    kind: input.event?.justification_kind,
    isAbsence: input.event?.is_absence ?? false,
    latenessMinutes: input.event?.lateness_minutes ?? 0,
  });
}

export async function claimTimesheetJustification(
  eventId: string | null,
  note: string,
  kind: string | null = null
): Promise<ClaimJustificationResult> {
  if (eventId && !UUID_PATTERN.test(eventId)) {
    return fail("Ocorrência não encontrada.");
  }

  const trimmedNote = note.trim().slice(0, 500);

  if (trimmedNote.length < 1) {
    return fail("Informe o motivo da justificativa.");
  }

  const session = await getCollaboratorSession();
  const employeeId = session?.collaborator?.employeeId;

  if (!employeeId) {
    return fail("Faça login para enviar uma justificativa.");
  }

  const supabase = await createClient();

  if (!supabase) {
    return fail("Supabase não está configurado.");
  }

  const today = todayIsoDate();
  const hasJustificationKind = await justificationKindColumnExists(supabase);
  const eventSelect = timesheetSelect(
    hasJustificationKind,
    "id, employee_id, event_date, is_absence, is_day_off, lateness_minutes, has_manual_adjustment, justification_status, justification_kind",
    "id, employee_id, event_date, is_absence, is_day_off, lateness_minutes, has_manual_adjustment, justification_status"
  );

  const [{ data: eventById, error: loadError }, { data: employee }] =
    await Promise.all([
      eventId
        ? supabase
            .from("timesheet_events")
            .select(eventSelect)
            .eq("id", eventId)
            .eq("employee_id", employeeId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("employees")
        .select(
          "id, work_schedules(accumulated_lateness_tolerance_minutes, fixed_days_off, sunday_rule_type, fixed_sundays, floating_sundays)"
        )
        .eq("id", employeeId)
        .maybeSingle(),
    ]);

  if (loadError) {
    return fail("Ocorrência não encontrada.");
  }

  let event: TimesheetEventRow | null = eventById;

  if (!event) {
    const { data: todayEvent, error: todayError } = await supabase
      .from("timesheet_events")
      .select(eventSelect)
      .eq("employee_id", employeeId)
      .eq("event_date", today)
      .maybeSingle();

    if (todayError) {
      return fail("Não foi possível carregar o ponto de hoje.");
    }

    event = todayEvent;
  }

  if (eventId && !event) {
    return fail("Ocorrência não encontrada.");
  }

  const eventDate = event?.event_date ?? today;
  const isToday = eventDate === today;
  const currentStatus = asJustificationStatus(event?.justification_status);

  if (event && !canCollaboratorClaim(currentStatus)) {
    return fail(
      currentStatus === "pending"
        ? "Esta ocorrência já está aguardando análise."
        : "Esta ocorrência não pode ser reivindicada."
    );
  }

  const scheduleRow = employee ? scheduleFromJoin(employee) : null;
  const daysOffSchedule = scheduleRow ? daysOffScheduleFrom(scheduleRow) : null;
  const isDayOff = Boolean(
    event?.is_day_off ||
      (daysOffSchedule && isScheduledDayOff(eventDate, daysOffSchedule))
  );

  if (isDayOff) {
    return fail("Folga programada não precisa de justificativa.");
  }

  const dailyTolerance =
    scheduleRow?.accumulated_lateness_tolerance_minutes ?? 0;
  const resolvedKind = resolveClaimKind({
    requested: kind,
    event,
    dailyTolerance,
  });

  if (!resolvedKind) {
    return fail("Escolha se a justificativa é de atraso ou de falta.");
  }

  if (!isToday && event) {
    const isLateAboveTolerance =
      !event.is_absence && event.lateness_minutes > dailyTolerance;

    if (!event.is_absence && !isLateAboveTolerance) {
      return fail(
        event.lateness_minutes > 0
          ? "Este atraso está dentro da tolerância e não precisa de justificativa."
          : "Não há atraso ou falta neste dia para justificar."
      );
    }
  }

  if (!isToday && !event) {
    return fail("Só é possível abrir justificativa no dia vigente.");
  }

  const notes = timesheetDayNotes({
    isAbsence: event?.is_absence ?? false,
    isDayOff: false,
    latenessMinutes: event?.lateness_minutes ?? 0,
    hasManualAdjustment: event?.has_manual_adjustment ?? false,
    justificationStatus: "pending",
    justificationKind: resolvedKind,
  });

  const payload = hasJustificationKind
    ? {
        justification_status: "pending" as const,
        justification_kind: resolvedKind,
        justification_claim_note: trimmedNote,
        notes,
      }
    : {
        justification_status: "pending" as const,
        justification_claim_note: trimmedNote,
        notes,
      };

  if (event) {
    const { error } = await supabase
      .from("timesheet_events")
      .update(payload)
      .eq("id", event.id)
      .eq("employee_id", employeeId);

    if (error) {
      console.error("Falha ao reivindicar justificativa.", error);
      return fail("Não foi possível enviar a justificativa. Tente novamente.");
    }
  } else {
    const { error } = await supabase.from("timesheet_events").insert({
      employee_id: employeeId,
      event_date: today,
      is_absence: false,
      is_day_off: false,
      lateness_minutes: 0,
      has_manual_adjustment: false,
      ...payload,
    });

    if (error) {
      console.error("Falha ao abrir justificativa do dia.", error);
      return fail("Não foi possível enviar a justificativa. Tente novamente.");
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/colaboradores", "layout");
  return {
    ok: true,
    message: "Justificativa enviada. O admin ainda precisa aceitar ou recusar.",
  };
}
