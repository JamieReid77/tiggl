import type { Metadata } from 'next';
import { Geist_Mono, Public_Sans, Source_Serif_4 } from 'next/font/google';

import { Analytics } from '@vercel/analytics/next';

import { cn } from '@/lib/utils';

import './globals.css';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  weight: ['500', '600', '700'],
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  weight: ['400', '500', '600'],
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

const title = 'Tiggl';
const description =
  'Chase the circles through ten levels. Avoid the bad eggs — a bump will crash the round.';

export const metadata: Metadata = {
  title,
  description,
  applicationName: title,
  openGraph: {
    title,
    description,
    siteName: title,
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html
      lang="en-GB"
      className={cn(
        'dark h-full antialiased',
        sourceSerif.variable,
        publicSans.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full bg-zinc-950 font-sans text-zinc-50">
        {children}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
