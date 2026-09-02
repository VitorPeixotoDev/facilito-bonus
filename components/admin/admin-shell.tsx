import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "@/lib/auth/actions";
import type { CompanyAdmin } from "@/lib/collaborator/types";

type AdminShellProps = {
  admin: CompanyAdmin;
  children: React.ReactNode;
};

export function AdminShell({ admin, children }: AdminShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-900 text-slate-200">
      <Suspense
        fallback={
          <header className="shrink-0 border-b border-slate-700/50 px-4 py-3 md:hidden">
            <div className="h-11 rounded-xl bg-slate-800" />
          </header>
        }
      >
        <AdminMobileHeader admin={admin} />
      </Suspense>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col md:flex-row md:gap-6 md:p-10">
        <aside className="hidden w-64 shrink-0 overflow-y-auto overscroll-contain md:block">
          <div className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-5">
            <p className="text-lg font-bold tracking-tight text-white">
              Facilitô! <span className="text-cyan-400">Admin</span>
            </p>
            <p className="mt-3 text-sm font-medium text-white">{admin.name}</p>
            <p className="text-sm text-slate-400">{admin.companyName}</p>
            <div className="mt-4">
              <Suspense fallback={<div className="h-40 rounded-xl bg-slate-800" />}>
                <AdminNav />
              </Suspense>
            </div>
            <form action={signOut} className="mt-4">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
