import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Public_Sans, Source_Serif_4 } from 'next/font/google';

import { Analytics } from '@vercel/analytics/next';

import './globals.css';
import { siteDescription, siteName, siteOgImage, siteUrl } from '@/lib/site';
import { cn } from '@/lib/utils';

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

export const viewport: Viewport = {
  themeColor: '#030304',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteName,
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: 'Tay Digital', url: 'https://taydigital.co.uk' }],
  creator: 'Tay Digital',
  publisher: 'Tay Digital',
  category: 'games',
  keywords: [
    'Tiggl',
    'Tay Digital',
    'browser game',
    'arcade game',
    'mouse game',
    'HTML5 game',
    'web game',
    'casual game',
    'action game',
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: siteUrl,
    siteName: siteName,
    locale: 'en_GB',
    type: 'website',
    images: [siteOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: siteDescription,
    creator: '@taydigital',
    images: [siteOgImage.url],
  },
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: 'black-translucent',
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html
      lang="en-GB"
      className={cn(
        'dark min-h-dvh antialiased',
        sourceSerif.variable,
        publicSans.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-dvh bg-[#030304] font-sans text-zinc-50">
        {children}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
