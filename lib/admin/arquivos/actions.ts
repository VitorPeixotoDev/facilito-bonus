"use server";

import { revalidatePath } from "next/cache";
import {
  decodeAejText,
  parseAejCollaborators,
} from "@/lib/admin/arquivos/aej-employees";
import {
  parseAejTimesheet,
  timesheetPeriod,
} from "@/lib/admin/arquivos/aej-timesheet";
import {
  COMPANY_FILES_BUCKET,
  COMPANY_FILE_FIELD,
  COMPANY_FILE_MAX_BYTES,
  COMPANY_FILE_MAX_LABEL,
  COMPANY_FILE_PURPOSES,
  isTxtFileName,
  originalFileName,
} from "@/lib/admin/arquivos/constants";
import { companyHasRegisteredCollaborators } from "@/lib/admin/arquivos/queries";
import { syncImportedEmployees } from "@/lib/admin/arquivos/sync-employees";
import { syncTimesheetBonuses } from "@/lib/admin/arquivos/sync-timesheets";
import type { UploadCompanyFileState } from "@/lib/admin/arquivos/types";
import { isMissingPeriodColumn } from "@/lib/admin/arquivos/company-file-columns";
import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): UploadCompanyFileState {
  return {
    ok: false,
    message,
    uploadedAt: null,
    purpose: null,
    fileId: null,
    collaborators: [],
    pending: [],
    processed: 0,
  };
}

function timesheetMessage(
  name: string,
  processed: number,
  pendingCount: number
): string {
  const bonus =
    processed === 0
      ? `Arquivo ${name} enviado. Nenhum colaborador com regra atribuída foi encontrado no arquivo.`
      : `Bônus atualizado para ${processed} colaborador${processed === 1 ? "" : "es"} com regra atribuída.`;

  if (pendingCount === 0) {
    return bonus;
  }

  return `${bonus} ${pendingCount} colaborador${pendingCount === 1 ? "" : "es"} novo${pendingCount === 1 ? "" : "s"} aguardando aceite.`;
}

export async function uploadCompanyFile(
  _prev: UploadCompanyFileState,
  formData: FormData
): Promise<UploadCompanyFileState> {
  const admin = await requireCompanyAdmin();
  const entry = formData.get(COMPANY_FILE_FIELD);

  if (!(entry instanceof File) || entry.size === 0) {
    return fail("Selecione um arquivo TXT para enviar.");
  }

  const name = originalFileName(entry.name);

  if (!isTxtFileName(name)) {
    return fail("Envie apenas arquivos .txt.");
  }

  if (entry.size > COMPANY_FILE_MAX_BYTES) {
    return fail(`O arquivo deve ter no máximo ${COMPANY_FILE_MAX_LABEL}.`);
  }

  const bytes = await entry.arrayBuffer();
  const decoded = decodeAejText(bytes);
  const collaborators = parseAejCollaborators(decoded);

  if (collaborators.length === 0) {
    return fail(
      "Não encontramos colaboradores (CPF e nome) neste TXT. Confira se o arquivo é um AEJ com o bloco 03."
    );
  }

  const sheet = parseAejTimesheet(decoded);
  const period = timesheetPeriod(sheet);
  const hasPunches = Boolean(period && sheet.punches.length > 0);
  const purposeValue = hasPunches
    ? COMPANY_FILE_PURPOSES.ponto
    : COMPANY_FILE_PURPOSES.colaboradores;

  const supabase = await createClient();

  if (!supabase) {
    return fail("Supabase não está configurado.");
  }

  const id = crypto.randomUUID();
  const storagePath = `${admin.companyId}/${id}.txt`;

  const { error: uploadError } = await supabase.storage
    .from(COMPANY_FILES_BUCKET)
    .upload(storagePath, bytes, {
      contentType: "text/plain",
      upsert: false,
    });

  if (uploadError) {
    console.error("Falha ao enviar arquivo para o Storage.", uploadError);
    return fail("Não foi possível enviar o arquivo. Tente novamente.");
  }

  const record = {
    id,
    company_id: admin.companyId,
    uploaded_by: admin.employeeId,
    original_name: name,
    storage_path: storagePath,
    size_bytes: entry.size,
    purpose: purposeValue,
    period_start: period?.periodStart ?? null,
    period_end: period?.periodEnd ?? null,
  };

  let { error: insertError } = await supabase.from("company_files").insert(record);

  if (isMissingPeriodColumn(insertError)) {
    const { period_start: _start, period_end: _end, ...legacyRecord } = record;
    const fallback = await supabase.from("company_files").insert(legacyRecord);
    insertError = fallback.error;
  }

  if (insertError) {
    console.error("Falha ao gravar metadados do arquivo.", insertError);
    await supabase.storage.from(COMPANY_FILES_BUCKET).remove([storagePath]);
    return fail("Não foi possível gravar o arquivo. Tente novamente.");
  }

  const hasCollaborators = await companyHasRegisteredCollaborators();
  let registered: typeof collaborators = [];
  let pending: typeof collaborators = [];

  try {
    const synced = await syncImportedEmployees(
      supabase,
      admin.companyId,
      id,
      collaborators,
      { registerNew: !hasCollaborators }
    );
    registered = synced.registered;
    pending = synced.pending;
  } catch (error) {
    console.error("Falha ao cadastrar colaboradores do arquivo.", error);
  }

  let processed = 0;
  let pontoMessage: string | null = null;

  if (hasPunches) {
    try {
      const result = await syncTimesheetBonuses(
        supabase,
        admin.companyId,
        id,
        decoded
      );
      processed = result.processed;
      pontoMessage = timesheetMessage(name, processed, pending.length);
    } catch (error) {
      console.error("Falha ao calcular o bônus do arquivo de ponto.", error);
      pontoMessage =
        "Arquivo enviado, mas não foi possível calcular o bônus. Tente novamente.";
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/arquivos");
  revalidatePath("/admin/colaboradores", "layout");
  revalidatePath(`/admin/arquivos/${id}/colaboradores`);

  const registeredMessage =
    registered.length > 0
      ? `${registered.length} colaborador${registered.length === 1 ? "" : "es"} cadastrado${registered.length === 1 ? "" : "s"} em ${name}.`
      : null;
  const pendingOnlyMessage =
    pending.length > 0
      ? `${pending.length} colaborador${pending.length === 1 ? "" : "es"} novo${pending.length === 1 ? "" : "s"} aguardando aceite.`
      : `Arquivo ${name} enviado.`;
  const message = [registeredMessage, pontoMessage]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return {
    ok: true,
    message: message || pendingOnlyMessage,
    uploadedAt: Date.now(),
    purpose: purposeValue,
    fileId: id,
    collaborators: registered,
    pending,
    processed,
  };
}

export async function deleteCompanyFileHistory(
  fileId: string
): Promise<{ ok: boolean; message: string }> {
  const admin = await requireCompanyAdmin();
  const supabase = await createClient();

  if (!supabase) {
    return { ok: false, message: "Supabase não está configurado." };
  }

  const { data: file, error: loadError } = await supabase
    .from("company_files")
    .select("id")
    .eq("id", fileId)
    .eq("company_id", admin.companyId)
    .maybeSingle();

  if (loadError || !file) {
    return { ok: false, message: "Registro histórico não encontrado." };
  }

  const { error } = await supabase.from("company_files").delete().eq("id", file.id);

  if (error) {
    console.error("Falha ao excluir histórico do arquivo.", error);
    return { ok: false, message: "Não foi possível excluir o histórico. Tente novamente." };
  }

  revalidatePath("/admin/arquivos");
  revalidatePath("/admin/colaboradores");
  revalidatePath(`/admin/arquivos/${file.id}/colaboradores`);

  return { ok: true, message: "Registro histórico excluído. O arquivo original não foi apagado." };
}
