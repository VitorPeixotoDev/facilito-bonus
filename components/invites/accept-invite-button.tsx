"use client";

import { useActionState } from "react";
import { acceptEmployeeInvite } from "@/lib/invites/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, action, pending] = useActionState(
    async (_prev: string | null) => acceptEmployeeInvite(token),
    null
  );

  return (
    <form action={action} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Entrando..." : "Aceitar convite"}
      </button>
      {error ? (
        <p className="text-center text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
