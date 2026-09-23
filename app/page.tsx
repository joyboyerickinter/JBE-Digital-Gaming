import { getCatalog, formatKs, getProductImageUrl, type CatalogProduct } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/server';

function ProductIcon({ value, imagePath }: { value: string | null; imagePath: string | null }) {
  const imageUrl = getProductImageUrl(imagePath);
  return <span className="productIcon" aria-hidden="true">
    {imageUrl ? <img src={imageUrl} alt="" width={64} height={64} loading="lazy" decoding="async" /> : <><span>{value || 'JBE'}</span><i /></>}
  </span>;
}

function ProductCard({ product }: { product: CatalogProduct }) {
  return <article className="productCard">
    <div className="productCardTop"><ProductIcon value={product.icon} imagePath={product.image_path}/><div><span className="cardKicker">JBE CATALOG</span><h2>{product.name}</h2></div><span className="countPill">{product.packages.length} plans</span></div>
    <div className="packageList">
      {product.packages.map((pkg) => <div className="packageRow" key={pkg.id}>
        <div><strong>{pkg.name}</strong><span>Available package</span></div>
        <b>{formatKs(pkg.b2c_price)}</b>
      </div>)}
    </div>
    <div className="cardFooter"><span>B2C Price</span><span>•••</span></div>
  </article>;
}

export default async function Home() {
  const supabase = await createClient();
  const [catalog, authResult] = await Promise.all([
    getCatalog(),
    supabase.auth.getClaims(),
  ]);

  const userId = authResult.data?.claims?.sub ? String(authResult.data.claims.sub) : null;
  let destination = '/login';
  let actionLabel = 'Reseller Login →';

  if (userId) {
    const { data: profile } = await supabase.from('profiles').select('role, active').eq('id', userId).maybeSingle();

    if (profile?.active) {
      destination = profile.role === 'admin' ? '/admin' : '/dashboard';
      actionLabel = profile.role === 'admin' ? 'Admin Portal →' : 'Go to Dashboard →';
    }
  }

  return <main className="page">
    <header className="topbar"><div className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i/></span><span><b>JBE</b><small>Digital + Gaming</small></span></div><div className="topActions"><span className="statusDot">Live Catalog</span><a className="loginBtn" href={destination}>{actionLabel}</a></div></header>
    <section className="hero"><div className="eyebrow">DIGITAL PRODUCTS • GAME TOP-UP • RESELLER</div><h1>One place for your<br/><em>digital business.</em></h1><p>Browse JBE products and packages with clean, up-to-date B2C pricing.</p><div className="heroStats"><div><b>{catalog.length}</b><span>Products</span></div><div><b>{catalog.reduce((n,p)=>n+p.packages.length,0)}</b><span>Packages</span></div><div><b>24/7</b><span>Catalog Access</span></div></div></section>
    <section className="catalogHead"><div><span className="miniLabel">PRODUCT CATALOG</span><h2>Choose a product</h2></div><span className="publicBadge">B2C PRICES</span></section>
    <section className="catalogGrid">{catalog.map((p)=><ProductCard product={p} key={p.id}/>)}</section>
    <footer><span>JBE Digital + Gaming</span><span>Public catalog • Reseller access requires login</span></footer>
  </main>;
}