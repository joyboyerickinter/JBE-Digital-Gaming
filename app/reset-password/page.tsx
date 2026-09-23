'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) setError('This reset link is invalid or has expired. Please request a new one.');
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Password updated successfully. You can now sign in with your new password.');
      setPassword('');
      setConfirm('');
    }
    setLoading(false);
  }

  return (
    <main className="passwordRecoveryPage">
      <section className="passwordRecoveryCard">
        <div className="passwordRecoveryHead">
          <div className="brandMark large" style={{ margin: '0 auto' }}><b>J</b><strong>BE</strong><i /></div>
          <span className="miniLabel">ACCOUNT SECURITY</span>
          <h1>Set new password</h1>
          <p>Choose a new password for your JBE account.</p>
        </div>

        {message && <div className="loginAlert loginAlertSuccess" role="status"><span>✓</span><div><strong>Password updated</strong><p>{message}</p></div></div>}
        {error && <div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Could not reset password</strong><p>{error}</p></div></div>}

        {ready && !message && (
          <form className="passwordRecoveryForm" onSubmit={submit}>
            <label><span>New password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required disabled={loading} /></label>
            <label><span>Confirm new password</span><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required disabled={loading} /></label>
            <p className="profilePasswordHint">Minimum 8 characters.</p>
            <button className="adminPrimaryBtn" type="submit" disabled={loading}>
              {loading ? <><span className="buttonSpinner" aria-hidden="true" />Updating...</> : 'Update password'}
            </button>
          </form>
        )}

        <div className="passwordRecoveryLinks"><a href="/login">← Back to sign in</a></div>
      </section>
    </main>
  );
}
