import { AuthPanel } from "@/components/auth/auth-panel";
import { CompanyOnboardingForm } from "@/components/onboarding/company-onboarding-form";
import { enforceAccess } from "@/lib/collaborator/access";
import { getCollaboratorSession } from "@/lib/collaborator/session";

export default async function CompanyOnboardingPage() {
  const session = await getCollaboratorSession();
  enforceAccess(session, ["onboarding"]);

  const defaultFullName =
    session?.profile?.fullName?.trim() || session?.profile?.email || "";

  return (
    <AuthPanel
      title="Cadastro da empresa"
      description="Seu perfil foi aceito. Preencha CPF e os dados da empresa para acessar a área de administração."
    >
      <CompanyOnboardingForm defaultFullName={defaultFullName} />
    </AuthPanel>
  );
}
