'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function adjustResellerCoins(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');
  const adminId = String(data.claims.sub);
  const { data: profile } = await supabase.from('profiles').select('role,active').eq('id', adminId).maybeSingle();
  if (!profile?.active || profile.role !== 'admin') redirect('/dashboard?error=Admin%20access%20required');

  const resellerId = String(formData.get('reseller_id') || '');
  const amount = Number(formData.get('amount'));
  const reason = String(formData.get('reason') || '').trim();
  if (!resellerId || !Number.isInteger(amount) || amount === 0 || reason.length < 3) {
    redirect('/admin/coins?error=Enter%20a%20nonzero%20whole%20coin%20amount%20and%20reason');
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc('admin_adjust_reseller_coins', {
    p_reseller_id: resellerId,
    p_amount: amount,
    p_reason: reason,
    p_admin_id: adminId,
  });
  if (error) {
    const message = error.message.includes('negative') ? 'Balance%20cannot%20be%20negative' : 'Could%20not%20adjust%20coins';
    redirect('/admin/coins?error=' + message);
  }
  redirect('/admin/coins?success=Coin%20balance%20updated');
}
