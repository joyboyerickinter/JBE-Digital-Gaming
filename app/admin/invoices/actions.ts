'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireActiveUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const id = String(data.claims.sub);
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name,role,active')
    .eq('id', id)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect('/login?error=Your%20account%20is%20inactive');
  }

  return { id, profile };
}

export async function createInvoice(formData: FormData) {
  const { id, profile } = await requireActiveUser();
  const isReseller = profile.role === 'reseller';

  const customerName = String(formData.get('customer_name') || '').trim();
  const paymentStatus = String(formData.get('payment_status') || 'unpaid');
  const itemsRaw = String(formData.get('items') || '[]');

  const errorPath = isReseller ? '/dashboard/invoices' : '/admin/invoices';
  if (!customerName) redirect(errorPath + '?error=Customer%20name%20is%20required');

  let items: Array<{product_name:string;package_name:string;price:number;currency?:string;sort_order:number}>;
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    redirect(errorPath + '?error=Invalid%20invoice%20items');
  }

  if (!items.length) redirect(errorPath + '?error=Add%20at%20least%20one%20item');
  if (!['paid','unpaid'].includes(paymentStatus)) redirect(errorPath + '?error=Invalid%20payment%20status');

  const cleanItems = items.map((item, index) => ({
    product_name: String(item.product_name || '').trim(),
    package_name: String(item.package_name || '').trim(),
    price: Number(item.price) || 0,
    currency: 'MMK',
    sort_order: index,
  }));

  if (cleanItems.some(item => !item.product_id || !item.package_id || !item.product_name || !item.package_name || item.price < 0)) {
    redirect(errorPath + '?error=Please%20check%20all%20invoice%20items');
  }

  const admin = createAdminClient();

  if (isReseller) {
    const packageIds = cleanItems.map(item => item.package_id);
    const [{ data: packages }, { data: prices }] = await Promise.all([
      admin.from('packages').select('id,name,product_id,products(name)').in('id', packageIds).eq('active', true),
      admin.from('prices').select('package_id,price').in('package_id', packageIds).eq('customer_type', 'reseller').eq('active', true),
    ]);
    const packageMap = new Map((packages ?? []).map((pkg:any) => [String(pkg.id), pkg]));
    const priceMap = new Map((prices ?? []).map((price:any) => [String(price.package_id), Number(price.price)]));
    const invalid = cleanItems.some(item => {
      const pkg:any = packageMap.get(item.package_id);
      const expected = priceMap.get(item.package_id);
      return !pkg || String(pkg.product_id) !== item.product_id || String(pkg.name).trim() !== item.package_name || String(pkg.products?.name || '').trim() !== item.product_name || expected === undefined || expected <= 0 || item.price !== expected;
    });
    if (invalid) redirect(errorPath + '?error=One%20or%20more%20items%20do%20not%20match%20the%20current%20reseller%20price');
  }
  const { data: number, error: numberError } = await admin.rpc('generate_invoice_number');
  if (numberError || !number) redirect(errorPath + '?error=Could%20not%20generate%20invoice%20number');

  const { data: invoice, error } = await admin
    .from('invoices')
    .insert({
      invoice_number: String(number),
      customer_name: customerName,
      product_name: cleanItems[0].product_name,
      package_name: cleanItems[0].package_name,
      price: cleanItems.reduce((sum, item) => sum + item.price, 0),
      currency: 'MMK',
      payment_status: paymentStatus,
      created_by: id,
    })
    .select('id')
    .single();

  if (error || !invoice) redirect(errorPath + '?error=Could%20not%20create%20invoice');

  const { error: itemError } = await admin.from('invoice_items').insert(
    cleanItems.map(item => ({ ...item, invoice_id: invoice.id }))
  );

  if (itemError) {
    await admin.from('invoices').delete().eq('id', invoice.id);
    redirect(errorPath + '?error=Could%20not%20save%20invoice%20items');
  }

  revalidatePath('/admin/invoices');
  revalidatePath('/dashboard/invoices');
  revalidatePath('/admin');
  redirect(errorPath + '?success=' + encodeURIComponent(String(number)));
}
