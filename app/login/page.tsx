import { GoogleLoginButton } from "@/components/auth/google-login-button";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Falha ao concluir o login. Tente novamente.",
  oauth: "Não foi possível iniciar o login com o Google.",
  config: "Supabase não está configurado.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-slate-200">
      <section className="w-full max-w-md space-y-8 rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Facilitô!{" "}
            <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
              Bônus
            </span>
          </h1>
          <p className="text-slate-400">
            Entre com sua conta Google para acompanhar suas metas.
          </p>
        </div>

        {errorMessage ? (
          <p
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-300"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <GoogleLoginButton />
      </section>
    </main>
  );
}
