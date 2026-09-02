import { AuthPanel } from "@/components/auth/auth-panel";
import { enforceAccess } from "@/lib/collaborator/access";
import { getCollaboratorSession } from "@/lib/collaborator/session";

export default async function WaitingPage() {
  const session = await getCollaboratorSession();
  enforceAccess(session, ["waiting", "rejected"]);

  const rejected = session?.profile?.reviewStatus === "REJECTED";

  return (
    <AuthPanel
      title={rejected ? "Perfil não aceito" : "Aguardando análise de perfil"}
      description={
        rejected
          ? "Seu acesso não foi autorizado. Se isso for um engano, fale com quem administra a plataforma."
          : "Seu login foi registrado. Assim que o perfil for aprovado, você poderá cadastrar CPF e empresa."
      }
    />
  );
}
