import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logout } from '@/app/login/actions';
import SearchFilter from '@/app/SearchFilter';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name,role,active')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect('/login?error=Your%20account%20is%20inactive');
  }
  if (profile.role !== 'admin') redirect('/dashboard');

  const admin = createAdminClient();
  const [{ data: orders }, { count: totalCount }, { count: pendingCount }, { count: doneCount }, { count: cancelCount }] =
    await Promise.all([
      admin
        .from('orders')
        .select('id,order_number,reseller_id,source,customer_identifier,customer_identifier_type,customer_name,payment_method,transaction_last6,status,total_amount,created_at,profiles(full_name),order_items(product_name,package_name,quantity,line_total,sort_order)')
        .order('created_at', { ascending: false })
        .limit(100),
      admin.from('orders').select('*', { count: 'exact', head: true }),
      admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'done'),
      admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancel'),
    ]);

  const params = await searchParams;

  return (
    <main className="adminPage">
      {params.error && (
        <div className="loginAlert loginAlertError" role="alert">
          <span>!</span>
          <div><strong>Order action failed</strong><p>{params.error}</p></div>
        </div>
      )}

      <div className="adminWrap">
        <header className="dashboardTopbar">
          <Link href="/" className="brand">
            <span className="brandMark"><b>J</b><strong>BE</strong><i /></span>
            <span><b>JBE</b><small>Digital + Gaming</small></span>
          </Link>
          <div className="dashboardTopActions">
            <Link href="/admin" className="adminBtn">Admin Home</Link>
            <form action={logout}><button className="logoutBtn" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="adminHero">
          <div>
            <span className="miniLabel">ORDER MANAGEMENT</span>
            <h1>Reseller orders.</h1>
            <p>Review incoming reseller orders, payment details and fulfillment status.</p>
          </div>
          <Link href="/admin" className="backBtn">← Admin home</Link>
        </section>

        <section className="adminStats orderAdminStats">
          <div><span>TOTAL ORDERS</span><b>{totalCount ?? 0}</b><small>All reseller orders</small></div>
          <div><span>PENDING</span><b>{pendingCount ?? 0}</b><small>Waiting for processing</small></div>
          <div><span>DONE</span><b>{doneCount ?? 0}</b><small>Completed orders</small></div>
          <div><span>CANCELLED</span><b>{cancelCount ?? 0}</b><small>Cancelled orders</small></div>
        </section>

        <section className="adminListSection">
          <div className="dashboardSectionHead">
            <div><span className="miniLabel">ORDER QUEUE</span><h2>Recent orders</h2></div>
            <span className="publicBadge">{orders?.length ?? 0} shown</span>
          </div>

          <SearchFilter placeholder="Search order, reseller, customer or item..." statuses={[{value:"pending",label:"Pending"},{value:"done",label:"Done"},{value:"cancel",label:"Cancelled"}]}>
          <div className="adminOrderList">
            {(orders ?? []).length === 0 && (
              <div className="invoiceEmpty">No reseller orders yet.</div>
            )}

            {(orders ?? []).map((order: any) => {
              const items = [...(order.order_items ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
              const itemSummary = items.map((item: any) =>
                item.product_name + ' — ' + item.package_name + (Number(item.quantity) > 1 ? ' × ' + item.quantity : '')
              ).join(' • ');
              const resellerName = order.profiles?.full_name || 'Unknown reseller';

              return (
                <div className="adminOrderCard" key={order.id} data-searchable={`${order.order_number} ${resellerName} ${order.customer_name} ${order.customer_identifier} ${itemSummary}`} data-status={order.status}>
                  <div className="adminOrderMain">
                    <div>
                      <span className="miniLabel">{order.order_number}</span>
                      <h3>{order.source === 'guest' ? 'Website customer' : resellerName}</h3>
                      <p>{order.customer_name} • {order.customer_identifier}</p>
                    </div>
                    <span className={'orderStatus orderStatus' + String(order.status)}>
                      {String(order.status).toUpperCase()}
                    </span>
                  </div>

                  <div className="adminOrderMeta">
                    <div><span>ITEMS</span><strong>{items.length}</strong></div>
                    <div><span>TOTAL</span><strong>{Number(order.total_amount).toLocaleString('en-US')} Ks</strong></div>
                    <div><span>PAYMENT</span><strong>{String(order.payment_method).toUpperCase()} •••• {order.transaction_last6}</strong></div>
                    <div><span>DATE</span><strong>{new Date(order.created_at).toLocaleString('en-GB')}</strong></div>
                  </div>

                  <div className="adminOrderBottom">
                    <p>{itemSummary || 'No items'}</p>
                    <Link href={'/admin/orders/' + order.id} className="invoiceViewLink">View order →</Link>
                  </div>
                </div>
              );
            })}
          </div>
          </SearchFilter>
        </section>

        <footer className="dashboardFooter">
          <span>JBE Digital + Gaming</span>
          <span>Admin order management</span>
        </footer>
      </div>
    </main>
  );
}
