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

function number(formData: FormData, key: string, fallback = 0) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export async function createProduct(formData: FormData) {
  const supabase = await requireAdmin();
  const name = text(formData, 'name');
  const slug = text(formData, 'slug').toLowerCase().replace(/\s+/g, '-');
  if (!name || !slug) redirect('/admin/catalog?error=Product%20name%20and%20slug%20are%20required');

  const { error } = await supabase.from('products').insert({
    name,
    slug,
    description: text(formData, 'description') || null,
    icon: text(formData, 'icon') || null,
    sort_order: number(formData, 'sort_order'),
    active: true,
  });

  if (error) redirect('/admin/catalog?error=Could%20not%20create%20product');
  revalidatePath('/admin/catalog');
  revalidatePath('/');
  redirect('/admin/catalog?success=Product%20created');
}

export async function updateProduct(formData: FormData) {
  const supabase = await requireAdmin();
  const id = text(formData, 'id');
  const name = text(formData, 'name');
  const slug = text(formData, 'slug').toLowerCase().replace(/\s+/g, '-');
  if (!id || !name || !slug) redirect('/admin/catalog?error=Product%20name%20and%20slug%20are%20required');

  const { error } = await supabase.from('products').update({
    name,
    slug,
    description: text(formData, 'description') || null,
    icon: text(formData, 'icon') || null,
    sort_order: number(formData, 'sort_order'),
    active: formData.get('active') === 'on',
  }).eq('id', id);

  if (error) redirect('/admin/catalog?error=Could%20not%20update%20product');
  revalidatePath('/admin/catalog');
  revalidatePath('/');
  redirect('/admin/catalog?success=Product%20updated');
}

export async function createPackage(formData: FormData) {
  const supabase = await requireAdmin();
  const productId = text(formData, 'product_id');
  const name = text(formData, 'name');
  if (!productId || !name) redirect('/admin/catalog?error=Product%20and%20package%20name%20are%20required');

  const { error } = await supabase.from('packages').insert({
    product_id: productId,
    name,
    description: text(formData, 'description') || null,
    sort_order: number(formData, 'sort_order'),
    active: true,
  });

  if (error) redirect('/admin/catalog?error=Could%20not%20create%20package');
  revalidatePath('/admin/catalog');
  revalidatePath('/');
  redirect('/admin/catalog?success=Package%20created');
}

export async function updatePackage(formData: FormData) {
  const supabase = await requireAdmin();
  const id = text(formData, 'id');
  const productId = text(formData, 'product_id');
  const name = text(formData, 'name');
  if (!id || !productId || !name) redirect('/admin/catalog?error=Package%20details%20are%20required');

  const { error } = await supabase.from('packages').update({
    product_id: productId,
    name,
    description: text(formData, 'description') || null,
    sort_order: number(formData, 'sort_order'),
    active: formData.get('active') === 'on',
  }).eq('id', id);

  if (error) redirect('/admin/catalog?error=Could%20not%20update%20package');
  revalidatePath('/admin/catalog');
  revalidatePath('/');
  redirect('/admin/catalog?success=Package%20updated');
}
