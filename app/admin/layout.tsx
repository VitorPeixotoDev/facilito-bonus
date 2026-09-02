import { AdminShell } from "@/components/admin/admin-shell";
import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireCompanyAdmin();

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
