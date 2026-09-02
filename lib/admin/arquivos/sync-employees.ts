import type { ParsedCollaborator } from "@/lib/admin/arquivos/aej-employees";
import { COLLABORATOR_ROLE } from "@/lib/collaborator/types";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppSupabaseClient = SupabaseClient<Database>;

const CPF_CHUNK = 100;

export type SyncEmployeesResult = {
  registered: ParsedCollaborator[];
  pending: ParsedCollaborator[];
};

async function listExistingCpfs(
  supabase: AppSupabaseClient,
  companyId: string,
  collaborators: ParsedCollaborator[]
): Promise<Set<string>> {
  const existingCpfs = new Set<string>();

  for (let index = 0; index < collaborators.length; index += CPF_CHUNK) {
    const chunk = collaborators.slice(index, index + CPF_CHUNK);
    const { data, error } = await supabase
      .from("employees")
      .select("cpf")
      .eq("company_id", companyId)
      .in(
        "cpf",
        chunk.map((person) => person.cpf)
      );

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      existingCpfs.add(row.cpf);
    }
  }

  return existingCpfs;
}

async function insertEmployees(
  supabase: AppSupabaseClient,
  companyId: string,
  people: ParsedCollaborator[],
  workScheduleId: string | null
): Promise<void> {
  if (people.length === 0) {
    return;
  }

  const toInsert = people.map((person) => ({
    company_id: companyId,
    cpf: person.cpf,
    name: person.name,
    role: COLLABORATOR_ROLE,
    work_schedule_id: workScheduleId,
  }));

  const { error } = await supabase.from("employees").insert(toInsert);

  if (!error) {
    return;
  }

  for (const row of toInsert) {
    const { error: insertError } = await supabase.from("employees").insert(row);
    if (insertError) {
      console.error("Falha ao cadastrar colaborador importado.", insertError);
    }
  }
}

async function linkEmployeesByCpf(
  supabase: AppSupabaseClient,
  companyId: string,
  fileId: string,
  collaborators: ParsedCollaborator[]
): Promise<string[]> {
  const employeeIds: string[] = [];

  for (let index = 0; index < collaborators.length; index += CPF_CHUNK) {
    const chunk = collaborators.slice(index, index + CPF_CHUNK);
    const { data, error } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", companyId)
      .in(
        "cpf",
        chunk.map((person) => person.cpf)
      );

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      employeeIds.push(row.id);
    }
  }

  if (employeeIds.length === 0) {
    return [];
  }

  const { error: linkError } = await supabase.from("company_file_employees").upsert(
    employeeIds.map((employeeId) => ({
      file_id: fileId,
      employee_id: employeeId,
    })),
    { onConflict: "file_id,employee_id" }
  );

  if (linkError) {
    throw linkError;
  }

  return employeeIds;
}

export async function savePendingCollaborators(
  supabase: AppSupabaseClient,
  fileId: string,
  pending: ParsedCollaborator[]
): Promise<void> {
  if (pending.length === 0) {
    return;
  }

  const { error } = await supabase.from("company_file_pending_employees").upsert(
    pending.map((person) => ({
      file_id: fileId,
      cpf: person.cpf,
      name: person.name,
    })),
    { onConflict: "file_id,cpf" }
  );

  if (error) {
    throw error;
  }
}

export async function syncImportedEmployees(
  supabase: AppSupabaseClient,
  companyId: string,
  fileId: string,
  collaborators: ParsedCollaborator[],
  options: { registerNew: boolean } = { registerNew: true }
): Promise<SyncEmployeesResult> {
  const existingCpfs = await listExistingCpfs(supabase, companyId, collaborators);
  const unknown = collaborators.filter((person) => !existingCpfs.has(person.cpf));
  const known = collaborators.filter((person) => existingCpfs.has(person.cpf));

  if (options.registerNew) {
    await insertEmployees(supabase, companyId, unknown, null);
    await linkEmployeesByCpf(supabase, companyId, fileId, collaborators);
    return { registered: unknown, pending: [] };
  }

  await linkEmployeesByCpf(supabase, companyId, fileId, known);
  await savePendingCollaborators(supabase, fileId, unknown);
  return { registered: [], pending: unknown };
}

export async function registerPendingCollaborators(
  supabase: AppSupabaseClient,
  companyId: string,
  fileId: string,
  people: ParsedCollaborator[],
  workScheduleId: string
): Promise<string[]> {
  await insertEmployees(supabase, companyId, people, workScheduleId);
  const employeeIds = await linkEmployeesByCpf(
    supabase,
    companyId,
    fileId,
    people
  );
  const registeredCpfs = await listExistingCpfs(supabase, companyId, people);
  const acceptedCpfs = people
    .filter((person) => registeredCpfs.has(person.cpf))
    .map((person) => person.cpf);

  if (acceptedCpfs.length > 0) {
    const { error } = await supabase
      .from("company_file_pending_employees")
      .delete()
      .eq("file_id", fileId)
      .in("cpf", acceptedCpfs);

    if (error) {
      throw error;
    }
  }

  return employeeIds;
}
