import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logout } from '@/app/login/actions';
import InvoiceForm from './InvoiceForm';

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function InvoicesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('full_name,role,active').eq('id',userId).maybeSingle();
  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect('/login?error=Your%20account%20is%20inactive');
  }
  if (profile.role !== 'admin') redirect('/dashboard');

  const admin = createAdminClient();
  const [{ data: products }, { data: invoices }] = await Promise.all([
    admin.from('products').select('id,name,packages(id,name,active,prices(price,customer_type,active))').eq('active',true).order('sort_order'),
    admin.from('invoices').select('id,invoice_number,customer_name,price,payment_status,created_at,invoice_items(product_name,package_name,price,sort_order)').order('created_at',{ascending:false}).limit(50),
  ]);

  const productData = (products ?? []).map((p:any)=>({
    id:p.id,name:p.name,
    packages:(p.packages ?? []).filter((x:any)=>x.active).map((x:any)=>({
      id:x.id,name:x.name,
      b2c:Number(x.prices?.find((v:any)=>v.customer_type==='b2c'&&v.active)?.price ?? 0),
      reseller:Number(x.prices?.find((v:any)=>v.customer_type==='reseller'&&v.active)?.price ?? 0),
    }))
  })).filter((p:any)=>p.packages.length);

  const params = await searchParams;

  return <main className="adminPage">
    {params.success && <div className="loginAlert loginAlertSuccess" role="alert"><span>✓</span><div><strong>Invoice created</strong><p>{params.success}</p></div></div>}
    {params.error && <div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Invoice failed</strong><p>{params.error}</p></div></div>}
    <div className="adminWrap">
      <header className="dashboardTopbar">
        <a href="/" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></a>
        <div className="dashboardTopActions"><a href="/admin" className="adminBtn">Admin Home</a><form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form></div>
      </header>
      <section className="adminHero"><div><span className="miniLabel">INVOICE MANAGEMENT</span><h1>Create & manage invoices.</h1><p>Build multi-item invoices with JBE pricing, customer details and payment status.</p></div><a href="/admin" className="backBtn">← Admin home</a></section>
      <InvoiceForm products={productData} />
      <section className="adminListSection">
        <div className="dashboardSectionHead"><div><span className="miniLabel">RECENT INVOICES</span><h2>Invoice history</h2></div><span className="publicBadge">{invoices?.length ?? 0} invoices</span></div>
        <div className="invoiceHistory">
          {(invoices ?? []).map((invoice:any)=><details className="adminEditCard" key={invoice.id}>
            <summary><span><b>{invoice.invoice_number}</b><small>{invoice.customer_name} • {(Number(invoice.price)||0).toLocaleString('en-US')} Ks</small></span><em>{String(invoice.payment_status).toUpperCase()}</em></summary>
            <div className="invoiceHistoryBody">
              {(invoice.invoice_items ?? []).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((item:any)=><div className="invoiceHistoryItem" key={item.product_name+item.package_name}><span>{item.product_name} — {item.package_name}</span><b>{(Number(item.price)||0).toLocaleString('en-US')} Ks</b></div>)}
              <small>{new Date(invoice.created_at).toLocaleString('en-GB')}</small>
            </div>
          </details>)}
        </div>
      </section>
      <footer className="dashboardFooter"><span>JBE Digital + Gaming</span><span>Admin invoice management</span></footer>
    </div>
  </main>;
}
