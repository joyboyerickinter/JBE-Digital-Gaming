'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const userId = String(data.claims.sub);
  const { data: profile } = await supabase
    .from('profiles')
    .select('role,active')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.active || profile.role !== 'admin') {
    redirect('/dashboard?error=Admin%20access%20required');
  }

  const orderId = String(formData.get('order_id') || '').trim();
  const status = String(formData.get('status') || '').trim();
  const cancelReason = String(formData.get('cancel_reason') || '').trim();

  const errorPath = '/admin/orders/' + encodeURIComponent(orderId);

  if (!orderId || !['pending', 'done', 'cancel'].includes(status)) {
    redirect(errorPath + '?error=Invalid%20order%20status');
  }

  if (status === 'cancel' && !cancelReason) {
    redirect(errorPath + '?error=Cancel%20reason%20is%20required');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('orders')
    .update({
      status,
      cancel_reason: status === 'cancel' ? cancelReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    redirect(errorPath + '?error=Could%20not%20update%20order%20status');
  }

  redirect(errorPath + '?success=Order%20status%20updated');
}
