'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from './actions';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <main className="loginPage">
      {error && (
        <div className="loginAlert loginAlertError" role="alert">
          <span>!</span>
          <div>
            <strong>Sign in failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="loginShell">
        <div className="loginVisual">
          <div className="loginVisualGlow" />
          <div className="loginVisualTop">
            <div className="brand">
              <span className="brandMark"><b>J</b><strong>BE</strong><i /></span>
              <span><b>JBE</b><small>Digital + Gaming</small></span>
            </div>
            <span className="loginLive"><i /> SECURE ACCESS</span>
          </div>
          <div className="loginVisualContent">
            <span className="miniLabel">JBE RESELLER PORTAL</span>
            <h1>Run your<br /><em>digital business.</em></h1>
            <p>Access reseller pricing, invoices and your JBE business tools from one place.</p>
            <div className="loginFeatureGrid">
              <div><b>B2B</b><span>Reseller pricing</span></div>
              <div><b>PDF</b><span>Invoice tools</span></div>
              <div><b>24/7</b><span>Catalog access</span></div>
            </div>
          </div>
          <div className="loginVisualFooter"><span>JBE Digital + Gaming</span><span>Private reseller area</span></div>
        </div>

        <div className="loginPanel">
          <div className="loginPanelHeader">
            <div className="brandMark large"><b>J</b><strong>BE</strong><i /></div>
            <span className="miniLabel">RESELLER ACCESS</span>
            <h2>Welcome back</h2>
            <p>Sign in to continue to your JBE reseller account.</p>
          </div>

          <form action={login} className="loginForm" onSubmit={() => setLoading(true)}>
            <label>
              <span>Email address</span>
              <div className="inputWrap"><span>✉</span><input name="email" type="email" placeholder="you@example.com" autoComplete="email" required disabled={loading} /></div>
            </label>
            <label>
              <span>Password</span>
              <div className="inputWrap"><span>••</span><input name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required disabled={loading} /></div>
            </label>
            <button type="submit" className="loginSubmit" disabled={loading}>
              {loading ? <><i className="loginSpinner" /> Signing in...</> : <>Sign in to JBE <span>→</span></>}
            </button>
          </form>

          <div className="loginHint"><span>●</span><p>Your reseller account is managed by JBE Digital + Gaming.</p></div>
          <a href="/" className="backBtn">← Back to public catalog</a>
        </div>
      </section>
    </main>
  );
}
