import LoginForm from './LoginForm';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function Login({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="loginPage">
      <LoginForm error={params.error} />
    </main>
  );
}
