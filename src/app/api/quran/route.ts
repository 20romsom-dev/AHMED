import { NextRequest } from 'next/server';
import { VERIFIED_OFFLINE_SURAHS } from '@/domain/deen/verified-data';

const ALQURAN_BASE = 'https://api.alquran.cloud/v1';

export async function GET(request: NextRequest) {
  const surahParam = request.nextUrl.searchParams.get('surah') || '1';
  const surahNumber = Math.max(1, Math.min(114, parseInt(surahParam, 10) || 1));

  try {
    const res = await fetch(`${ALQURAN_BASE}/surah/${surahNumber}/quran-uthmani`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      throw new Error(`AlQuran Cloud returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const data = json?.data;
    if (!data || !Array.isArray(data.ayahs)) {
      throw new Error('Invalid AlQuran Cloud payload');
    }

    return Response.json({
      number: data.number,
      nameAr: data.name,
      englishName: data.englishName,
      revelationType: data.revelationType,
      ayahs: data.ayahs.map(
        (a: { numberInSurah: number; text: string; page: number; juz: number }) => ({
          numberInSurah: a.numberInSurah,
          text: a.text,
          page: a.page,
          juz: a.juz,
        })
      ),
      source: 'alquran_cloud_live',
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    const verifiedFallback = VERIFIED_OFFLINE_SURAHS[surahNumber] || VERIFIED_OFFLINE_SURAHS[1];
    return Response.json({
      ...verifiedFallback,
      source: 'verified_uthmani_cache',
      fetchedAt: new Date().toISOString(),
    });
  }
}
