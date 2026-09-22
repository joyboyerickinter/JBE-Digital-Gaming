'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function createReseller(formData: FormData) {
  await requireAdmin();

  const email = text(formData, 'email').toLowerCase();
  const password = text(formData, 'password');
  const fullName = text(formData, 'full_name');

  if (!email || !password || password.length < 8) {
    redirect('/admin/accounts?error=Enter%20an%20email%20and%20a%20password%20of%20at%20least%208%20characters');
  }

  const admin = createAdminClient();

  const { count } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) >= 10) {
    redirect('/admin/accounts?error=Maximum%20of%2010%20accounts%20reached');
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !created.user) {
    redirect('/admin/accounts?error=Could%20not%20create%20reseller%20account');
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: fullName || email,
      role: 'reseller',
      active: true,
    })
    .eq('id', created.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    redirect('/admin/accounts?error=Could%20not%20create%20reseller%20profile');
  }

  revalidatePath('/admin/accounts');
  revalidatePath('/admin');
  redirect('/admin/accounts?success=Reseller%20account%20created');
}

export async function updateReseller(formData: FormData) {
  await requireAdmin();

  const id = text(formData, 'id');
  const fullName = text(formData, 'full_name');

  if (!id) redirect('/admin/accounts?error=Invalid%20account');

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({
      full_name: fullName || null,
      role: 'reseller',
      active: formData.get('active') === 'on',
    })
    .eq('id', id);

  if (error) redirect('/admin/accounts?error=Could%20not%20update%20reseller');

  revalidatePath('/admin/accounts');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  redirect('/admin/accounts?success=Reseller%20updated');
}
