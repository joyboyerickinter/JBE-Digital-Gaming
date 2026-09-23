'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateOrderStatus } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="orderStatusSaveBtn" type="submit" disabled={pending}>
      {pending ? <><span className="buttonSpinner" /> Updating...</> : 'Update status'}
    </button>
  );
}

export default function OrderStatusForm({
  orderId,
  currentStatus,
  currentReason,
}: {
  orderId: string;
  currentStatus: string;
  currentReason: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState(currentReason ?? '');

  return (
    <form action={updateOrderStatus} className="orderStatusForm">
      <input type="hidden" name="order_id" value={orderId} />
      <div className="orderStatusControls">
        <label>
          <span>Status</span>
          <select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
            <option value="cancel">Cancel</option>
          </select>
        </label>
        {status === 'cancel' && (
          <label className="orderCancelReasonField">
            <span>Cancel reason <b>*</b></span>
            <textarea
              name="cancel_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this order cancelled?"
              rows={3}
              required
            />
          </label>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
