"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV_ITEMS,
  BONUS_HOME_ITEM,
  isActiveAdminPath,
} from "@/lib/admin/nav";

type AdminNavProps = {
  onNavigate?: () => void;
};

export function AdminNav({ onNavigate }: AdminNavProps) {
  const pathname = usePathname();
  const BonusIcon = BONUS_HOME_ITEM.icon;

  return (
    <nav className="flex flex-col gap-1" aria-label="Seções do admin">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActiveAdminPath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-cyan-400/15 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}

      <Link
        href={BONUS_HOME_ITEM.href}
        onClick={onNavigate}
        className="mt-4 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
      >
        <BonusIcon className="h-4 w-4 shrink-0" />
        {BONUS_HOME_ITEM.label}
      </Link>
    </nav>
  );
}
