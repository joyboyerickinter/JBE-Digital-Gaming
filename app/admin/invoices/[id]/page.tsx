import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import InvoicePrintButton from './InvoicePrintButton';

type Props = { params: Promise<{ id: string }> };

export default async function InvoicePreviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id', userId).maybeSingle();
  if (!profile?.active || !['admin','reseller'].includes(profile.role)) redirect('/login');

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from('invoices')
    .select('id,invoice_number,customer_name,price,currency,payment_status,created_at,created_by,invoice_items(product_name,package_name,price,currency,sort_order)')
    .eq('id', id)
    .maybeSingle();

  if (!invoice) notFound();
  if (profile.role !== 'admin' && String(invoice.created_by) !== userId) redirect('/dashboard/invoices');

  const items = [...(invoice.invoice_items ?? [])].sort((a:any,b:any) => a.sort_order - b.sort_order);
  const total = Number(invoice.price) || items.reduce((sum:number, item:any) => sum + (Number(item.price) || 0), 0);

  return (
    <main className="invoicePreviewPage">
      <div className="invoicePreviewActions noPrint">
        <a href={profile.role === 'admin' ? '/admin/invoices' : '/dashboard/invoices'} className="backBtn">← Invoice history</a>
        <InvoicePrintButton />
      </div>

      <article className="jbeInvoice" id="jbe-invoice">
        <header className="jbeInvoiceHeader">
          <div className="jbeInvoiceBrand">
            <div className="jbeInvoiceLogo">JBE</div>
            <div><strong>JBE Digital + Gaming</strong><span>Digital products & gaming</span></div>
          </div>
          <div className="jbeInvoiceTitle">
            <span>INVOICE</span>
            <strong>{invoice.invoice_number}</strong>
          </div>
        </header>

        <section className="jbeInvoiceMeta">
          <div><span>BILL TO</span><strong>{invoice.customer_name}</strong></div>
          <div><span>DATE</span><strong>{new Date(invoice.created_at).toLocaleDateString('en-GB')}</strong></div>
          <div><span>STATUS</span><strong className={invoice.payment_status === 'paid' ? 'invoicePaid' : 'invoiceUnpaid'}>{String(invoice.payment_status).toUpperCase()}</strong></div>
        </section>

        <section className="jbeInvoiceTable">
          <div className="jbeInvoiceTableHead"><span>PRODUCT</span><span>PACKAGE</span><span>AMOUNT</span></div>
          {items.map((item:any, index:number) => (
            <div className="jbeInvoiceTableRow" key={item.product_name + item.package_name + index}>
              <span>{item.product_name}</span>
              <span>{item.package_name}</span>
              <strong>{(Number(item.price) || 0).toLocaleString('en-US')} Ks</strong>
            </div>
          ))}
        </section>

        <section className="jbeInvoiceBottom">
          <div><span>Thank you for your business.</span><small>JBE Digital + Gaming</small></div>
          <div className="jbeInvoiceTotal"><span>TOTAL</span><strong>{total.toLocaleString('en-US')} Ks</strong></div>
        </section>

        <footer className="jbeInvoiceFooter">
          <span>{invoice.invoice_number}</span>
          <span>JBE Digital + Gaming</span>
        </footer>
      </article>
    </main>
  );
}
