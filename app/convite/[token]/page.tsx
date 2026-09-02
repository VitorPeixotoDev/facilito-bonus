import { AcceptInviteButton } from "@/components/invites/accept-invite-button";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { getCollaboratorSession } from "@/lib/collaborator/session";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getCollaboratorSession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-slate-200">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white">Convite da empresa</h1>
          <p className="text-slate-400">
            {session
              ? "Confirme para se vincular ao cadastro de colaborador."
              : "Entre com o Google para se vincular ao cadastro de colaborador."}
          </p>
        </div>
        {session ? (
          <AcceptInviteButton token={token} />
        ) : (
          <GoogleLoginButton next={`/convite/${token}`} />
        )}
      </section>
    </main>
  );
}
