import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { getAdminNavItem } from "@/lib/admin/nav";

export default function AdminInvitesPage() {
  return <AdminPlaceholder item={getAdminNavItem("/admin/convites")} />;
}
