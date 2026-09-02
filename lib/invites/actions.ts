"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCollaboratorSession } from "@/lib/collaborator/session";
import { HOME_PATH } from "@/lib/collaborator/types";
import { createClient } from "@/lib/supabase/server";

export async function acceptEmployeeInvite(token: string): Promise<string | null> {
  const session = await getCollaboratorSession();

  if (!session) {
    return "Entre com o Google para aceitar o convite.";
  }

  const supabase = await createClient();

  if (!supabase) {
    return "Supabase não está configurado.";
  }

  const { error } = await supabase.rpc("accept_employee_invite", {
    p_token: token,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("invalid_invite")) {
      return "Este convite é inválido ou já expirou.";
    }
    if (message.includes("already_linked")) {
      return "Este colaborador já está vinculado a outra conta.";
    }
    if (message.includes("already_employee")) {
      return "Sua conta já está vinculada a uma empresa.";
    }
    if (message.includes("not_authenticated")) {
      return "Entre com o Google para aceitar o convite.";
    }
    console.error("Falha ao aceitar convite.", error);
    return "Não foi possível aceitar o convite. Tente novamente.";
  }

  revalidatePath("/");
  redirect(HOME_PATH);
}
