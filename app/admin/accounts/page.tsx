import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logout } from '@/app/login/actions';
import { createReseller, updateReseller } from './actions';
import CreateResellerForm from './CreateResellerForm';

type Props = { searchParams: Promise<{ success?: string; error?: string }> };
type Profile = { id: string; full_name: string | null; role: 'admin' | 'reseller'; active: boolean; created_at: string };

export default async function AccountsAdmin({ searchParams }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', String(data.claims.sub))
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect('/login?error=Your%20account%20is%20inactive');
  }
  if (profile.role !== 'admin') redirect('/dashboard');

  const admin = createAdminClient();
  const [{ data: profiles }, { data: usersData }] = await Promise.all([
    admin.from('profiles').select('id,full_name,role,active,created_at').order('created_at'),
    admin.auth.admin.listUsers({ page: 1, perPage: 100 }),
  ]);

  const profileList = (profiles ?? []) as Profile[];
  const userEmailMap = new Map((usersData?.users ?? []).map(user => [user.id, user.email ?? '']));
  const resellers = profileList.filter(item => item.role === 'reseller');
  const params = await searchParams;
  const totalAccounts = profileList.length;
  const canCreate = totalAccounts < 10;

  return (
    <main className="adminPage">
      {params.success && <div className="loginAlert loginAlertSuccess" role="alert"><span>✓</span><div><strong>Done</strong><p>{params.success}</p></div></div>}
      {params.error && <div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Action failed</strong><p>{params.error}</p></div></div>}

      <div className="adminWrap">
        <header className="dashboardTopbar">
          <Link href="/" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></Link>
          <div className="dashboardTopActions">
            <Link href="/admin" className="adminBtn">Admin Home</Link>
            <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="adminHero">
          <div><span className="miniLabel">ACCOUNT MANAGEMENT</span><h1>Reseller accounts.</h1><p>Create and manage reseller access. Maximum total accounts: 10.</p></div>
          <Link href="/admin" className="backBtn">← Admin home</Link>
        </section>

        <section className="adminStats">
          <div><span>TOTAL ACCOUNTS</span><b>{totalAccounts}/10</b><small>Admin + reseller accounts</small></div>
          <div><span>ACTIVE RESELLERS</span><b>{resellers.filter(item => item.active).length}</b><small>Can access reseller pricing</small></div>
          <div><span>INACTIVE RESELLERS</span><b>{resellers.filter(item => !item.active).length}</b><small>Access currently disabled</small></div>
        </section>

        <section className="catalogAdminGrid">
          <article className="adminToolCard">
            <span className="miniLabel">NEW RESELLER</span>
            <h2>Create an account</h2>
            <p>Credentials are created server-side and the account is confirmed immediately.</p>
            <CreateResellerForm action={createReseller} canCreate={canCreate} />
          </article>

          <article className="adminToolCard">
            <span className="miniLabel">ACCESS RULES</span>
            <h2>Reseller access</h2>
            <p>Active resellers can sign in, view reseller pricing and use the reseller dashboard. Inactive accounts are blocked by the application.</p>
            <div className="adminAccessList">
              <div><b>Role</b><span>reseller</span></div>
              <div><b>Pricing</b><span>reseller prices only</span></div>
              <div><b>Limit</b><span>10 total accounts</span></div>
            </div>
          </article>
        </section>

        <section className="adminListSection">
          <div className="dashboardSectionHead"><div><span className="miniLabel">EXISTING RESELLERS</span><h2>Manage accounts</h2></div><span className="publicBadge">{resellers.length} resellers</span></div>
          <div className="adminEditList">
            {resellers.map(item => (
              <details className="adminEditCard" key={item.id}>
                <summary><span><b>{item.full_name || 'Unnamed reseller'}</b><small>{userEmailMap.get(item.id) || 'No email'} • {item.active ? 'Active' : 'Inactive'}</small></span><em>{item.active ? 'ACTIVE' : 'INACTIVE'}</em></summary>
                <form action={updateReseller} className="adminEditForm">
                  <input type="hidden" name="id" value={item.id} />
                  <label>Full name<input name="full_name" defaultValue={item.full_name ?? ''} /></label>
                  <label>Email<input value={userEmailMap.get(item.id) || ''} readOnly /></label>
                  <label className="checkRow"><input name="active" type="checkbox" defaultChecked={item.active} /> Active</label>
                  <button className="adminPrimaryBtn" type="submit">Save account</button>
                </form>
              </details>
            ))}
          </div>
        </section>

        <footer className="dashboardFooter"><span>JBE Digital + Gaming</span><span>Admin-only reseller account management</span></footer>
      </div>
    </main>
  );
}
