"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle(
  _prev: string | null,
  formData?: FormData
): Promise<string | null> {
  const supabase = await createClient();

  if (!supabase) {
    return "Supabase não está configurado.";
  }

  const origin =
    (await headers()).get("origin") ?? "http://127.0.0.1:3000";
  const nextRaw = String(formData?.get("next") ?? "/");
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return "Não foi possível iniciar o login com o Google.";
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}
