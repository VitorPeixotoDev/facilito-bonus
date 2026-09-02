"use server";

import { revalidatePath } from "next/cache";
import { persistEmployeeMonthBonus } from "@/lib/admin/arquivos/recalculate-bonus";
import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";
import { startOfMonth } from "@/lib/admin/arquivos/aej-timesheet";
import { timesheetDayNotes } from "@/lib/admin/regras/calculate-bonus";
import type { JustificationStatus } from "@/lib/admin/regras/justification";
import { parseSavedSuggestion } from "@/lib/admin/saved-suggestions";
import { createClient } from "@/lib/supabase/server";

export type JustificationActionResult = {
  ok: boolean;
  message: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message: string): JustificationActionResult {
  return { ok: false, message };
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isReviewStatus(
  value: string
): value is Exclude<JustificationStatus, "pending"> {
  return value === "unjustified" || value === "justified" || value === "rejected";
}

export async function reviewTimesheetJustification(
  eventId: string,
  status: string,
  reviewNote = ""
): Promise<JustificationActionResult> {
  const admin = await requireCompanyAdmin();

  if (!isUuid(eventId)) {
    return fail("Evento de ponto não encontrado.");
  }

  if (!isReviewStatus(status)) {
    return fail("Status de justificativa inválido.");
  }

  const parsedNote = parseSavedSuggestion(reviewNote);

  if (status === "justified" && !parsedNote) {
    return fail("Informe uma justificativa com 2 a 80 caracteres.");
  }

  const supabase = await createClient();

  if (!supabase) {
    return fail("Supabase não está configurado.");
  }

  const { data: event, error: loadError } = await supabase
    .from("timesheet_events")
    .select(
      "id, employee_id, event_date, is_absence, is_day_off, lateness_minutes, has_manual_adjustment"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (loadError || !event) {
    return fail("Evento de ponto não encontrado.");
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("id", event.employee_id)
    .maybeSingle();

  if (!employee || employee.company_id !== admin.companyId) {
    return fail("Evento de ponto não encontrado.");
  }

  const notes = timesheetDayNotes({
    isAbsence: event.is_absence,
    isDayOff: event.is_day_off,
    latenessMinutes: event.lateness_minutes,
    hasManualAdjustment: event.has_manual_adjustment,
    justificationStatus: status,
  });

  const { error } = await supabase
    .from("timesheet_events")
    .update({
      justification_status: status,
      justification_reviewed_at: new Date().toISOString(),
      justification_reviewed_by: admin.userId,
      notes,
      justification_review_note: status === "justified" ? parsedNote : null,
      ...(status === "unjustified"
        ? {
            justification_claim_note: null,
            justification_claimed_at: null,
          }
        : {}),
    })
    .eq("id", event.id);

  if (error) {
    console.error("Falha ao revisar justificativa.", error);
    return fail("Não foi possível atualizar a justificativa.");
  }

  await persistEmployeeMonthBonus(
    supabase,
    event.employee_id,
    startOfMonth(event.event_date)
  );

  revalidatePath("/");
  revalidatePath("/admin/colaboradores", "layout");
  revalidatePath(`/admin/colaboradores/${event.employee_id}`);

  const message =
    status === "justified"
      ? "Justificativa aceita. O bônus do mês foi recalculado."
      : status === "rejected"
        ? "Justificativa recusada. O bônus do mês permanece com a punição."
        : "Ocorrência marcada como injustificada. O bônus do mês foi recalculado.";

  return { ok: true, message };
}
