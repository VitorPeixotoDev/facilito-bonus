"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enforceAccess } from "@/lib/collaborator/access";
import { getCollaboratorSession } from "@/lib/collaborator/session";
import { ADMIN_PATH } from "@/lib/collaborator/types";
import {
  fieldErrorsFromZod,
  parseCompanyOnboardingForm,
  type CompanyOnboardingState,
} from "@/lib/onboarding/schema";
import { createClient } from "@/lib/supabase/server";

const RPC_ERRORS: Record<string, string> = {
  not_authenticated: "Sessão expirada. Entre novamente.",
  profile_not_found: "Perfil não encontrado.",
  profile_not_accepted: "Seu perfil ainda não foi aceito.",
  already_employee: "Você já está vinculado a uma empresa.",
  invalid_name: "Informe o seu nome completo.",
  invalid_cpf: "Informe um CPF válido.",
  invalid_company_name: "Informe o nome da empresa.",
  invalid_cnpj: "Informe um CNPJ válido.",
  duplicate_cpf: "Este CPF já está cadastrado.",
  duplicate_cnpj: "Este CNPJ já está cadastrado.",
  duplicate_record: "CPF ou CNPJ já cadastrado.",
};

function readRpcError(message: string): CompanyOnboardingState {
  if (message.includes("duplicate_cpf")) {
    return {
      message: null,
      fieldErrors: { cpf: RPC_ERRORS.duplicate_cpf },
    };
  }

  if (message.includes("duplicate_cnpj")) {
    return {
      message: null,
      fieldErrors: { cnpj: RPC_ERRORS.duplicate_cnpj },
    };
  }

  for (const [code, label] of Object.entries(RPC_ERRORS)) {
    if (message.includes(code)) {
      return { message: label, fieldErrors: {} };
    }
  }

  return {
    message: "Não foi possível concluir o cadastro. Tente novamente.",
    fieldErrors: {},
  };
}

export async function completeCompanyAdminOnboarding(
  _prev: CompanyOnboardingState,
  formData: FormData
): Promise<CompanyOnboardingState> {
  const session = await getCollaboratorSession();
  enforceAccess(session, ["onboarding"]);

  const parsed = parseCompanyOnboardingForm(formData);

  if (!parsed.success) {
    return {
      message: null,
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      message: "Supabase não está configurado.",
      fieldErrors: {},
    };
  }

  const { fullName, cpf, companyName, cnpj } = parsed.data;
  const { error } = await supabase.rpc("complete_company_admin_onboarding", {
    p_full_name: fullName,
    p_cpf: cpf,
    p_company_name: companyName,
    p_cnpj: cnpj,
  });

  if (error) {
    return readRpcError(error.message);
  }

  revalidatePath("/", "layout");
  redirect(ADMIN_PATH);
}
