import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';

type DashboardProps = { searchParams: Promise<{ success?: string }> };

type Product = { id: string; name: string; icon: string | null; sort_order: number };
type Package = { id: string; product_id: string; name: string; sort_order: number };
type Price = { package_id: string; customer_type: string; price: number | string };

function formatKs(value: number) {
  return value > 0 ? `${value.toLocaleString('en-US')} Ks` : 'Contact for price';
}

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

  const [{ data: products }, { data: packages }, { data: prices }] = await Promise.all([
    supabase.from('products').select('id,name,icon,sort_order').eq('active', true).order('sort_order'),
    supabase.from('packages').select('id,product_id,name,sort_order').eq('active', true).order('sort_order'),
    supabase.from('prices').select('package_id,customer_type,price').eq('active', true).eq('customer_type', 'reseller'),
  ]);

  const catalog = ((products ?? []) as Product[]).map((product) => ({
    ...product,
    packages: ((packages ?? []) as Package[])
      .filter((pkg) => pkg.product_id === product.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((pkg) => {
        const price = ((prices ?? []) as Price[]).find((item) => item.package_id === pkg.id);
        return { ...pkg, price: Number(price?.price ?? 0) };
      }),
  }));

  const params = await searchParams;
  const totalPackages = catalog.reduce((sum, product) => sum + product.packages.length, 0);

  return (
    <main className="dashboardPage">
      {params.success && <div className="loginAlert loginAlertSuccess" role="alert"><span>✓</span><div><strong>Sign in successful</strong><p>{params.success}</p></div></div>}

      <div className="dashboardWrap">
        <header className="dashboardTopbar">
          <a href="/" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></a>
          <div className="dashboardTopActions">            <a href="/dashboard/invoices" className="adminBtn">Invoices</a>
            {profile.role === 'admin' && <a href="/admin" className="adminBtn">Admin Portal</a>}
            <span className="roleBadge">{profile.role === 'admin' ? 'ADMIN' : 'RESELLER'}</span>
            <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="dashboardHero">
          <div><span className="miniLabel">JBE BUSINESS PORTAL</span><h1>Welcome back{profile.full_name ? `, ${profile.full_name}` : ''}.</h1><p>Manage your reseller orders with JBE pricing and business tools.</p></div>
          <div className="dashboardStats"><div><b>{catalog.length}</b><span>Products</span></div><div><b>{totalPackages}</b><span>Packages</span></div><div><b>B2B</b><span>Reseller pricing</span></div></div>
        </section>

        <section className="dashboardSectionHead"><div><span className="miniLabel">RESELLER CATALOG</span><h2>Available packages</h2></div><span className="publicBadge">RESELLER PRICES</span></section>

        <section className="dashboardGrid">
          {catalog.map((product) => (
            <article className="dashboardProductCard" key={product.id}>
              <div className="dashboardProductHead"><span className="productIcon"><span>{product.icon || 'JBE'}</span><i /></span><div><span className="cardKicker">JBE BUSINESS</span><h3>{product.name}</h3></div><span className="countPill">{product.packages.length} plans</span></div>
              <div className="dashboardPackageList">
                {product.packages.map((pkg) => <div className="dashboardPackageRow" key={pkg.id}><div><strong>{pkg.name}</strong><span>Reseller price</span></div><b>{formatKs(pkg.price)}</b></div>)}
              </div>
            </article>
          ))}
        </section>

        <footer className="dashboardFooter"><span>JBE Digital + Gaming</span><span>Private reseller portal • {profile.role}</span></footer>
      </div>
    </main>
  );
}
