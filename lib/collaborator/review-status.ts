import {
  REVIEW_ACCEPTED,
  REVIEW_PENDING,
  REVIEW_REJECTED,
  type ReviewStatus,
} from "@/lib/collaborator/types";

export function asReviewStatus(value: string | null | undefined): ReviewStatus {
  if (value === REVIEW_ACCEPTED || value === REVIEW_REJECTED) {
    return value;
  }

  return REVIEW_PENDING;
}
