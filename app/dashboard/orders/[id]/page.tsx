import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function OrderDetail({params}:{params:Promise<{id:string}>}) {
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims();
  if(!data?.claims?.sub) redirect('/login');
  const userId=String(data.claims.sub);
  const {data:order}=await supabase.from('orders').select('id,order_number,customer_identifier,customer_identifier_type,customer_name,payment_method,transaction_last6,screenshot_path,status,cancel_reason,total_amount,created_at,order_items(product_name,package_name,reseller_price,quantity,line_total,sort_order)').eq('id',(await params).id).eq('reseller_id',userId).maybeSingle();
  if(!order) notFound();

  let screenshotUrl: string | null = null;
  if (order.screenshot_path) {
    const { data: signed } = await supabase.storage.from('order-screenshots').createSignedUrl(order.screenshot_path, 3600);
    screenshotUrl = signed?.signedUrl ?? null;
  }
  return <main className="invoicePreviewPage"><div className="orderDetailCard">
    <div className="orderDetailTop"><div><span className="miniLabel">JBE ORDER</span><h1>{order.order_number}</h1><p>{new Date(order.created_at).toLocaleString('en-GB')}</p></div><span className={'orderStatus orderStatus'+String(order.status)}>{String(order.status).toUpperCase()}</span></div>
    <div className="orderDetailGrid"><div><span>Customer</span><strong>{order.customer_name}</strong></div><div><span>{order.customer_identifier_type==='email'?'Email':'In-game ID'}</span><strong>{order.customer_identifier}</strong></div><div><span>Payment</span><strong>{String(order.payment_method).toUpperCase()} •••• {order.transaction_last6}</strong></div></div>
    <div className="orderDetailItems">{(order.order_items??[]).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((item:any)=><div key={item.product_name+item.package_name} className="orderDetailItem"><div><strong>{item.product_name}</strong><span>{item.package_name} × {item.quantity}</span></div><b>{Number(item.line_total).toLocaleString('en-US')} Ks</b></div>)}</div>
    <div className="orderDetailTotal"><span>Total</span><strong>{Number(order.total_amount).toLocaleString('en-US')} Ks</strong></div>
    {order.status==='cancel'&&<div className="orderCancelBox"><b>Cancel reason</b><p>{order.cancel_reason}</p></div>}
    <section className="adminOrderDetailSection">
      <div className="dashboardSectionHead"><div><span className="miniLabel">PAYMENT PROOF</span><h2>Transaction screenshot</h2></div></div>
      {screenshotUrl ? (
        <div className="adminScreenshotBox">
          <img src={screenshotUrl} alt="Order payment screenshot" />
          <a className="adminPrimaryBtn" href={screenshotUrl} target="_blank" rel="noreferrer">Open full screenshot ↗</a>
          <p>Secure preview link expires in 1 hour.</p>
        </div>
      ) : (
        <div className="invoiceEmpty">No payment screenshot attached.</div>
      )}
    </section>
    <a href="/dashboard" className="backBtn">← Back to dashboard</a>
  </div></main>;
}
