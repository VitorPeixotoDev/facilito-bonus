import Link from "next/link";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav";
import { requireCompanyAdmin } from "@/lib/collaborator/require-company-admin";

export default async function AdminHomePage() {
  const admin = await requireCompanyAdmin();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-400">
          Administrador da empresa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {admin.companyName}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Você está autenticado como colaborador e o banco marcou seu papel como
          ADMIN. Esta área vale só para a empresa vinculada à sua ficha.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin").map(
          (item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-5 transition hover:border-cyan-400/40 hover:bg-slate-800"
              >
                <Icon className="mb-3 h-5 w-5 text-cyan-400" />
                <h2 className="font-semibold text-white">{item.label}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {item.description}
                </p>
              </Link>
            );
          }
        )}
      </div>
    </div>
  );
}
