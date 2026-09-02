import { redirect } from "next/navigation";
import { requireCompanyAdminDestination } from "@/lib/collaborator/access";
import { toCompanyAdmin } from "@/lib/collaborator/company-admin";
import { getCollaboratorSession } from "@/lib/collaborator/session";
import type { CompanyAdmin } from "@/lib/collaborator/types";

export async function requireCompanyAdmin(): Promise<CompanyAdmin> {
  const session = await getCollaboratorSession();

  if (!session) {
    redirect("/login");
  }

  requireCompanyAdminDestination(session);

  const admin = toCompanyAdmin(session);

  if (!admin) {
    redirect("/");
  }

  return admin;
}
