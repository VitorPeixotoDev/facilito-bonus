import { signOut } from "@/lib/auth/actions";

type AuthPanelProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function AuthPanel({ title, description, children }: AuthPanelProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-slate-200">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <p className="text-lg font-bold tracking-tight text-white">
            Facilitô! <span className="text-cyan-400">Bônus</span>
          </p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-slate-400">{description}</p>
        </div>
        {children}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-xl border border-slate-700/50 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Sair
          </button>
        </form>
      </section>
    </main>
  );
}
