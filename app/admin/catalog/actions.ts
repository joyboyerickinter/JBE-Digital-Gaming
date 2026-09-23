'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'product-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function uploadProductImage(file: FormDataEntryValue | null, productId: string) {
  if (!(file instanceof File) || file.size === 0) return { path: null as string | null, error: null as string | null };
  if (!ALLOWED_TYPES.has(file.type)) return { path: null, error: 'Only JPG, PNG or WEBP images are allowed' };
  if (file.size > MAX_IMAGE_SIZE) return { path: null, error: 'Product image must be 5MB or smaller' };
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = productId + '/product-' + Date.now() + '.' + ext;
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true, cacheControl: '31536000' });
  return { path: error ? null : path, error: error?.message ?? null };
}

async function deleteProductImage(path: string | null) {
  if (path) await createAdminClient().storage.from(BUCKET).remove([path]);
}

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

  const { data: product, error } = await supabase.from('products').insert({
    name,
    slug,
    description: text(formData, 'description') || null,
    icon: text(formData, 'icon') || null,
    sort_order: number(formData, 'sort_order'),
    active: true,
  }).select('id').single();

  if (error || !product) redirect('/admin/catalog?error=Could%20not%20create%20product');

  const uploaded = await uploadProductImage(formData.get('image'), product.id);
  if (uploaded.error) {
    await createAdminClient().from('products').delete().eq('id', product.id);
    redirect('/admin/catalog?error=' + encodeURIComponent(uploaded.error));
  }
  if (uploaded.path) {
    const { error: imageError } = await supabase.from('products').update({ image_path: uploaded.path }).eq('id', product.id);
    if (imageError) {
      await deleteProductImage(uploaded.path);
      await createAdminClient().from('products').delete().eq('id', product.id);
      redirect('/admin/catalog?error=Could%20not%20save%20product%20image');
    }
  }
  revalidatePath('/admin/catalog');
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/orders');
  redirect('/admin/catalog?success=Product%20created');
}

export async function updateProduct(formData: FormData) {
  const supabase = await requireAdmin();
  const id = text(formData, 'id');
  const name = text(formData, 'name');
  const slug = text(formData, 'slug').toLowerCase().replace(/\s+/g, '-');
  if (!id || !name || !slug) redirect('/admin/catalog?error=Product%20name%20and%20slug%20are%20required');

  const { data: existing } = await supabase.from('products').select('image_path').eq('id', id).maybeSingle();
  if (!existing) redirect('/admin/catalog?error=Product%20not%20found');
  const removeImage = formData.get('remove_image') === 'on';
  const uploaded = await uploadProductImage(formData.get('image'), id);
  if (uploaded.error) redirect('/admin/catalog?error=' + encodeURIComponent(uploaded.error));
  const nextImagePath = uploaded.path ?? (removeImage ? null : existing.image_path);

  const { error } = await supabase.from('products').update({
    name,
    slug,
    description: text(formData, 'description') || null,
    icon: text(formData, 'icon') || null,
    image_path: nextImagePath,
    sort_order: number(formData, 'sort_order'),
    active: formData.get('active') === 'on',
  }).eq('id', id);

  if (error) {
    if (uploaded.path) await deleteProductImage(uploaded.path);
    redirect('/admin/catalog?error=Could%20not%20update%20product');
  }
  if ((removeImage || uploaded.path) && existing.image_path && existing.image_path !== nextImagePath) await deleteProductImage(existing.image_path);
  revalidatePath('/admin/catalog');
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/orders');
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
