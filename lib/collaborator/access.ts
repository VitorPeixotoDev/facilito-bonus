import { redirect } from "next/navigation";
import { toCompanyAdmin } from "@/lib/collaborator/company-admin";
import { asReviewStatus } from "@/lib/collaborator/review-status";
import {
  ADMIN_PATH,
  HOME_PATH,
  ONBOARDING_PATH,
  REVIEW_ACCEPTED,
  REVIEW_REJECTED,
  WAITING_PATH,
  type CollaboratorSession,
} from "@/lib/collaborator/types";

export type AccessKind =
  | "anonymous"
  | "waiting"
  | "rejected"
  | "onboarding"
  | "employee"
  | "company_admin";

export function getAccessKind(session: CollaboratorSession | null): AccessKind {
  if (!session) {
    return "anonymous";
  }

  if (toCompanyAdmin(session)) {
    return "company_admin";
  }

  if (session.collaborator) {
    return "employee";
  }

  const reviewStatus = asReviewStatus(session.profile?.reviewStatus);

  if (reviewStatus === REVIEW_ACCEPTED) {
    return "onboarding";
  }

  if (reviewStatus === REVIEW_REJECTED) {
    return "rejected";
  }

  return "waiting";
}

export function getDestination(session: CollaboratorSession | null): string {
  switch (getAccessKind(session)) {
    case "anonymous":
      return "/login";
    case "company_admin":
    case "employee":
      return HOME_PATH;
    case "onboarding":
      return ONBOARDING_PATH;
    case "waiting":
    case "rejected":
      return WAITING_PATH;
    default:
      return WAITING_PATH;
  }
}

export function enforceAccess(
  session: CollaboratorSession | null,
  allowed: AccessKind[]
) {
  const kind = getAccessKind(session);

  if (!allowed.includes(kind)) {
    redirect(getDestination(session));
  }
}

export function requireCompanyAdminDestination(
  session: CollaboratorSession | null
) {
  if (getAccessKind(session) !== "company_admin") {
    const destination = getDestination(session);
    redirect(destination === ADMIN_PATH ? HOME_PATH : destination);
  }
}
