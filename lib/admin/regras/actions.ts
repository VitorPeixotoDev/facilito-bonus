"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reprocessLatestTimesheet } from "@/lib/admin/arquivos/sync-timesheets";
import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";
import {
  fieldErrorsFromZod,
  parseWorkScheduleForm,
  type WorkScheduleState,
  type WorkScheduleValues,
} from "@/lib/admin/regras/schema";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emptyToNull(value: string): string | null {
  return value.length > 0 ? value : null;
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function revalidateSchedules() {
  revalidatePath("/");
  revalidatePath("/admin/regras");
  revalidatePath("/admin/arquivos");
  revalidatePath("/admin/colaboradores");
}

function scheduleWritePayload(values: WorkScheduleValues) {
  const sundayIsFixedOff = values.diasFolga.includes(0);
  const sundayRuleType = sundayIsFixedOff ? "none" : values.regraDomingo;

  return {
    name: values.nome,
    entry_1: values.ent1,
    exit_1: values.sai1,
    entry_2: emptyToNull(values.ent2),
    exit_2: emptyToNull(values.sai2),
    punctuality_percent: 0,
    absence_penalty_percent: values.percentualPenalizacaoFalta,
    lateness_penalty_percent: values.percentualPenalizacaoAtraso,
    accumulated_lateness_tolerance_minutes: values.toleranciaMinutosAcumulados,
    bonus_base_amount: values.valorBaseBonificacao,
    fixed_days_off: values.diasFolga,
    sunday_rule_type: sundayRuleType,
    fixed_sundays:
      sundayRuleType === "fixed_nth" ? values.domingosFixos : [],
    floating_sundays:
      sundayRuleType === "floating" ? values.domingosAvulsos : [],
  };
}

function failState(
  message: string | null,
  fieldErrors: WorkScheduleState["fieldErrors"] = {}
): WorkScheduleState {
  return { ok: false, message, fieldErrors, code: null };
}

function readWriteError(message: string): WorkScheduleState {
  if (message.includes("work_schedules_company_name_uidx")) {
    return failState(null, { nome: "Já existe uma escala com este nome." });
  }

  if (message.includes("work_schedules_workload_chk")) {
    return failState("A carga horária precisa ser maior que zero.");
  }

  if (message.includes("work_schedules_shift2_chk")) {
    return failState(
      "Preencha entrada e saída do 2º turno, ou deixe os dois vazios."
    );
  }

  if (message.includes("work_schedules_absence_penalty_percent_chk")) {
    return failState(null, {
      percentualPenalizacaoFalta:
        "Use um percentual de penalização por falta entre 0 e 100.",
    });
  }

  if (message.includes("work_schedules_lateness_penalty_percent_chk")) {
    return failState(null, {
      percentualPenalizacaoAtraso:
        "Use um percentual de penalização entre 0 e 100.",
    });
  }

  if (message.includes("work_schedules_lateness_tolerance_chk")) {
    return failState(null, {
      toleranciaMinutosAcumulados:
        "Use uma tolerância diária de atraso válida.",
    });
  }

  if (message.includes("work_schedules_bonus_base_amount_chk")) {
    return failState(null, {
      valorBaseBonificacao: "Informe um valor base maior ou igual a zero.",
    });
  }

  if (message.includes("work_schedules_fixed_days_off_chk")) {
    return failState(null, {
      diasFolga: "Selecione dias da semana válidos para folga.",
    });
  }

  if (message.includes("work_schedules_sunday_rule_type_chk")) {
    return failState(null, {
      regraDomingo: "Selecione uma regra de domingos válida.",
    });
  }

  if (message.includes("work_schedules_fixed_sundays_chk")) {
    return failState(null, {
      domingosFixos: "Selecione ocorrências válidas de domingo no mês.",
    });
  }

  if (message.includes("floating_sundays")) {
    return failState(null, {
      domingosAvulsos: "Informe apenas datas de domingo.",
    });
  }

  if (
    message.includes("absence_penalty_percent") ||
    message.includes("punctuality_percent") ||
    message.includes("lateness_penalty_percent") ||
    message.includes("accumulated_lateness_tolerance") ||
    message.includes("bonus_base_amount")
  ) {
    return failState(
      "Não foi possível gravar as variáveis de bonificação. Atualize o banco e tente novamente."
    );
  }

  return failState("Não foi possível gravar a escala. Tente novamente.");
}

export async function createWorkSchedule(
  _prev: WorkScheduleState,
  formData: FormData
): Promise<WorkScheduleState> {
  const admin = await requireCompanyAdmin();
  const parsed = parseWorkScheduleForm(formData);

  if (!parsed.success) {
    return failState(null, fieldErrorsFromZod(parsed.error));
  }

  const supabase = await createClient();

  if (!supabase) {
    return failState("Supabase não está configurado.");
  }

  const { data, error } = await supabase
    .from("work_schedules")
    .insert({
      company_id: admin.companyId,
      ...scheduleWritePayload(parsed.data),
    })
    .select("id, code")
    .single();

  if (error || !data) {
    return readWriteError(error?.message ?? "");
  }

  revalidateSchedules();
  redirect("/admin/regras");
}

export async function updateWorkSchedule(
  _prev: WorkScheduleState,
  formData: FormData
): Promise<WorkScheduleState> {
  const admin = await requireCompanyAdmin();
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!isUuid(scheduleId)) {
    return failState("Escala não encontrada.");
  }

  const parsed = parseWorkScheduleForm(formData);

  if (!parsed.success) {
    return failState(null, fieldErrorsFromZod(parsed.error));
  }

  const supabase = await createClient();

  if (!supabase) {
    return failState("Supabase não está configurado.");
  }

  const { data: existing, error: loadError } = await supabase
    .from("work_schedules")
    .select("id")
    .eq("id", scheduleId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (loadError || !existing) {
    return failState("Escala não encontrada.");
  }

  const { error } = await supabase
    .from("work_schedules")
    .update(scheduleWritePayload(parsed.data))
    .eq("id", existing.id)
    .eq("company_id", admin.companyId);

  if (error) {
    return readWriteError(error.message);
  }

  await reprocessLatestTimesheet(supabase, admin.companyId, { force: true });

  revalidateSchedules();
  revalidatePath(`/admin/regras/${existing.id}/editar`);
  redirect("/admin/regras");
}

export async function deleteWorkSchedule(
  scheduleId: string
): Promise<{ ok: boolean; message: string }> {
  const admin = await requireCompanyAdmin();

  if (!isUuid(scheduleId)) {
    return { ok: false, message: "Escala não encontrada." };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { ok: false, message: "Supabase não está configurado." };
  }

  const { data: existing, error: loadError } = await supabase
    .from("work_schedules")
    .select("id")
    .eq("id", scheduleId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, message: "Escala não encontrada." };
  }

  const { error } = await supabase
    .from("work_schedules")
    .delete()
    .eq("id", existing.id)
    .eq("company_id", admin.companyId);

  if (error) {
    console.error("Falha ao excluir escala.", error);
    return { ok: false, message: "Não foi possível excluir a escala. Tente novamente." };
  }

  revalidateSchedules();
  return { ok: true, message: "Escala excluída." };
}
