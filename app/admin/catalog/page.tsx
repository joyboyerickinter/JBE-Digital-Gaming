import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';
import { createProduct, updateProduct, createPackage, updatePackage } from './actions';
import ProductImageField from './ProductImageField';
import SearchFilter from '@/app/SearchFilter';

type Props = { searchParams: Promise<{ success?: string; error?: string }> };
type Product = { id:string; name:string; slug:string; description:string|null; icon:string|null; image_path:string|null; active:boolean; sort_order:number };
type Package = { id:string; product_id:string; name:string; description:string|null; active:boolean; sort_order:number };

export default async function CatalogAdmin({ searchParams }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id',String(data.claims.sub)).maybeSingle();
  if (!profile?.active) { await supabase.auth.signOut(); redirect('/login?error=Your%20account%20is%20inactive'); }
  if (profile.role !== 'admin') redirect('/dashboard');

  const [{ data: products }, { data: packages }] = await Promise.all([
    supabase.from('products').select('id,name,slug,description,icon,image_path,active,sort_order').order('sort_order'),
    supabase.from('packages').select('id,product_id,name,description,active,sort_order').order('sort_order'),
  ]);
  const productList = (products ?? []) as Product[];
  const packageList = (packages ?? []) as Package[];
  const params = await searchParams;

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
          <div><span className="miniLabel">CATALOG MANAGEMENT</span><h1>Products & packages.</h1><p>Create, edit and activate the items shown in the JBE catalog.</p></div>
          <Link href="/admin" className="backBtn">← Admin home</Link>
        </section>

        <section className="catalogAdminGrid">
          <article className="adminToolCard">
            <span className="miniLabel">NEW PRODUCT</span>
            <h2>Add a product</h2>
            <form action={createProduct} className="adminForm" encType="multipart/form-data">
              <label>Name<input name="name" placeholder="e.g. Mobile Legends" required /></label>
              <label>Slug<input name="slug" placeholder="e.g. mobile-legends" required /></label>
              <label>Icon<input name="icon" placeholder="Optional fallback icon text" /></label>
              <div><span className="adminFieldLabel">Product image</span><ProductImageField inputId="new-product-image" /></div>
              <label>Sort order<input name="sort_order" type="number" defaultValue="0" /></label>
              <label>Description<textarea name="description" placeholder="Optional description" /></label>
              <button className="adminPrimaryBtn" type="submit">Create product</button>
            </form>
          </article>

          <article className="adminToolCard">
            <span className="miniLabel">NEW PACKAGE</span>
            <h2>Add a package</h2>
            <form action={createPackage} className="adminForm">
              <label>Product<select name="product_id" required><option value="">Select product</option>{productList.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label>Package name<input name="name" placeholder="e.g. 86 Diamonds" required /></label>
              <label>Sort order<input name="sort_order" type="number" defaultValue="0" /></label>
              <label>Description<textarea name="description" placeholder="Optional description" /></label>
              <button className="adminPrimaryBtn" type="submit">Create package</button>
            </form>
          </article>
        </section>

        <section className="adminListSection">
          <div className="dashboardSectionHead"><div><span className="miniLabel">EXISTING CATALOG</span><h2>Products</h2></div><span className="publicBadge">{productList.length} products</span></div>
          <SearchFilter placeholder="Search product or package..." statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}>
          <div className="adminEditList">
            {productList.map(p=>(
              <details className="adminEditCard" key={p.id} data-searchable={`${p.name} ${p.slug} ${p.description ?? ""} ${packageList.filter(x=>x.product_id===p.id).map(x=>x.name).join(" ")}`} data-status={p.active ? "active" : "inactive"}>
                <summary><span><b>{p.name}</b><small>{p.slug} • {p.active ? 'Active' : 'Inactive'}</small></span><em>{packageList.filter(x=>x.product_id===p.id).length} packages</em></summary>
                <form action={updateProduct} className="adminEditForm" encType="multipart/form-data">
                  <input type="hidden" name="id" value={p.id} />
                  <label>Name<input name="name" defaultValue={p.name} required /></label>
                  <label>Slug<input name="slug" defaultValue={p.slug} required /></label>
                  <label>Icon<input name="icon" defaultValue={p.icon ?? ''} /></label>
                  <div><span className="adminFieldLabel">Product image</span><ProductImageField inputId={"product-image-"+p.id} currentUrl={p.image_path ? process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/product-images/" + p.image_path : null} allowRemove /></div>
                  <label>Sort order<input name="sort_order" type="number" defaultValue={p.sort_order} /></label>
                  <label>Description<textarea name="description" defaultValue={p.description ?? ''} /></label>
                  <label className="checkRow"><input name="active" type="checkbox" defaultChecked={p.active} /> Active</label>
                  <button className="adminPrimaryBtn" type="submit">Save product</button>
                </form>
              </details>
            ))}
          </div>
        </SearchFilter>
        </section>

        <section className="adminListSection">
          <div className="dashboardSectionHead"><div><span className="miniLabel">PACKAGE MANAGEMENT</span><h2>Packages</h2></div><span className="publicBadge">{packageList.length} packages</span></div>
          <SearchFilter placeholder="Search package or product..." statuses={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}>
          <div className="adminEditList">
            {packageList.map(pkg=>{
              const product=productList.find(p=>p.id===pkg.product_id);
              return <details className="adminEditCard" key={pkg.id} data-searchable={`${pkg.name} ${pkg.description ?? ""} ${product?.name ?? ""}`} data-status={pkg.active ? "active" : "inactive"}>
                <summary><span><b>{pkg.name}</b><small>{product?.name ?? 'Unknown product'} • {pkg.active ? 'Active' : 'Inactive'}</small></span><em>#{pkg.sort_order}</em></summary>
                <form action={updatePackage} className="adminEditForm">
                  <input type="hidden" name="id" value={pkg.id} />
                  <label>Product<select name="product_id" defaultValue={pkg.product_id} required>{productList.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                  <label>Package name<input name="name" defaultValue={pkg.name} required /></label>
                  <label>Sort order<input name="sort_order" type="number" defaultValue={pkg.sort_order} /></label>
                  <label>Description<textarea name="description" defaultValue={pkg.description ?? ''} /></label>
                  <label className="checkRow"><input name="active" type="checkbox" defaultChecked={pkg.active} /> Active</label>
                  <button className="adminPrimaryBtn" type="submit">Save package</button>
                </form>
              </details>;
            })}
          </div>
          </SearchFilter>
        </section>

        <footer className="dashboardFooter"><span>JBE Digital + Gaming</span><span>Admin-only catalog management</span></footer>
      </div>
    </main>
  );
}
