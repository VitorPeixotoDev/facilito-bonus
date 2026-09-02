import {
  Building2,
  FileUp,
  Gift,
  LayoutDashboard,
  Link2,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Visão geral",
    icon: LayoutDashboard,
    description: "Resumo da empresa e atalhos de administração.",
  },
  {
    href: "/admin/colaboradores",
    label: "Colaboradores",
    icon: Users,
    description:
      "Lista da empresa: bônus por mês, cargo, regra, convites e exclusão.",
  },
  {
    href: "/admin/arquivos",
    label: "Folha de ponto",
    icon: FileUp,
    description: "Upload da folha de ponto, histórico por mês e aceite de colaboradores novos.",
  },
  {
    href: "/admin/regras",
    label: "Regras",
    icon: ListChecks,
    description:
      "Escalas de trabalho, folgas e variáveis para interpretar o ponto e calcular o bônus.",
  },
  {
    href: "/admin/convites",
    label: "Convites",
    icon: Link2,
    description: "Links de convite restritos à empresa.",
  },
    {
    href: "/admin/empresa",
    label: "Empresa",
    icon: Building2,
    description: "Cadastro e dados da empresa.",
  },
];

export const BONUS_HOME_ITEM = {
  href: "/",
  label: "Meu bônus",
  icon: Gift,
} as const;

export function getAdminNavItem(href: string): AdminNavItem {
  const item = ADMIN_NAV_ITEMS.find((entry) => entry.href === href);

  if (!item) {
    throw new Error(`Rota de admin desconhecida: ${href}`);
  }

  return item;
}

export function isActiveAdminPath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveAdminNavItem(pathname: string): AdminNavItem {
  const active = ADMIN_NAV_ITEMS.find((item) =>
    isActiveAdminPath(pathname, item.href)
  );

  return active ?? getAdminNavItem("/admin");
}
