'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteUrl.replace(/\\/$/, '')}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('If this email belongs to an account, a password reset link has been sent. Please check your inbox.');
    }
    setLoading(false);
  }

  return (
    <main className="passwordRecoveryPage">
      <section className="passwordRecoveryCard">
        <div className="passwordRecoveryHead">
          <div className="brandMark large" style={{ margin: '0 auto' }}><b>J</b><strong>BE</strong><i /></div>
          <span className="miniLabel">ACCOUNT RECOVERY</span>
          <h1>Forgot password?</h1>
          <p>Enter your account email and we’ll send you a secure password reset link.</p>
        </div>

        {message && <div className="loginAlert loginAlertSuccess" role="status"><span>✓</span><div><strong>Check your email</strong><p>{message}</p></div></div>}
        {error && <div className="loginAlert loginAlertError" role="alert"><span>!</span><div><strong>Could not send reset link</strong><p>{error}</p></div></div>}

        <form className="passwordRecoveryForm" onSubmit={submit}>
          <label><span>Email address</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required disabled={loading} /></label>
          <button className="adminPrimaryBtn" type="submit" disabled={loading}>
            {loading ? <><span className="buttonSpinner" aria-hidden="true" />Sending...</> : 'Send reset link'}
          </button>
        </form>

        <div className="passwordRecoveryLinks"><a href="/login">← Back to sign in</a></div>
      </section>
    </main>
  );
}
