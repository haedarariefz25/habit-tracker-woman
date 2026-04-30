import Link from "next/link";

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-kicker">Login gagal</div>
        <h1>Session Google belum berhasil dibuat</h1>
        <p>Coba login ulang. Kalau masih gagal, cek redirect URL di Supabase dan Google Cloud.</p>
        {error ? <div className="auth-error">{decodeURIComponent(error)}</div> : null}
        <Link className="auth-link-button" href="/login">
          Kembali ke Login
        </Link>
      </section>
    </main>
  );
}
