import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';

type DashboardProps = { searchParams: Promise<{ success?: string }> };

export default async function Dashboard({ searchParams }: DashboardProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('full_name, role, active').eq('id', userId).maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect('/login?error=Your%20account%20is%20inactive');
  }

  const params = await searchParams;

  return (
    <main className="dashboardPage">
      {params.success && <div className="loginAlert loginAlertSuccess" role="alert"><span>✓</span><div><strong>Sign in successful</strong><p>{params.success}</p></div></div>}
      <section className="dashboardCard">
        <div className="brandMark large"><b>J</b><strong>BE</strong><i /></div>
        <span className="miniLabel">JBE DIGITAL + GAMING</span>
        <h1>Welcome</h1>
        <p>Signed in as <strong>{profile.role}</strong>.</p>
        <div className="dashboardActions">
          <a href="/" className="backBtn">← View catalog</a>
          <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
        </div>
      </section>
    </main>
  );
}
