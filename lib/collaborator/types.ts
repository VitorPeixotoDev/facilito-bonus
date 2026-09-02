export const COMPANY_ADMIN_ROLE = "ADMIN";
export const COLLABORATOR_ROLE = "EMPLOYEE";

export const REVIEW_PENDING = "PENDING";
export const REVIEW_ACCEPTED = "ACCEPTED";
export const REVIEW_REJECTED = "REJECTED";

export type CollaboratorRole = typeof COMPANY_ADMIN_ROLE | typeof COLLABORATOR_ROLE;

export type ReviewStatus =
  | typeof REVIEW_PENDING
  | typeof REVIEW_ACCEPTED
  | typeof REVIEW_REJECTED;

export type CollaboratorProfile = {
  fullName: string | null;
  email: string | null;
  reviewStatus: ReviewStatus;
};

export type CollaboratorRecord = {
  employeeId: string;
  companyId: string;
  companyName: string;
  name: string;
  role: CollaboratorRole;
};

export type CollaboratorSession = {
  userId: string;
  profile: CollaboratorProfile | null;
  collaborator: CollaboratorRecord | null;
};

export type CompanyAdmin = {
  userId: string;
  employeeId: string;
  companyId: string;
  companyName: string;
  name: string;
};

export const WAITING_PATH = "/aguardando";
export const ONBOARDING_PATH = "/cadastro-empresa";
export const ADMIN_PATH = "/admin";
export const HOME_PATH = "/";
