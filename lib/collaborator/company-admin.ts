import {
  COLLABORATOR_ROLE,
  COMPANY_ADMIN_ROLE,
  type CollaboratorRecord,
  type CollaboratorRole,
  type CollaboratorSession,
  type CompanyAdmin,
} from "@/lib/collaborator/types";

export function isCompanyAdminRole(
  role: string | null | undefined
): role is typeof COMPANY_ADMIN_ROLE {
  return role === COMPANY_ADMIN_ROLE;
}

function asCollaboratorRole(role: string): CollaboratorRole {
  return isCompanyAdminRole(role) ? COMPANY_ADMIN_ROLE : COLLABORATOR_ROLE;
}

export function toCollaboratorRecord(input: {
  employeeId: string;
  companyId: string;
  companyName: string;
  name: string;
  role: string;
}): CollaboratorRecord {
  return {
    employeeId: input.employeeId,
    companyId: input.companyId,
    companyName: input.companyName,
    name: input.name,
    role: asCollaboratorRole(input.role),
  };
}

/**
 * Converte o colaborador logado em admin da empresa
 * apenas quando `employees.role` está como ADMIN no banco.
 */
export function toCompanyAdmin(
  session: CollaboratorSession
): CompanyAdmin | null {
  const collaborator = session.collaborator;

  if (!collaborator || !isCompanyAdminRole(collaborator.role)) {
    return null;
  }

  return {
    userId: session.userId,
    employeeId: collaborator.employeeId,
    companyId: collaborator.companyId,
    companyName: collaborator.companyName,
    name: collaborator.name,
  };
}
