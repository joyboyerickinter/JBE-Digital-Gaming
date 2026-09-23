import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';
import PricingManager from './PricingManager';

type Props = { searchParams: Promise<{ success?: string; error?: string }> };
type Product = { id: string; name: string; active: boolean; sort_order: number };
type Package = { id: string; product_id: string; name: string; active: boolean; sort_order: number };
type Price = { package_id: string; customer_type: 'b2c' | 'reseller'; price: number; currency: string; active: boolean };

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export default async function PricingAdmin({ searchParams }: Props) {
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

  const [{ data: products }, { data: packages }, { data: prices }] = await Promise.all([
    supabase.from('products').select('id,name,active,sort_order').order('sort_order'),
    supabase.from('packages').select('id,product_id,name,active,sort_order').order('sort_order'),
    supabase.from('prices').select('package_id,customer_type,price,currency,active'),
  ]);

  const productList = (products ?? []) as Product[];
  const packageList = (packages ?? []) as Package[];
  const priceList = (prices ?? []) as Price[];
  const params = await searchParams;

  const priceMap = new Map(priceList.map(item => [
    `${item.package_id}:${item.customer_type}`,
    item,
  ]));

  return (
    <main className="adminPage">
      {params.success && <div className="loginAlert loginAlertSuccess" role="alert"><span>✓</span><div><strong>Done</strong><p>{params.success}</p></div></div>}
      {params.error && <div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Action failed</strong><p>{params.error}</p></div></div>}

      <div className="adminWrap">
        <header className="dashboardTopbar">
          <a href="/" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></a>
          <div className="dashboardTopActions">
            <a href="/admin" className="adminBtn">Admin Home</a>
            <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="adminHero">
          <div><span className="miniLabel">PRICE MANAGEMENT</span><h1>B2C & reseller prices.</h1><p>Update both customer prices for every package. Changes are reflected across the catalog.</p></div>
          <a href="/admin" className="backBtn">← Admin home</a>
        </section>

        <section className="adminPriceNote">
          <strong>How pricing works</strong>
          <span>B2C prices are public. Reseller prices are visible only after reseller login. Set a price to 0 when you want the catalog to show “Contact for price”.</span>
        </section>

        <section className="adminListSection">
          <div className="dashboardSectionHead"><div><span className="miniLabel">PRODUCT PRICING</span><h2>Manage pricing</h2></div><span className="publicBadge">{packageList.length} packages</span></div>
          <PricingManager products={productList.map(product => ({
            ...product,
            packages: packageList.filter(pkg => pkg.product_id === product.id).map(pkg => {
              const b2c = priceMap.get(`${pkg.id}:b2c`);
              const reseller = priceMap.get(`${pkg.id}:reseller`);
              return {
                ...pkg,
                b2c_price: Number(b2c?.price ?? 0),
                reseller_price: Number(reseller?.price ?? 0),
                b2c_active: b2c?.active ?? true,
                reseller_active: reseller?.active ?? true,
              };
            }),
          })).filter(product => product.packages.length)} />
        </section>

        <footer className="dashboardFooter"><span>JBE Digital + Gaming</span><span>Admin-only pricing management</span></footer>
      </div>
    </main>
  );
}
