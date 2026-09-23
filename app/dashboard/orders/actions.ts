'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAdminNewOrderEmail } from '@/lib/email';

async function requireReseller() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');
  const id = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id',id).maybeSingle();
  if (!profile?.active || profile.role !== 'reseller') redirect('/dashboard?error=Reseller%20access%20required');
  return id;
}

export async function createOrder(formData: FormData) {
  const resellerId = await requireReseller();
  const identifierType = String(formData.get('identifier_type') || 'in_game_id');
  const identifier = String(formData.get('customer_identifier') || '').trim();
  const customerName = String(formData.get('customer_name') || '').trim();
  const paymentMethod = String(formData.get('payment_method') || '');
  const transactionLast6 = String(formData.get('transaction_last6') || '').trim();
  const itemsRaw = String(formData.get('items') || '[]');
  const screenshot = formData.get('screenshot');

  const errorPath = '/dashboard/orders';
  if (!['in_game_id','email'].includes(identifierType)) redirect(errorPath + '?error=Invalid%20customer%20ID%20type');
  if (!identifier || !customerName) redirect(errorPath + '?error=Customer%20information%20is%20required');
  if (!['kpay','aya_pay'].includes(paymentMethod)) redirect(errorPath + '?error=Select%20a%20payment%20method');
  if (!/^[0-9]{6}$/.test(transactionLast6)) redirect(errorPath + '?error=Enter%20the%20last%206%20transaction%20digits');

  let rawItems: any[];
  try { rawItems = JSON.parse(itemsRaw); } catch { redirect(errorPath + '?error=Invalid%20order%20items'); }
  if (!Array.isArray(rawItems) || rawItems.length === 0) redirect(errorPath + '?error=Add%20at%20least%20one%20package');

  const items = rawItems.map((item, index) => ({
    product_id: String(item.product_id || ''),
    package_id: String(item.package_id || ''),
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    sort_order: index,
  }));

  if (items.some(item => !item.product_id || !item.package_id)) redirect(errorPath + '?error=Invalid%20order%20item');

  const admin = createAdminClient();
  const packageIds = items.map(item => item.package_id);
  const { data: packages } = await admin
    .from('packages')
    .select('id,name,product_id,active,products(id,name,active),prices(price,customer_type,active)')
    .in('id', packageIds)
    .eq('active', true);

  const packageMap = new Map((packages ?? []).map((pkg:any) => [String(pkg.id), pkg]));
  const cleanItems = items.map(item => {
    const pkg:any = packageMap.get(item.package_id);
    const price = Number(pkg?.prices?.find((p:any) => p.customer_type === 'reseller' && p.active)?.price ?? 0);
    return { ...item, product_name: String(pkg?.products?.name || ''), package_name: String(pkg?.name || ''), product_active: Boolean(pkg?.products?.active), reseller_price: price };
  });

  if (cleanItems.some(item => !item.product_name || !item.package_name || item.reseller_price <= 0 || !item.package_id || !item.product_active || item.product_id !== String(packageMap.get(item.package_id)?.product_id || ''))) {
    redirect(errorPath + '?error=One%20or%20more%20packages%20are%20unavailable');
  }

  const total = cleanItems.reduce((sum,item) => sum + item.reseller_price * item.quantity, 0);
  if (total <= 0) redirect(errorPath + '?error=Invalid%20order%20total');

  let screenshotPath: string | null = null;
  if (!(screenshot instanceof File) || screenshot.size === 0) {
    redirect(errorPath + '?error=Payment%20screenshot%20is%20required');
  }
  if (screenshot.size > 8 * 1024 * 1024) redirect(errorPath + '?error=Screenshot%20must%20be%208MB%20or%20smaller');
  if (!['image/jpeg','image/png','image/webp'].includes(screenshot.type)) redirect(errorPath + '?error=Use%20JPG%2C%20PNG%20or%20WEBP%20screenshot');

  const { data: orderNumber, error: numberError } = await admin.rpc('generate_order_number');
  if (numberError || !orderNumber) redirect(errorPath + '?error=Could%20not%20generate%20order%20number');

  const { data: order, error } = await admin.from('orders').insert({
    order_number: String(orderNumber),
    reseller_id: resellerId,
    customer_identifier: identifier,
    customer_identifier_type: identifierType,
    customer_name: customerName,
    payment_method: paymentMethod,
    transaction_last6: transactionLast6,
    status: 'pending',
    total_amount: total,
    currency: 'MMK',
  }).select('id,order_number').single();

  if (error || !order) redirect(errorPath + '?error=Could%20not%20create%20order');

  const extension = screenshot.type === 'image/png' ? 'png' : screenshot.type === 'image/webp' ? 'webp' : 'jpg';
  screenshotPath = resellerId + '/' + String(order.id) + '.' + extension;
  const { error: uploadError } = await admin.storage.from('order-screenshots').upload(screenshotPath, screenshot, { contentType: screenshot.type, upsert: false });
  if (uploadError) {
    await admin.from('orders').delete().eq('id', order.id);
    redirect(errorPath + '?error=Could%20not%20save%20payment%20screenshot');
  }

  const { error: screenshotPathError } = await admin
    .from('orders')
    .update({ screenshot_path: screenshotPath, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  if (screenshotPathError) {
    await admin.storage.from('order-screenshots').remove([screenshotPath]);
    await admin.from('orders').delete().eq('id', order.id);
    redirect(errorPath + '?error=Could%20not%20link%20payment%20screenshot');
  }

  const { error: itemError } = await admin.from('order_items').insert(cleanItems.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    package_id: item.package_id,
    product_name: item.product_name,
    package_name: item.package_name,
    reseller_price: item.reseller_price,
    quantity: item.quantity,
    sort_order: item.sort_order,
  })));

  if (itemError) {
    await admin.storage.from('order-screenshots').remove([screenshotPath]);
    await admin.from('orders').delete().eq('id', order.id);
    redirect(errorPath + '?error=Could%20not%20save%20order%20items');
  }

  const { data: resellerProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', resellerId)
    .maybeSingle();

  try {
    await sendAdminNewOrderEmail({
      order_number: String(order.order_number),
      reseller_name: String(resellerProfile?.full_name || 'Reseller'),
      customer_name: customerName,
      customer_identifier: identifier,
      customer_identifier_type: identifierType,
      payment_method: paymentMethod,
      transaction_last6: transactionLast6,
      total_amount: total,
    });
  } catch (emailError) {
    console.error('New order email notification failed:', emailError);
  }

  redirect('/dashboard/orders/' + order.id);
}
