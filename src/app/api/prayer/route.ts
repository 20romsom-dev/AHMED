import { NextRequest } from 'next/server';

const ALADHAN_BASE = 'https://api.aladhan.com/v1';

// Cached realistic schedule for Cairo/Makkah when offline or rate-limited, clearly tagged with source='cached_schedule'
const FALLBACK_TIMINGS_BY_CITY: Record<
  string,
  {
    timings: Record<'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', string>;
    hijriDate: string;
    hijriMonthAr: string;
    hijriYear: string;
    weekdayAr: string;
  }
> = {
  cairo: {
    timings: {
      Fajr: '04:48',
      Sunrise: '06:16',
      Dhuhr: '11:39',
      Asr: '14:42',
      Maghrib: '17:02',
      Isha: '18:22',
    },
    hijriDate: '29 جمادى الأولى 1448',
    hijriMonthAr: 'جمادى الأولى',
    hijriYear: '1448',
    weekdayAr: 'الثلاثاء',
  },
  makkah: {
    timings: {
      Fajr: '05:06',
      Sunrise: '06:24',
      Dhuhr: '12:04',
      Asr: '15:18',
      Maghrib: '17:43',
      Isha: '19:13',
    },
    hijriDate: '29 جمادى الأولى 1448',
    hijriMonthAr: 'جمادى الأولى',
    hijriYear: '1448',
    weekdayAr: 'الثلاثاء',
  },
  riyadh: {
    timings: {
      Fajr: '04:44',
      Sunrise: '06:04',
      Dhuhr: '11:37',
      Asr: '14:46',
      Maghrib: '17:09',
      Isha: '18:39',
    },
    hijriDate: '29 جمادى الأولى 1448',
    hijriMonthAr: 'جمادى الأولى',
    hijriYear: '1448',
    weekdayAr: 'الثلاثاء',
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const city = (searchParams.get('city') || 'Cairo').trim();
  const country = (searchParams.get('country') || 'Egypt').trim();
  const method = searchParams.get('method') || '5';
  const school = searchParams.get('school') || '0';
  const adjustment = searchParams.get('adjustment') || '0';

  const nowISO = new Date().toISOString();
  const todayDateStr = nowISO.slice(0, 10);

  try {
    const apiUrl = `${ALADHAN_BASE}/timingsByCity?city=${encodeURIComponent(
      city
    )}&country=${encodeURIComponent(country)}&method=${encodeURIComponent(
      method
    )}&school=${encodeURIComponent(school)}&adjustment=${encodeURIComponent(adjustment)}`;

    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`AlAdhan returned status ${res.status}`);
    }

    const json = await res.json();
    const data = json?.data;
    const rawTimings = data?.timings;
    if (!rawTimings || !rawTimings.Fajr) {
      throw new Error('Malformed AlAdhan response');
    }

    const hijri = data?.date?.hijri;
    const cleanTime = (val: string) => String(val || '00:00').split(' ')[0];

    return Response.json({
      dateGregorian: todayDateStr,
      dateHijri: hijri
        ? `${hijri.day} ${hijri.month?.ar || ''} ${hijri.year}`
        : '29 جمادى الأولى 1448',
      hijriMonthAr: hijri?.month?.ar || 'جمادى الأولى',
      hijriYear: hijri?.year || '1448',
      weekdayAr: hijri?.weekday?.ar || 'اليوم',
      timings: {
        Fajr: cleanTime(rawTimings.Fajr),
        Sunrise: cleanTime(rawTimings.Sunrise),
        Dhuhr: cleanTime(rawTimings.Dhuhr),
        Asr: cleanTime(rawTimings.Asr),
        Maghrib: cleanTime(rawTimings.Maghrib),
        Isha: cleanTime(rawTimings.Isha),
      },
      fetchedAt: nowISO,
      source: 'aladhan_live',
    });
  } catch {
    const key = city.toLowerCase();
    const fallback = FALLBACK_TIMINGS_BY_CITY[key] || FALLBACK_TIMINGS_BY_CITY.cairo;

    return Response.json({
      dateGregorian: todayDateStr,
      dateHijri: fallback.hijriDate,
      hijriMonthAr: fallback.hijriMonthAr,
      hijriYear: fallback.hijriYear,
      weekdayAr: fallback.weekdayAr,
      timings: fallback.timings,
      fetchedAt: nowISO,
      source: 'cached_schedule',
    });
  }
}
