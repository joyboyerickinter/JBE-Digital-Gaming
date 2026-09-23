'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect('/login?error=Please%20sign%20in%20again');

  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;

  if (!email) redirect('/dashboard/profile?error=Your%20account%20email%20could%20not%20be%20verified');

  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (!currentPassword || !newPassword || !confirmPassword) redirect('/dashboard/profile?error=Please%20fill%20in%20all%20password%20fields');
  if (newPassword.length < 8) redirect('/dashboard/profile?error=New%20password%20must%20be%20at%20least%208%20characters');
  if (newPassword !== confirmPassword) redirect('/dashboard/profile?error=New%20passwords%20do%20not%20match');

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) redirect('/dashboard/profile?error=Current%20password%20is%20incorrect');

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) redirect('/dashboard/profile?error=' + encodeURIComponent(updateError.message));

  revalidatePath('/dashboard/profile');
  redirect('/dashboard/profile?success=Password%20updated%20successfully');
}
