import { redirect } from "next/navigation";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { enforceAccess, getAccessKind } from "@/lib/collaborator/access";
import { getCollaboratorSession } from "@/lib/collaborator/session";
import { getEmployeeDashboard } from "@/lib/dashboard/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();

  if (supabase) {
    const session = await getCollaboratorSession();

    if (!session) {
      redirect("/login");
    }

    enforceAccess(session, ["employee", "company_admin"]);
  }

  const { mes } = await searchParams;
  const [data, session] = await Promise.all([
    getEmployeeDashboard(mes),
    getCollaboratorSession(),
  ]);

  return (
    <EmployeeDashboard
      data={data}
      showSignOut={Boolean(supabase)}
      showAdminLink={getAccessKind(session) === "company_admin"}
    />
  );
}
