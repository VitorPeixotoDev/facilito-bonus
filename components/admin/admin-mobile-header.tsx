"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { getActiveAdminNavItem } from "@/lib/admin/nav";
import { signOut } from "@/lib/auth/actions";
import type { CompanyAdmin } from "@/lib/collaborator/types";

type AdminMobileHeaderProps = {
  admin: CompanyAdmin;
};

export function AdminMobileHeader({ admin }: AdminMobileHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const current = getActiveAdminNavItem(pathname);

  function closeMenu() {
    setOpen(false);
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const menu = open ? (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70"
        aria-label="Fechar menu"
        onClick={closeMenu}
      />
      <div
        id="admin-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 left-0 z-10 flex w-[min(20rem,88vw)] flex-col overflow-y-auto overscroll-contain border-r border-slate-700/50 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id={titleId} className="text-lg font-bold tracking-tight text-white">
              Facilitô! <span className="text-cyan-400">Admin</span>
            </p>
            <p className="mt-3 truncate text-sm font-medium text-white">
              {admin.name}
            </p>
            <p className="truncate text-sm text-slate-400">
              {admin.companyName}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700/50 text-slate-300"
            aria-label="Fechar menu"
            onClick={closeMenu}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          <AdminNav onNavigate={closeMenu} />
        </div>

        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <header className="relative z-40 shrink-0 border-b border-slate-700/50 bg-slate-900/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight text-white">
            Facilitô! <span className="text-cyan-400">Admin</span>
          </p>
          <p className="truncate text-xs text-slate-400">{current.label}</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800 text-slate-200"
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menu ? createPortal(menu, document.body) : null}
    </header>
  );
}
