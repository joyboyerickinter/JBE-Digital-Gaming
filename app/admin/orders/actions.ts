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

  const { data: currentOrder, error: currentOrderError } = await admin
    .from('orders')
    .select('id,order_number,reseller_id,source,status')
    .eq('id', orderId)
    .maybeSingle();

  if (currentOrderError || !currentOrder) {
    redirect(errorPath + '?error=Order%20not%20found');
  }

  const statusChanged = String(currentOrder.status) !== status;

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

  if (statusChanged && currentOrder.source === 'reseller' && currentOrder.reseller_id) {
    const statusLabel = status === 'done' ? 'DONE' : status === 'cancel' ? 'CANCELLED' : 'PENDING';
    const message = status === 'cancel'
      ? `Order ${String(currentOrder.order_number)} status has been changed to ${statusLabel}. Cancel reason: ${cancelReason}`
      : `Order ${String(currentOrder.order_number)} status has been changed to ${statusLabel}.`;

    const { error: notificationError } = await admin.from('notifications').insert({
      user_id: String(currentOrder.reseller_id),
      type: 'order_status',
      order_id: String(currentOrder.id),
      order_number: String(currentOrder.order_number),
      title: `Order ${String(currentOrder.order_number)} updated`,
      message,
    });

    if (notificationError) {
      console.error('Reseller order notification failed:', notificationError);
    }
  }

  redirect(errorPath + '?success=Order%20status%20updated');
}
