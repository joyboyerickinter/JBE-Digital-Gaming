export async function sendAdminNewOrderEmail(order: {
  order_number: string;
  reseller_name: string;
  customer_name: string;
  customer_identifier: string;
  customer_identifier_type: string;
  payment_method: string;
  transaction_last6: string;
  total_amount: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !adminEmail || !fromEmail) {
    console.warn('Admin order email skipped: Resend environment variables are not configured.');
    return { sent: false, skipped: true };
  }

  const identifierLabel = order.customer_identifier_type === 'email' ? 'Email' : 'In-game ID';
  const paymentLabel = order.payment_method === 'kpay' ? 'KPay' : 'AYA Pay';

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#101828">
      <h2>New JBE Reseller Order</h2>
      <p><strong>Order ID:</strong> ${order.order_number}</p>
      <p><strong>Reseller:</strong> ${escapeHtml(order.reseller_name)}</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customer_name)}</p>
      <p><strong>${identifierLabel}:</strong> ${escapeHtml(order.customer_identifier)}</p>
      <p><strong>Payment:</strong> ${paymentLabel} •••• ${escapeHtml(order.transaction_last6)}</p>
      <p><strong>Total:</strong> ${order.total_amount.toLocaleString('en-US')} Ks</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/orders">Open Admin Orders</a></p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [adminEmail],
      subject: `New JBE Order: ${order.order_number}`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Resend admin order email failed:', errorText);
    return { sent: false, skipped: false };
  }

  return { sent: true, skipped: false };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
