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

export async function savePrices(formData: FormData) {
  const supabase = await requireAdmin();
  const packageId = text(formData, 'package_id');
  const b2cPrice = price(formData, 'b2c_price');
  const resellerPrice = price(formData, 'reseller_price');

  if (!packageId || b2cPrice === null || resellerPrice === null) {
    redirect('/admin/pricing?error=Please%20enter%20valid%20prices');
  }

  const { error } = await supabase
    .from('prices')
    .upsert(
      [
        {
          package_id: packageId,
          customer_type: 'b2c',
          price: b2cPrice,
          currency: 'MMK',
          active: formData.get('b2c_active') === 'on',
        },
        {
          package_id: packageId,
          customer_type: 'reseller',
          price: resellerPrice,
          currency: 'MMK',
          active: formData.get('reseller_active') === 'on',
        },
      ],
      { onConflict: 'package_id,customer_type' }
    );

  if (error) redirect('/admin/pricing?error=Could%20not%20save%20prices');

  revalidatePath('/admin/pricing');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/');
  redirect('/admin/pricing?success=Prices%20saved');
}
