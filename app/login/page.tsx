import { login } from './actions';

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function Login({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return (
    <main className="loginPage">
      <div className="loginCard">
        <div className="brandMark large"><b>J</b><strong>BE</strong><i /></div>
        <span className="miniLabel">RESELLER ACCESS</span>
        <h1>Sign in</h1>
        <p>Sign in with your JBE reseller account.</p>
        {params.error && <div className="loginError">{params.error}</div>}
        <form action={login} className="loginForm">
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button type="submit" className="loginSubmit">Sign in →</button>
        </form>
        <a href="/" className="backBtn">← Back to catalog</a>
      </div>
    </main>
  );
}
