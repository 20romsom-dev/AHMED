import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LifeOS — حياتك كلها... بتنظيم أذكى',
    short_name: 'LifeOS',
    description:
      'نظام تشغيل شخصي متكامل للتخطيط، المالية، العادات، ركن الدين، والأخبار اليومية.',
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#080D19',
    theme_color: '#080D19',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
