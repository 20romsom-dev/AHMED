import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Amiri } from 'next/font/google';
import './globals.css';
import { LifeOSProvider } from '@/context/LifeOSContext';

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const amiriQuran = Amiri({
  variable: '--font-quran',
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LifeOS — حياتك كلها... بتنظيم أذكى',
  description:
    'نظام تشغيل شخصي ذكي متكامل لإدارة التخطيط اليومي، المالية والميزانيات، العادات والصحة، ركن الدين الموثق، والأخبار اليومية.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LifeOS',
  },
};

export const viewport: Viewport = {
  themeColor: '#080D19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="midnight-aurora"
      className={`${ibmPlexArabic.variable} ${amiriQuran.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary selection:bg-primary-violet/30 selection:text-text-primary">
        <LifeOSProvider>{children}</LifeOSProvider>
      </body>
    </html>
  );
}
