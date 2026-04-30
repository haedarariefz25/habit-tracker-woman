import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    redirect("/login?setup=missing-env");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardClient
      userId={user.id}
      userEmail={user.email ?? "user"}
      userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Habit Builder"}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
    />
  );
}
