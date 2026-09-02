import { cache } from "react";
import { toCollaboratorRecord } from "@/lib/collaborator/company-admin";
import { asReviewStatus } from "@/lib/collaborator/review-status";
import type { CollaboratorSession } from "@/lib/collaborator/types";
import { createClient } from "@/lib/supabase/server";

type CompanyJoin = { name: string } | { name: string }[] | null;

function readCompanyName(companies: CompanyJoin): string {
  if (!companies) {
    return "Empresa";
  }

  if (Array.isArray(companies)) {
    return companies[0]?.name ?? "Empresa";
  }

  return companies.name;
}

export const getCollaboratorSession = cache(
  async (): Promise<CollaboratorSession | null> => {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (typeof userId !== "string") {
    return null;
  }

  const [{ data: profile }, { data: employee }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, review_status")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id, name, role, company_id, companies(name)")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    userId,
    profile: profile
      ? {
          fullName: profile.full_name,
          email: profile.email,
          reviewStatus: asReviewStatus(profile.review_status),
        }
      : null,
    collaborator: employee
      ? toCollaboratorRecord({
          employeeId: employee.id,
          companyId: employee.company_id,
          companyName: readCompanyName(employee.companies as CompanyJoin),
          name: employee.name,
          role: employee.role,
        })
      : null,
  };
  }
);
