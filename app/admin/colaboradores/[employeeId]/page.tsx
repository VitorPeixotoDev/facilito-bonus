import { notFound } from "next/navigation";
import { CollaboratorDetailView } from "@/components/admin/collaborator-detail";
import { requestedAnalysisMonth } from "@/lib/admin/arquivos/month-preference";
import { getCollaboratorDetail } from "@/lib/admin/arquivos/queries";

export const dynamic = "force-dynamic";

export default async function AdminCollaboratorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { employeeId } = await params;
  const { mes } = await searchParams;
  const collaborator = await getCollaboratorDetail(
    employeeId,
    await requestedAnalysisMonth(mes)
  );

  if (!collaborator) {
    notFound();
  }

  return <CollaboratorDetailView collaborator={collaborator} />;
}
