import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JBE Digital + Gaming',
  description: 'Digital products, gaming top-ups and reseller management.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
