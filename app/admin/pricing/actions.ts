'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', String(data.claims.sub))
    .maybeSingle();

  if (!profile?.active || profile.role !== 'admin') redirect('/dashboard');
  return supabase;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function price(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function saveProductPrices(formData: FormData) {
  const supabase = await requireAdmin();
  const productId = text(formData, 'product_id');
  const rawItems = text(formData, 'items');

  if (!productId || !rawItems) {
    redirect('/admin/pricing?error=No%20pricing%20data%20submitted');
  }

  let items: Array<{
    package_id: string;
    b2c_price: number;
    reseller_price: number;
    b2c_active: boolean;
    reseller_active: boolean;
  }>;

  try {
    const parsed = JSON.parse(rawItems);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid pricing data');
    items = parsed.map((item) => ({
      package_id: String(item.package_id || ''),
      b2c_price: Number(item.b2c_price),
      reseller_price: Number(item.reseller_price),
      b2c_active: Boolean(item.b2c_active),
      reseller_active: Boolean(item.reseller_active),
    }));

    if (items.some(item =>
      !item.package_id ||
      !Number.isFinite(item.b2c_price) || item.b2c_price < 0 ||
      !Number.isFinite(item.reseller_price) || item.reseller_price < 0
    )) throw new Error('Invalid pricing data');
  } catch {
    redirect('/admin/pricing?error=Please%20enter%20valid%20prices');
  }

  const packageIds = items.map(item => item.package_id);
  const { data: packages, error: packageError } = await supabase
    .from('packages')
    .select('id,product_id')
    .eq('product_id', productId)
    .in('id', packageIds);

  if (packageError || !packages || packages.length !== items.length) {
    redirect('/admin/pricing?error=One%20or%20more%20packages%20are%20invalid');
  }

  const validIds = new Set(packages.map(item => item.id));
  if (items.some(item => !validIds.has(item.package_id))) {
    redirect('/admin/pricing?error=One%20or%20more%20packages%20are%20invalid');
  }

  const rows = items.flatMap(item => [
    {
      package_id: item.package_id,
      customer_type: 'b2c',
      price: item.b2c_price,
      currency: 'MMK',
      active: item.b2c_active,
    },
    {
      package_id: item.package_id,
      customer_type: 'reseller',
      price: item.reseller_price,
      currency: 'MMK',
      active: item.reseller_active,
    },
  ]);

  const { error } = await supabase
    .from('prices')
    .upsert(rows, { onConflict: 'package_id,customer_type' });

  if (error) redirect('/admin/pricing?error=Could%20not%20save%20prices');

  revalidatePath('/admin/pricing');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/');
  redirect('/admin/pricing?success=All%20prices%20saved');
}
