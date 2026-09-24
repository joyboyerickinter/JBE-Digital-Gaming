import { createGuestOrder } from '@/app/dashboard/orders/actions';
import { getCatalog, formatKs } from '@/lib/catalog';

export default async function GuestOrderPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const catalog = await getCatalog();
  const selectedPackage = (await searchParams).package ?? '';

  return (
    <main className="page guestPage">
      <section className="guestOrderHero">
        <span className="miniLabel">CREATE ORDER</span>
        <h1>Complete your order easily.</h1>
        <p>Select your product, upload payment proof and submit your request. No account required.</p>
        <div className="orderSteps"><span>1. Select</span><span>2. Pay</span><span>3. Submit</span></div>
      </section>

      <form action={createGuestOrder} className="orderForm guestOrderForm" encType="multipart/form-data">
        <section className="formCard">
          <h2>Customer Information</h2>
          <label className="formField">Full Name<input name="customer_name" autoComplete="name" placeholder="Your name" required /></label>
          <label className="formField">Game ID / Email<input name="customer_identifier" autoComplete="email" placeholder="Game ID or Email" required /></label>
          <label className="formField">Account Type<select name="identifier_type" defaultValue="in_game_id"><option value="in_game_id">Game ID</option><option value="email">Email</option></select></label>
        </section>

        <section className="formCard">
          <h2>Select Package</h2>
          <label className="formField">Package
            <select name="items" defaultValue={selectedPackage ? JSON.stringify([{ package_id: selectedPackage, quantity: 1 }]) : ''} required>
              <option value="" disabled>Select package</option>
              {catalog.flatMap(product => product.slug.includes('outline') ? [] : product.packages.map(pkg => (
                <option key={pkg.id} value={JSON.stringify([{ product_id: product.id, package_id: pkg.id, quantity: 1 }])}>
                  {product.name} - {pkg.name} ({formatKs(pkg.b2c_price)})
                </option>
              )))}
            </select>
          </label>
        </section>

        <section className="formCard">
          <h2>Payment Information</h2>
          <label className="formField">Payment Method<select name="payment_method" defaultValue="kpay"><option value="kpay">KPay</option><option value="aya_pay">AYA Pay</option></select></label>
          <label className="formField">Transaction ID (Last 6 digits)<input name="transaction_last6" inputMode="numeric" maxLength={6} placeholder="123456" required /></label>
          <label className="formField">Payment Screenshot<input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" required /></label>
        </section>

        <button className="orderSubmitBtn" type="submit">Submit Order</button>
      </form>
    </main>
  );
}
