"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/env";

export async function signInWithGoogle() {
  if (!hasSupabaseEnv()) {
    redirect("/login?setup=missing-env");
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const siteUrl = headerStore.get("origin") ?? getSiteUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect("/login?error=Google%20login%20tidak%20mengembalikan%20URL");
}

export async function signOut() {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
