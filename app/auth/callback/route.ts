import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

function getRequestOrigin(request: NextRequest) {
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return new URL(request.url).origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function redirectToLogin(request: NextRequest, errorCode = "auth") {
  return NextResponse.redirect(
    `${getRequestOrigin(request)}/login?error=${errorCode}`
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  if (oauthError || !code) {
    console.error("OAuth callback without code", {
      error: oauthError,
      errorCode: searchParams.get("error_code"),
      errorDescription: searchParams.get("error_description"),
    });
    return redirectToLogin(request);
  }

  const env = getSupabaseEnv();

  if (!env) {
    return redirectToLogin(request, "config");
  }

  const successRedirect = NextResponse.redirect(
    `${getRequestOrigin(request)}${next}`
  );

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successRedirect.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          successRedirect.headers.set(key, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth exchangeCodeForSession failed", error);
    return redirectToLogin(request);
  }

  return successRedirect;
}
