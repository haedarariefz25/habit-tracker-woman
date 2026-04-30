import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=${encodeURIComponent(oauthError)}`, requestUrl.origin),
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=${encodeURIComponent(error.message)}`, requestUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL("/auth/auth-code-error?error=Callback%20tidak%20menerima%20code%20dari%20Supabase", requestUrl.origin),
  );
}
