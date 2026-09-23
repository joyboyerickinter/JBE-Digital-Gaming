import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginForm from './LoginForm';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function Login({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    const userId = String(data.claims.sub);
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, active')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.active) {
      redirect(profile.role === 'admin' ? '/admin' : '/dashboard');
    }
  }

  const params = await searchParams;

  return (
    <main className="loginPage">
      <LoginForm error={params.error} />
      <div className="loginSupportLinks"><a href="https://t.me/JBE_OUTLINE_BOT" target="_blank" rel="noreferrer">Buy Outline VPN on Telegram →</a><span>Want a reseller account? <a href="https://t.me/Joy_Boy_Erick" target="_blank" rel="noreferrer">Contact @Joy_Boy_Erick</a></span></div>
    </main>
  );
}