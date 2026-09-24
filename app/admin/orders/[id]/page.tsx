import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logout } from '@/app/login/actions';
import OrderStatusForm from './OrderStatusForm';

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id', userId).maybeSingle();
  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect('/login?error=Your%20account%20is%20inactive');
  }
  if (profile.role !== 'admin') redirect('/dashboard');

  const orderId = (await params).id;
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id,order_number,reseller_id,source,customer_identifier,customer_identifier_type,customer_name,payment_method,transaction_last6,screenshot_path,status,cancel_reason,total_amount,currency,created_at,updated_at,profiles(full_name),order_items(product_id,package_id,product_name,package_name,reseller_price,quantity,line_total,sort_order)')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) notFound();

  let screenshotUrl: string | null = null;
  if (order.screenshot_path) {
    const { data: signed } = await admin.storage.from('order-screenshots').createSignedUrl(order.screenshot_path, 3600);
    screenshotUrl = signed?.signedUrl ?? null;
  }

  const items = [...(order.order_items ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const resellerName = Array.isArray(order.profiles)
    ? order.profiles[0]?.full_name || 'Unknown reseller'
    : (order.profiles as any)?.full_name || 'Unknown reseller';

  return (
    <main className="invoicePreviewPage">
      <div className="invoicePreviewActions noPrint">
        <a href="/admin/orders" className="backBtn">← Order list</a>
        <a href="/admin" className="adminBtn">Admin Home</a>
        <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
      </div>

      <div className="adminOrderDetail">
        <div className="adminOrderDetailHead">
          <div>
            <span className="miniLabel">JBE ORDER</span>
            <h1>{order.order_number}</h1>
            <p>{new Date(order.created_at).toLocaleString('en-GB')}</p>
          </div>
          <span className={'orderStatus orderStatus' + String(order.status)}>{String(order.status).toUpperCase()}</span>
        </div>

        <section className="adminOrderDetailSection">
          <div className="dashboardSectionHead"><div><span className="miniLabel">{order.source === 'guest' ? 'CUSTOMER SOURCE' : 'RESELLER'}</span><h2>{order.source === 'guest' ? 'Website customer' : resellerName}</h2></div></div>
          <div className="adminOrderDetailGrid">
            <div><span>Customer / Client</span><strong>{order.customer_name}</strong></div>
            <div><span>{order.customer_identifier_type === 'email' ? 'Email' : 'In-game ID'}</span><strong>{order.customer_identifier}</strong></div>
            <div><span>Payment method</span><strong>{String(order.payment_method).toUpperCase()}</strong></div>
            <div><span>Transaction last 6</span><strong>•••• {order.transaction_last6}</strong></div>
          </div>
        </section>

        <section className="adminOrderDetailSection">
          <div className="dashboardSectionHead"><div><span className="miniLabel">ORDER ITEMS</span><h2>Packages</h2></div></div>
          <div className="adminOrderDetailItems">
            {items.map((item: any) => (
              <div className="adminOrderDetailItem" key={item.id}>
                <div><strong>{item.product_name}</strong><span>{item.package_name} × {item.quantity}</span></div>
                <b>{Number(item.line_total).toLocaleString('en-US')} Ks</b>
              </div>
            ))}
          </div>
          <div className="orderDetailTotal"><span>Total</span><strong>{Number(order.total_amount).toLocaleString('en-US')} Ks</strong></div>
        </section>

        <section className="adminOrderDetailSection">
          <div className="dashboardSectionHead"><div><span className="miniLabel">ORDER STATUS</span><h2>Update fulfillment status</h2></div></div>
          <OrderStatusForm orderId={order.id} currentStatus={String(order.status)} currentReason={order.cancel_reason} />
          {order.cancel_reason && <div className="orderCancelBox"><strong>Cancel reason</strong><p>{order.cancel_reason}</p></div>}
        </section>

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
      </div>
    </main>
  );
}
