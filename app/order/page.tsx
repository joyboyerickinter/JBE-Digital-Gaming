import { createGuestOrder } from '@/app/dashboard/orders/actions';
import { getCatalog, formatKs } from '@/lib/catalog';

export default async function GuestOrderPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const catalog = await getCatalog();
  const selectedPackage = (await searchParams).package ?? '';

  return (
    <main className="page">
      <section className="hero">
        <span className="miniLabel">GUEST ORDER</span>
        <h1>Buy digital products without login.</h1>
        <p>Website customers can order using B2C pricing.</p>
      </section>

      <form action={createGuestOrder} className="orderForm" encType="multipart/form-data">
        <label>Name<input name="customer_name" required /></label>
        <label>Customer ID / Email<input name="customer_identifier" required /></label>
        <select name="identifier_type" defaultValue="in_game_id"><option value="in_game_id">Game ID</option><option value="email">Email</option></select>

        <label>Package
          <select name="items" defaultValue={selectedPackage ? JSON.stringify([{ package_id: selectedPackage, quantity: 1 }]) : ''} required>
            <option value="" disabled>Select package</option>
            {catalog.flatMap(product => product.packages.map(pkg => (
              <option key={pkg.id} value={JSON.stringify([{ product_id: product.id, package_id: pkg.id, quantity: 1 }])}>
                {product.name} - {pkg.name} ({formatKs(pkg.b2c_price)})
              </option>
            )))}
          </select>
        </label>

        <select name="payment_method" defaultValue="kpay"><option value="kpay">KPay</option><option value="aya_pay">AYA Pay</option></select>
        <label>Transaction last 6 digits<input name="transaction_last6" required maxLength={6} /></label>
        <label>Payment Screenshot<input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" required /></label>
        <button type="submit">Submit Order</button>
      </form>

      <p>Outline VPN orders are available only through Telegram: <a href="https://t.me/JBE_OUTLINE_BOT">JBE_OUTLINE_BOT</a></p>
    </main>
  );
}
