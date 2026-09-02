"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createCollaboratorFieldErrorsFromZod,
  parseCreateCollaboratorForm,
  type CreateCollaboratorState,
} from "@/lib/admin/arquivos/collaborator-schema";
import {
  ADMIN_ANALYSIS_MONTH_COOKIE,
  ADMIN_ANALYSIS_MONTH_MAX_AGE,
  monthParam,
  parseMonthParam,
} from "@/lib/admin/arquivos/months";
import { getCompanyFile } from "@/lib/admin/arquivos/queries";
import { registerPendingCollaborators } from "@/lib/admin/arquivos/sync-employees";
import {
  reprocessLatestTimesheet,
  reprocessTimesheetByFileId,
} from "@/lib/admin/arquivos/sync-timesheets";
import {
  COLLABORATOR_ROLE,
  COMPANY_ADMIN_ROLE,
} from "@/lib/collaborator/types";
import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";
import { parseSavedSuggestion } from "@/lib/admin/saved-suggestions";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BulkCollaboratorResult = {
  ok: boolean;
  message: string;
  inviteLinks: { name: string; url: string }[];
};

function fail(message: string): BulkCollaboratorResult {
  return { ok: false, message, inviteLinks: [] };
}

function ok(message: string, inviteLinks: { name: string; url: string }[] = []): BulkCollaboratorResult {
  return { ok: true, message, inviteLinks };
}

export async function persistAdminAnalysisMonth(month: string) {
  const parsed = parseMonthParam(month);

  if (!parsed) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ANALYSIS_MONTH_COOKIE, monthParam(parsed), {
    path: "/",
    maxAge: ADMIN_ANALYSIS_MONTH_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  });
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function uniqueIds(values: string[]): string[] {
  return [...new Set(values.filter(isUuid))];
}

function inviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function revalidateCollaborators(fileId: string | null) {
  revalidatePath("/");
  revalidatePath("/admin/arquivos");
  revalidatePath("/admin/colaboradores", "layout");

  if (fileId) {
    revalidatePath(`/admin/arquivos/${fileId}/colaboradores`);
  }
}

async function loadTargetEmployees(fileId: string | null, employeeIds: string[]) {
  const admin = await requireCompanyAdmin();
  const ids = uniqueIds(employeeIds);

  if (ids.length === 0) {
    return { admin, error: fail("Selecione pelo menos um colaborador.") };
  }

  if (fileId) {
    const file = await getCompanyFile(fileId);

    if (!file) {
      return { admin, error: fail("Arquivo não encontrado.") };
    }
  }

  const supabase = await createClient();

  if (!supabase) {
    return { admin, error: fail("Supabase não está configurado.") };
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id, name, role, user_id, company_id")
    .eq("company_id", admin.companyId)
    .in("id", ids);

  if (error || !data || data.length === 0) {
    return { admin, error: fail("Não foi possível carregar os colaboradores selecionados.") };
  }

  return { admin, supabase, fileId, employees: data, error: null };
}

export async function assignImportedJobTitle(
  fileId: string | null,
  employeeIds: string[],
  jobTitle: string
): Promise<BulkCollaboratorResult> {
  const title = parseSavedSuggestion(jobTitle);

  if (!title) {
    return fail("Informe um cargo com 2 a 80 caracteres.");
  }

  const loaded = await loadTargetEmployees(fileId, employeeIds);
  if (loaded.error) {
    return loaded.error;
  }

  const { supabase, employees } = loaded;
  const { error } = await supabase
    .from("employees")
    .update({ job_title: title })
    .in(
      "id",
      employees.map((employee) => employee.id)
    );

  if (error) {
    console.error("Falha ao atribuir cargo.", error);
    return fail("Não foi possível atribuir o cargo. Tente novamente.");
  }

  revalidateCollaborators(fileId);
  return ok(`Cargo atribuído a ${employees.length} colaborador${employees.length === 1 ? "" : "es"}.`);
}

export async function assignImportedWorkSchedule(
  fileId: string | null,
  employeeIds: string[],
  scheduleId: string
): Promise<BulkCollaboratorResult> {
  if (!isUuid(scheduleId)) {
    return fail("Selecione uma regra de jornada.");
  }

  const loaded = await loadTargetEmployees(fileId, employeeIds);
  if (loaded.error) {
    return loaded.error;
  }

  const { admin, supabase, employees } = loaded;
  const { data: schedule, error: scheduleError } = await supabase
    .from("work_schedules")
    .select("id")
    .eq("id", scheduleId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (scheduleError || !schedule) {
    return fail("Regra de jornada não encontrada.");
  }

  const { error } = await supabase
    .from("employees")
    .update({ work_schedule_id: schedule.id })
    .in(
      "id",
      employees.map((employee) => employee.id)
    );

  if (error) {
    console.error("Falha ao atribuir regra.", error);
    return fail("Não foi possível atribuir a regra. Tente novamente.");
  }

  if (fileId) {
    await reprocessTimesheetByFileId(supabase, admin.companyId, fileId);
  } else {
    await reprocessLatestTimesheet(supabase, admin.companyId, { force: true });
  }

  revalidateCollaborators(fileId);
  return ok(`Regra atribuída a ${employees.length} colaborador${employees.length === 1 ? "" : "es"}.`);
}

export async function sendImportedInvites(
  fileId: string | null,
  employeeIds: string[]
): Promise<BulkCollaboratorResult> {
  const loaded = await loadTargetEmployees(fileId, employeeIds);
  if (loaded.error) {
    return loaded.error;
  }

  const { admin, supabase, employees } = loaded;
  const targets = employees.filter((employee) => !employee.user_id);

  if (targets.length === 0) {
    return fail("Os selecionados já estão vinculados a uma conta.");
  }

  const origin = (await headers()).get("origin") ?? "http://127.0.0.1:3000";
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const inviteLinks: { name: string; url: string }[] = [];

  for (const employee of targets) {
    const token = inviteToken();
    const { error } = await supabase.from("employee_invites").upsert(
      {
        company_id: admin.companyId,
        employee_id: employee.id,
        token,
        created_by: admin.employeeId,
        expires_at: expiresAt,
        accepted_at: null,
      },
      { onConflict: "employee_id" }
    );

    if (error) {
      console.error("Falha ao gerar convite.", error);
      continue;
    }

    await supabase
      .from("employees")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", employee.id);

    inviteLinks.push({
      name: employee.name,
      url: `${origin}/convite/${token}`,
    });
  }

  if (inviteLinks.length === 0) {
    return fail("Não foi possível gerar os convites. Tente novamente.");
  }

  revalidateCollaborators(fileId);
  return ok(
    `${inviteLinks.length} convite${inviteLinks.length === 1 ? "" : "s"} gerado${inviteLinks.length === 1 ? "" : "s"}.`,
    inviteLinks
  );
}

export async function deleteImportedCollaborators(
  fileId: string | null,
  employeeIds: string[]
): Promise<BulkCollaboratorResult> {
  const loaded = await loadTargetEmployees(fileId, employeeIds);
  if (loaded.error) {
    return loaded.error;
  }

  const { admin, supabase, employees } = loaded;
  const removable = employees.filter(
    (employee) =>
      employee.id !== admin.employeeId &&
      employee.role !== COMPANY_ADMIN_ROLE &&
      !employee.user_id
  );

  if (removable.length === 0) {
    return fail(
      "Não é possível excluir administradores ou colaboradores já vinculados a uma conta."
    );
  }

  const ids = removable.map((employee) => employee.id);

  if (fileId) {
    await supabase
      .from("company_file_employees")
      .delete()
      .eq("file_id", fileId)
      .in("employee_id", ids);
  }

  const { error } = await supabase.from("employees").delete().in("id", ids);

  if (error) {
    console.error("Falha ao excluir colaboradores.", error);
    return fail("Não foi possível excluir os colaboradores. Tente novamente.");
  }

  const skipped = employees.length - removable.length;
  revalidateCollaborators(fileId);

  return ok(
    skipped > 0
      ? `${removable.length} excluído${removable.length === 1 ? "" : "s"}. ${skipped} não puderam ser removidos.`
      : `${removable.length} colaborador${removable.length === 1 ? "" : "es"} excluído${removable.length === 1 ? "" : "s"}.`
  );
}

const CPF_PATTERN = /^\d{11}$/;

export async function acceptPendingCollaborators(
  fileId: string,
  cpfs: string[],
  scheduleId: string
): Promise<BulkCollaboratorResult> {
  if (!isUuid(fileId)) {
    return fail("Arquivo não encontrado.");
  }

  if (!isUuid(scheduleId)) {
    return fail("Selecione uma regra de jornada.");
  }

  const selectedCpfs = [...new Set(cpfs.filter((cpf) => CPF_PATTERN.test(cpf)))];

  if (selectedCpfs.length === 0) {
    return fail("Selecione pelo menos um colaborador.");
  }

  const admin = await requireCompanyAdmin();
  const file = await getCompanyFile(fileId);

  if (!file) {
    return fail("Arquivo não encontrado.");
  }

  const supabase = await createClient();

  if (!supabase) {
    return fail("Supabase não está configurado.");
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("work_schedules")
    .select("id")
    .eq("id", scheduleId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (scheduleError || !schedule) {
    return fail("Regra de jornada não encontrada.");
  }

  const { data: pendingRows, error: pendingError } = await supabase
    .from("company_file_pending_employees")
    .select("cpf, name")
    .eq("file_id", file.id)
    .in("cpf", selectedCpfs);

  if (pendingError || !pendingRows || pendingRows.length === 0) {
    return fail("Não foi possível carregar os colaboradores pendentes.");
  }

  const pending = pendingRows.map((row) => ({
    cpf: row.cpf,
    name: row.name,
  }));
  const pendingCpfs = pending.map((person) => person.cpf);

  const { data: existingRows, error: existingError } = await supabase
    .from("employees")
    .select("id, cpf")
    .eq("company_id", admin.companyId)
    .in("cpf", pendingCpfs);

  if (existingError) {
    return fail("Não foi possível conferir os colaboradores selecionados.");
  }

  const existingByCpf = new Map(
    (existingRows ?? []).map((row) => [row.cpf, row.id])
  );
  const toInsert = pending.filter((person) => !existingByCpf.has(person.cpf));
  const existingIds = pending.flatMap((person) => {
    const id = existingByCpf.get(person.cpf);
    return id ? [id] : [];
  });

  if (existingIds.length > 0) {
    const { error: updateError } = await supabase
      .from("employees")
      .update({ work_schedule_id: schedule.id })
      .in("id", existingIds);

    if (updateError) {
      console.error("Falha ao atribuir regra aos colaboradores já cadastrados.", updateError);
      return fail("Não foi possível atribuir a regra. Tente novamente.");
    }

    const { error: linkError } = await supabase.from("company_file_employees").upsert(
      existingIds.map((employeeId) => ({
        file_id: file.id,
        employee_id: employeeId,
      })),
      { onConflict: "file_id,employee_id" }
    );

    if (linkError) {
      console.error("Falha ao vincular colaboradores ao arquivo.", linkError);
    }
  }

  try {
    await registerPendingCollaborators(
      supabase,
      admin.companyId,
      file.id,
      toInsert,
      schedule.id
    );
  } catch (error) {
    console.error("Falha ao aceitar colaboradores pendentes.", error);
    return fail("Não foi possível cadastrar os colaboradores. Tente novamente.");
  }

  if (existingIds.length > 0) {
    await supabase
      .from("company_file_pending_employees")
      .delete()
      .eq("file_id", file.id)
      .in(
        "cpf",
        pending.filter((person) => existingByCpf.has(person.cpf)).map((person) => person.cpf)
      );
  }

  await reprocessTimesheetByFileId(supabase, admin.companyId, file.id);
  revalidateCollaborators(file.id);

  return ok(
    `${pending.length} colaborador${pending.length === 1 ? "" : "es"} aceito${pending.length === 1 ? "" : "s"} e incluído${pending.length === 1 ? "" : "s"} na folha.`
  );
}

function failCreate(
  message: string | null,
  fieldErrors: CreateCollaboratorState["fieldErrors"] = {}
): CreateCollaboratorState {
  return { ok: false, message, fieldErrors, createdAt: null };
}

export async function createManualCollaborator(
  _prev: CreateCollaboratorState,
  formData: FormData
): Promise<CreateCollaboratorState> {
  const parsed = parseCreateCollaboratorForm(formData);

  if (!parsed.success) {
    return failCreate(null, createCollaboratorFieldErrorsFromZod(parsed.error));
  }

  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return failCreate("Supabase não está configurado.");
  }

  const { name, cpf, jobTitle, workScheduleId } = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("employees")
    .select("id")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existingError) {
    console.error("Falha ao conferir CPF do colaborador.", existingError);
    return failCreate("Não foi possível cadastrar o colaborador. Tente novamente.");
  }

  if (existing) {
    return failCreate(null, { cpf: "Este CPF já está cadastrado." });
  }

  if (workScheduleId) {
    const { data: schedule, error: scheduleError } = await supabase
      .from("work_schedules")
      .select("id")
      .eq("id", workScheduleId)
      .eq("company_id", admin.companyId)
      .maybeSingle();

    if (scheduleError || !schedule) {
      return failCreate(null, {
        workScheduleId: "Regra de jornada não encontrada.",
      });
    }
  }

  const { error } = await supabase.from("employees").insert({
    company_id: admin.companyId,
    name,
    cpf,
    role: COLLABORATOR_ROLE,
    job_title: jobTitle,
    work_schedule_id: workScheduleId,
  });

  if (error) {
    if (error.message.includes("employees_cpf") || error.code === "23505") {
      return failCreate(null, { cpf: "Este CPF já está cadastrado." });
    }

    if (error.message.includes("employees_job_title_chk")) {
      return failCreate(null, {
        jobTitle: "Informe um cargo com 2 a 80 caracteres.",
      });
    }

    console.error("Falha ao cadastrar colaborador.", error);
    return failCreate("Não foi possível cadastrar o colaborador. Tente novamente.");
  }

  if (workScheduleId) {
    await reprocessLatestTimesheet(supabase, admin.companyId, { force: true });
  }

  revalidateCollaborators(null);

  return {
    ok: true,
    message: `${name} foi cadastrado.`,
    fieldErrors: {},
    createdAt: Date.now(),
  };
}
