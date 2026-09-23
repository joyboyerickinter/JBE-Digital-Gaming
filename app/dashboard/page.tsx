import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';
import NotificationBell from '@/app/dashboard/NotificationBell';

type DashboardProps = { searchParams: Promise<{ success?: string }> };

type Product = { id: string; name: string; icon: string | null; image_path: string | null; sort_order: number };
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

  const [{ data: products }, { data: packages }, { data: prices }, { count: invoiceCount }] = await Promise.all([
    supabase.from('products').select('id,name,icon,image_path,sort_order').eq('active', true).order('sort_order'),
    supabase.from('packages').select('id,product_id,name,sort_order').eq('active', true).order('sort_order'),
    supabase.from('prices').select('package_id,customer_type,price').eq('active', true).eq('customer_type', 'reseller'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('created_by', userId),
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
  const isAdmin = profile.role === 'admin';

  return (
    <main className="dashboardPage">
      {params.success && <div className="loginAlert loginAlertSuccess" role="alert"><span>✓</span><div><strong>Sign in successful</strong><p>{params.success}</p></div></div>}

      <div className="dashboardWrap">
        <header className="dashboardTopbar">
          <Link href="/" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></Link>
          <div className="dashboardTopActions"><Link href="/dashboard/profile" className="adminBtn">Profile</Link><Link href="/dashboard/invoices" className="adminBtn">Invoices</Link>
            {!isAdmin && <NotificationBell userId={userId} />}
            {isAdmin && <Link href="/admin" className="adminBtn">Admin Portal</Link>}
            <span className="roleBadge">{isAdmin ? 'ADMIN' : 'RESELLER'}</span>
            <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="dashboardHero">
          <div><span className="miniLabel">JBE BUSINESS PORTAL</span><h1>Welcome back{profile.full_name ? `, ${profile.full_name}` : ''}.</h1><p>Manage your reseller orders with JBE pricing and business tools.</p></div>
          <div className="dashboardStats"><div><b>{catalog.length}</b><span>Products</span></div><div><b>{totalPackages}</b><span>Packages</span></div><div><b>{invoiceCount ?? 0}</b><span>My invoices</span></div></div>
        </section>

        {!isAdmin && <section className="resellerQuickActions"><Link href="/dashboard/orders" className="adminPrimaryBtn">New order →</Link><Link href="/dashboard/orders/history" className="resellerSecondaryBtn">Order history</Link><Link href="/dashboard/invoices" className="resellerSecondaryBtn">Invoices</Link></section>}

        <section className="dashboardSectionHead"><div><span className="miniLabel">RESELLER CATALOG</span><h2>Available packages</h2></div><span className="publicBadge">RESELLER PRICES</span></section>

        <section className="dashboardGrid">
          {catalog.map((product) => (
            <article className="dashboardProductCard" key={product.id}>
              <div className="dashboardProductHead"><span className="productIcon">{product.image_path ? <img src={process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/product-images/' + product.image_path} alt="" width={64} height={64} loading="lazy" decoding="async" /> : <><span>{product.icon || 'JBE'}</span><i /></>}</span><div><span className="cardKicker">JBE BUSINESS</span><h3>{product.name}</h3></div><span className="countPill">{product.packages.length} plans</span></div>
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