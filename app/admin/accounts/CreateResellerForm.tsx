'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton({ canCreate }: { canCreate: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="adminPrimaryBtn" type="submit" disabled={!canCreate || pending}>
      {pending ? (
        <>
          <span className="buttonSpinner" aria-hidden="true" />
          Creating reseller...
        </>
      ) : (
        canCreate ? 'Create reseller' : 'Account limit reached'
      )}
    </button>
  );
}

export default function CreateResellerForm({
  action,
  canCreate,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canCreate: boolean;
}) {
  return (
    <form action={action} className="adminForm">
      <label>Full name<input name="full_name" placeholder="e.g. John Doe" /></label>
      <label>Email<input name="email" type="email" placeholder="reseller@example.com" required /></label>
      <label>Password<input name="password" type="password" placeholder="At least 8 characters" minLength={8} required /></label>
      <SubmitButton canCreate={canCreate} />
    </form>
  );
}
