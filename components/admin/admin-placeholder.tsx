import type { AdminNavItem } from "@/lib/admin/nav";

type AdminPlaceholderProps = {
  item: AdminNavItem;
};

export function AdminPlaceholder({ item }: AdminPlaceholderProps) {
  const Icon = item.icon;

  return (
    <section className="rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
        <Icon className="h-6 w-6 text-cyan-400" />
      </div>
      <h1 className="text-2xl font-bold text-white">{item.label}</h1>
      <p className="mt-2 max-w-xl text-slate-400">{item.description}</p>
      <p className="mt-6 text-sm text-slate-500">
        Esta rota já está reservada para administradores da empresa. A
        funcionalidade será ligada em seguida.
      </p>
    </section>
  );
}
