import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { getAdminNavItem } from "@/lib/admin/nav";

export default function AdminCompanyPage() {
  return <AdminPlaceholder item={getAdminNavItem("/admin/empresa")} />;
}
