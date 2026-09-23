import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logout } from '@/app/login/actions';
import OrderForm from './OrderForm';

export default async function OrdersPage({ searchParams }: { searchParams:Promise<{error?:string}> }) {
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims();
  if(!data?.claims?.sub) redirect('/login');
  const userId=String(data.claims.sub);
  const {data:profile}=await supabase.from('profiles').select('full_name,role,active').eq('id',userId).maybeSingle();
  if(!profile?.active || profile.role!=='reseller') redirect('/dashboard');

  const admin=createAdminClient();
  const {data:products}=await admin.from('products').select('id,name,sort_order,packages(id,name,active,sort_order,prices(price,customer_type,active))').eq('active',true).order('sort_order');

  const productData=(products??[]).map((p:any)=>({id:p.id,name:p.name,packages:(p.packages??[]).filter((x:any)=>x.active).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((x:any)=>({id:x.id,name:x.name,productId:p.id,productName:p.name,price:Number(x.prices?.find((v:any)=>v.customer_type==='reseller'&&v.active)?.price??0)})).filter((x:any)=>x.price>0)})).filter((p:any)=>p.packages.length);
  const params=await searchParams;

  return <main className="adminPage">
    {params.error&&<div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Order failed</strong><p>{params.error}</p></div></div>}
    <div className="adminWrap">
      <header className="dashboardTopbar"><a href="/" className="brand"><span className="brandMark"><b>J</b><strong>BE</strong><i /></span><span><b>JBE</b><small>Digital + Gaming</small></span></a><div className="dashboardTopActions"><a href="/dashboard" className="adminBtn">Dashboard</a><form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form></div></header>
      <section className="adminHero"><div><span className="miniLabel">RESELLER ORDERS</span><h1>Place your order.</h1><p>Choose multiple packages at reseller pricing, then send payment proof for processing.</p></div><a href="/dashboard" className="backBtn">← Dashboard</a></section>
      <OrderForm products={productData}/>
    </div>
  </main>;
}
