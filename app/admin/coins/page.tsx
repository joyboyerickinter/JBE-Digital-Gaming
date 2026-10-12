import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logout } from '@/app/login/actions';
import { adjustResellerCoins } from './actions';

export default async function AdminCoinsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');
  const userId = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id', userId).maybeSingle();
  if (!profile?.active || profile.role !== 'admin') redirect('/dashboard');

  const admin = createAdminClient();
  const [{ data: resellers }, { data: accounts }, { data: ledger }] = await Promise.all([
    admin.from('profiles').select('id,full_name,active').eq('role','reseller').order('full_name'),
    admin.from('reseller_coin_accounts').select('reseller_id,balance,updated_at'),
    admin.from('reseller_coin_ledger').select('id,reseller_id,amount,balance_after,reason,order_id,created_at,profiles(full_name)').order('created_at',{ascending:false}).limit(40),
  ]);
  const balanceById = new Map((accounts ?? []).map((a:any) => [a.reseller_id, Number(a.balance)]));
  const params = await searchParams;
  return <main className="adminPage"><div className="adminWrap">
    {params.error && <div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Coin action failed</strong><p>{params.error}</p></div></div>}
    {params.success && <div className="loginAlert loginAlertSuccess" role="status"><span>✓</span><div><strong>Updated</strong><p>{params.success}</p></div></div>}
    <header className="dashboardTopbar"><Link href="/" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></Link><div className="dashboardTopActions"><Link href="/admin" className="adminBtn">Admin Home</Link><form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form></div></header>
    <section className="adminHero"><div><span className="miniLabel">RESELLER REWARDS</span><h1>Manage My Coin.</h1><p>1 coin = 2 Ks discount. Coins are awarded once when a reseller order is marked DONE.</p></div><Link href="/admin" className="backBtn">← Admin home</Link></section>
    <section className="adminListSection"><div className="dashboardSectionHead"><div><span className="miniLabel">RESELLER BALANCES</span><h2>Adjust coin balance</h2></div><span className="publicBadge">{resellers?.length ?? 0} accounts</span></div>
      <div className="coinAdminList">{(resellers ?? []).map((r:any)=><article className="coinAdminCard" key={r.id}><div className="coinAdminHead"><div><strong>{r.full_name || 'Reseller'}</strong><span>{r.active ? 'Active account' : 'Inactive account'}</span></div><b>🪙 {(balanceById.get(r.id) ?? 0).toLocaleString('en-US')} coins</b></div><form action={adjustResellerCoins} className="coinAdjustForm"><input type="hidden" name="reseller_id" value={r.id}/><label>Coin change (+ add / − deduct)<input type="number" name="amount" step="1" required placeholder="e.g. 5 or -2"/></label><label>Reason<input type="text" name="reason" minLength={3} required placeholder="Manual adjustment reason"/></label><button className="adminPrimaryBtn" type="submit">Save adjustment →</button></form></article>)}</div>
    </section>
    <section className="adminListSection"><div className="dashboardSectionHead"><div><span className="miniLabel">AUDIT LOG</span><h2>Recent coin activity</h2></div></div><div className="coinLedgerList">{(ledger ?? []).map((entry:any)=><div className="coinLedgerRow" key={entry.id}><div><strong>{entry.profiles?.full_name || 'Reseller'}</strong><span>{entry.reason} · {new Date(entry.created_at).toLocaleString('en-GB')}</span></div><b className={Number(entry.amount)<0?'coinNegative':'coinPositive'}>{Number(entry.amount)>0?'+':''}{entry.amount} coins</b><small>Balance: {entry.balance_after}</small></div>)}{(!ledger || ledger.length===0)&&<div className="invoiceEmpty">No coin activity yet.</div>}</div></section>
    <footer className="dashboardFooter"><span>JBE Digital + Gaming</span><span>Admin-only coin management</span></footer>
  </div></main>;
}
