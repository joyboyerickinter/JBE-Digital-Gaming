import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';
import { changePassword } from './actions';

type ProfilePageProps = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const [{ data: profile }, { data: user }] = await Promise.all([
    supabase.from('profiles').select('full_name, role, active').eq('id', userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect('/login?error=Your%20account%20is%20inactive');
  }

  const params = await searchParams;

  return (
    <main className="dashboardPage">
      <div className="dashboardWrap">
        <header className="dashboardTopbar">
          <Link href="/dashboard" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></Link>
          <div className="dashboardTopActions">
            <Link href="/dashboard" className="adminBtn">Dashboard</Link>
            <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="profilePageHead">
          <div><span className="miniLabel">ACCOUNT</span><h1>Profile</h1><p>Manage your account information and password.</p></div>
        </section>

        {params.success && <div className="loginAlert loginAlertSuccess" role="alert"><span>✓</span><div><strong>Success</strong><p>{params.success}</p></div></div>}
        {params.error && <div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Could not update password</strong><p>{params.error}</p></div></div>}

        <section className="profileGrid">
          <article className="profileCard">
            <span className="cardKicker">ACCOUNT INFORMATION</span>
            <h2>My account</h2>
            <div className="profileInfoList">
              <div><span>Name</span><strong>{profile.full_name || 'Not set'}</strong></div>
              <div><span>Email</span><strong>{user.user?.email || 'Not available'}</strong></div>
              <div><span>Role</span><strong>{profile.role === 'admin' ? 'Admin' : 'Reseller'}</strong></div>
              <div><span>Status</span><strong>{profile.active ? 'Active' : 'Inactive'}</strong></div>
            </div>
          </article>

          <article className="profileCard">
            <span className="cardKicker">SECURITY</span>
            <h2>Change password</h2>
            <p className="profileDescription">Enter your current password, then choose a new password for your account.</p>
            <form action={changePassword} className="profileForm">
              <label><span>Current password</span><input name="currentPassword" type="password" autoComplete="current-password" required /></label>
              <label><span>New password</span><input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
              <label><span>Confirm new password</span><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
              <p className="profilePasswordHint">Minimum 8 characters.</p>
              <button className="adminPrimaryBtn" type="submit">Update password</button>
            </form>
          </article>
        </section>

        <footer className="dashboardFooter"><span>JBE Digital + Gaming</span><span>Account security</span></footer>
      </div>
    </main>
  );
}
