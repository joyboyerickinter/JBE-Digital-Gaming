import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';
import SearchFilter from '@/app/SearchFilter';

export default async function ResellerOrderHistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id', userId).maybeSingle();
  if (!profile?.active || profile.role !== 'reseller') redirect('/dashboard?error=Reseller%20access%20required');

  const { data: orders } = await supabase
    .from('orders')
    .select('id,order_number,customer_identifier,customer_identifier_type,customer_name,payment_method,transaction_last6,status,cancel_reason,total_amount,created_at,order_items(product_name,package_name,quantity,line_total,sort_order)')
    .eq('reseller_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main className="dashboardPage">
      <div className="dashboardWrap">
        <header className="dashboardTopbar">
          <a href="/" className="brand">
            <span className="brandMark"><b>J</b><strong>BE</strong><i /></span>
            <span><b>JBE</b><small>Digital + Gaming</small></span>
          </a>
          <div className="dashboardTopActions">
            <a href="/dashboard" className="adminBtn">Dashboard</a>
            <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="dashboardHero">
          <div>
            <span className="miniLabel">ORDER HISTORY</span>
            <h1>My orders.</h1>
            <p>Track your reseller orders, payment details and fulfillment status.</p>
          </div>
          <div className="resellerQuickActions">
            <a href="/dashboard/orders" className="adminPrimaryBtn">+ New order</a>
            <a href="/dashboard" className="resellerSecondaryBtn">← Dashboard</a>
          </div>
        </section>

        <section className="adminListSection">
          <div className="dashboardSectionHead">
            <div><span className="miniLabel">YOUR ORDERS</span><h2>Recent orders</h2></div>
            <span className="publicBadge">{orders?.length ?? 0} shown</span>
          </div>

          <SearchFilter placeholder="Search order, customer or item..." statuses={[{value:"pending",label:"Pending"},{value:"done",label:"Done"},{value:"cancel",label:"Cancelled"}]}>
          <div className="resellerOrderList">
            {(orders ?? []).length === 0 && <div className="invoiceEmpty">No orders yet. Create your first order above.</div>}

            {(orders ?? []).map((order: any) => {
              const items = [...(order.order_items ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
              const itemSummary = items.map((item: any) =>
                item.product_name + ' — ' + item.package_name + (Number(item.quantity) > 1 ? ' × ' + item.quantity : '')
              ).join(' • ');

              return (
                <article className="resellerOrderCard" key={order.id} data-searchable={`${order.order_number} ${order.customer_name} ${order.customer_identifier} ${itemSummary}`} data-status={order.status}>
                  <div className="resellerOrderCardHead">
                    <div>
                      <span className="miniLabel">{order.order_number}</span>
                      <h3>{order.customer_name}</h3>
                      <p>{order.customer_identifier_type === 'email' ? 'Email' : 'In-game ID'} • {order.customer_identifier}</p>
                    </div>
                    <span className={'orderStatus orderStatus' + String(order.status)}>{String(order.status).toUpperCase()}</span>
                  </div>

                  <div className="resellerOrderMeta">
                    <div><span>ITEMS</span><strong>{items.length}</strong></div>
                    <div><span>TOTAL</span><strong>{Number(order.total_amount).toLocaleString('en-US')} Ks</strong></div>
                    <div><span>PAYMENT</span><strong>{String(order.payment_method).toUpperCase()} •••• {order.transaction_last6}</strong></div>
                    <div><span>DATE</span><strong>{new Date(order.created_at).toLocaleString('en-GB')}</strong></div>
                  </div>

                  <div className="resellerOrderCardBottom">
                    <p>{itemSummary || 'No items'}</p>
                    {order.status === 'cancel' && order.cancel_reason && (
                      <div className="orderCancelBox"><b>Cancel reason</b><p>{order.cancel_reason}</p></div>
                    )}
                    <a href={'/dashboard/orders/' + order.id} className="invoiceViewLink">View order →</a>
                  </div>
                </article>
              );
            })}
          </div>
          </SearchFilter>
        </section>

        <footer className="dashboardFooter">
          <span>JBE Digital + Gaming</span>
          <span>Order history</span>
        </footer>
      </div>
    </main>
  );
}
