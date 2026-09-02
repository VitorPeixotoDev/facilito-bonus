import { Clock } from "lucide-react";
import { WorkSchedulesPanel } from "@/components/admin/work-schedules-panel";
import { getAdminNavItem } from "@/lib/admin/nav";
import { listWorkSchedules } from "@/lib/admin/regras/queries";

export default async function AdminRulesPage() {
  const item = getAdminNavItem("/admin/regras");
  const schedules = await listWorkSchedules();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
          <Clock className="h-6 w-6 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">{item.label}</h1>
        <p className="mt-2 max-w-xl text-slate-400">{item.description}</p>
      </section>

      <WorkSchedulesPanel schedules={schedules} />
    </div>
  );
}
