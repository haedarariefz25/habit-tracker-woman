import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { signInWithGoogle } from "@/app/actions/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setup?: string }>;
}) {
  const params = await searchParams;

  if (!hasSupabaseEnv()) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-kicker">Setup Supabase</div>
          <h1>Isi dulu file .env.local</h1>
          <p>File .env.local kamu masih kosong, jadi login Google belum bisa dijalankan.</p>
          <div className="env-sample">
            <code>NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co</code>
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx</code>
            <code>NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000</code>
          </div>
          <div className="auth-footnote">
            <Sparkles size={16} />
            Setelah disimpan, restart dev server supaya env terbaca.
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-kicker">My Habit Tracker</div>
        <h1>Masuk dulu, lalu bangun habit terbaikmu</h1>
        <p>Login dengan Google supaya dashboard kamu aman dan session tersimpan lewat Supabase.</p>

        {params.error ? <div className="auth-error">{decodeURIComponent(params.error)}</div> : null}

        <form action={signInWithGoogle}>
          <button className="google-button" type="submit">
            <span className="google-mark">G</span>
            Masuk dengan Google
          </button>
        </form>

        <div className="auth-footnote">
          <Sparkles size={16} />
          Data checklist habit saat ini tetap tersimpan di browser kamu.
        </div>
      </section>
    </main>
  );
}
