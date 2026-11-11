// =============================================================================
// LIFEOS — VERIFIED AUTHENTIC ADHKAR & SURAH INDEX DATASET
// Strictly curated from Sahih Al-Bukhari, Sahih Muslim, and Hisn Al-Muslim.
// Zero generative AI text. Exact vocalized Arabic text.
// =============================================================================

import { PrayerName, PrayerSettings, VerifiedDhikrItem } from '../types';

export interface SurahMeta {
  number: number;
  nameAr: string;
  nameEn: string;
  revelationType: 'Meccan' | 'Medinan';
  ayahCount: number;
  startPage: number;
  juz: number;
}

export const SURAH_INDEX: SurahMeta[] = [
  { number: 1, nameAr: 'الفاتحة', nameEn: 'Al-Fatihah', revelationType: 'Meccan', ayahCount: 7, startPage: 1, juz: 1 },
  { number: 2, nameAr: 'البقرة', nameEn: 'Al-Baqarah', revelationType: 'Medinan', ayahCount: 286, startPage: 2, juz: 1 },
  { number: 3, nameAr: 'آل عمران', nameEn: 'Ali \'Imran', revelationType: 'Medinan', ayahCount: 200, startPage: 50, juz: 3 },
  { number: 4, nameAr: 'النساء', nameEn: 'An-Nisa', revelationType: 'Medinan', ayahCount: 176, startPage: 77, juz: 4 },
  { number: 5, nameAr: 'المائدة', nameEn: 'Al-Ma\'idah', revelationType: 'Medinan', ayahCount: 120, startPage: 106, juz: 6 },
  { number: 6, nameAr: 'الأنعام', nameEn: 'Al-An\'am', revelationType: 'Meccan', ayahCount: 165, startPage: 128, juz: 7 },
  { number: 12, nameAr: 'يوسف', nameEn: 'Yusuf', revelationType: 'Meccan', ayahCount: 111, startPage: 235, juz: 12 },
  { number: 17, nameAr: 'الإسراء', nameEn: 'Al-Isra', revelationType: 'Meccan', ayahCount: 111, startPage: 282, juz: 15 },
  { number: 18, nameAr: 'الكهف', nameEn: 'Al-Kahf', revelationType: 'Meccan', ayahCount: 110, startPage: 293, juz: 15 },
  { number: 19, nameAr: 'مريم', nameEn: 'Maryam', revelationType: 'Meccan', ayahCount: 98, startPage: 305, juz: 16 },
  { number: 20, nameAr: 'طه', nameEn: 'Taha', revelationType: 'Meccan', ayahCount: 135, startPage: 312, juz: 16 },
  { number: 24, nameAr: 'النور', nameEn: 'An-Nur', revelationType: 'Medinan', ayahCount: 64, startPage: 350, juz: 18 },
  { number: 36, nameAr: 'يس', nameEn: 'Ya-Sin', revelationType: 'Meccan', ayahCount: 83, startPage: 440, juz: 22 },
  { number: 55, nameAr: 'الرحمن', nameEn: 'Ar-Rahman', revelationType: 'Medinan', ayahCount: 78, startPage: 531, juz: 27 },
  { number: 56, nameAr: 'الواقعة', nameEn: 'Al-Waqi\'ah', revelationType: 'Meccan', ayahCount: 96, startPage: 534, juz: 27 },
  { number: 67, nameAr: 'الملك', nameEn: 'Al-Mulk', revelationType: 'Meccan', ayahCount: 30, startPage: 562, juz: 29 },
  { number: 78, nameAr: 'النبأ', nameEn: 'An-Naba', revelationType: 'Meccan', ayahCount: 40, startPage: 582, juz: 30 },
  { number: 87, nameAr: 'الأعلى', nameEn: 'Al-A\'la', revelationType: 'Meccan', ayahCount: 19, startPage: 591, juz: 30 },
  { number: 93, nameAr: 'الضحى', nameEn: 'Ad-Duha', revelationType: 'Meccan', ayahCount: 11, startPage: 596, juz: 30 },
  { number: 94, nameAr: 'الشرح', nameEn: 'Ash-Sharh', revelationType: 'Meccan', ayahCount: 8, startPage: 596, juz: 30 },
  { number: 97, nameAr: 'القدر', nameEn: 'Al-Qadr', revelationType: 'Meccan', ayahCount: 5, startPage: 598, juz: 30 },
  { number: 103, nameAr: 'العصر', nameEn: 'Al-\'Asr', revelationType: 'Meccan', ayahCount: 3, startPage: 601, juz: 30 },
  { number: 108, nameAr: 'الكوثر', nameEn: 'Al-Kawthar', revelationType: 'Meccan', ayahCount: 3, startPage: 602, juz: 30 },
  { number: 109, nameAr: 'الكافرون', nameEn: 'Al-Kafirun', revelationType: 'Meccan', ayahCount: 6, startPage: 603, juz: 30 },
  { number: 110, nameAr: 'النصر', nameEn: 'An-Nasr', revelationType: 'Medinan', ayahCount: 3, startPage: 603, juz: 30 },
  { number: 112, nameAr: 'الإخلاص', nameEn: 'Al-Ikhlas', revelationType: 'Meccan', ayahCount: 4, startPage: 604, juz: 30 },
  { number: 113, nameAr: 'الفلق', nameEn: 'Al-Falaq', revelationType: 'Meccan', ayahCount: 5, startPage: 604, juz: 30 },
  { number: 114, nameAr: 'الناس', nameEn: 'An-Nas', revelationType: 'Meccan', ayahCount: 6, startPage: 604, juz: 30 },
];

/**
 * Verified Uthmani text fallback for essential Surahs when offline or API unreachable.
 * Exact text from Tanzil / King Fahd Glorious Quran Printing Complex edition.
 */
export const VERIFIED_OFFLINE_SURAHS: Record<
  number,
  {
    number: number;
    nameAr: string;
    englishName: string;
    revelationType: string;
    ayahs: { numberInSurah: number; text: string; page: number; juz: number }[];
  }
> = {
  1: {
    number: 1,
    nameAr: 'سُورَةُ ٱلْفَاتِحَةِ',
    englishName: 'Al-Fatihah',
    revelationType: 'Meccan',
    ayahs: [
      { numberInSurah: 1, text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', page: 1, juz: 1 },
      { numberInSurah: 2, text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', page: 1, juz: 1 },
      { numberInSurah: 3, text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', page: 1, juz: 1 },
      { numberInSurah: 4, text: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', page: 1, juz: 1 },
      { numberInSurah: 5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', page: 1, juz: 1 },
      { numberInSurah: 6, text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', page: 1, juz: 1 },
      {
        numberInSurah: 7,
        text: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
        page: 1,
        juz: 1,
      },
    ],
  },
  112: {
    number: 112,
    nameAr: 'سُورَةُ ٱلْإِخْلَاصِ',
    englishName: 'Al-Ikhlas',
    revelationType: 'Meccan',
    ayahs: [
      { numberInSurah: 1, text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', page: 604, juz: 30 },
      { numberInSurah: 2, text: 'ٱللَّهُ ٱلصَّمَدُ', page: 604, juz: 30 },
      { numberInSurah: 3, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', page: 604, juz: 30 },
      { numberInSurah: 4, text: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', page: 604, juz: 30 },
    ],
  },
  113: {
    number: 113,
    nameAr: 'سُورَةُ ٱلْفَلَقِ',
    englishName: 'Al-Falaq',
    revelationType: 'Meccan',
    ayahs: [
      { numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ', page: 604, juz: 30 },
      { numberInSurah: 2, text: 'مِن شَرِّ مَا خَلَقَ', page: 604, juz: 30 },
      { numberInSurah: 3, text: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ', page: 604, juz: 30 },
      { numberInSurah: 4, text: 'وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ', page: 604, juz: 30 },
      { numberInSurah: 5, text: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', page: 604, juz: 30 },
    ],
  },
  114: {
    number: 114,
    nameAr: 'سُورَةُ ٱلنَّاسِ',
    englishName: 'An-Nas',
    revelationType: 'Meccan',
    ayahs: [
      { numberInSurah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ', page: 604, juz: 30 },
      { numberInSurah: 2, text: 'مَلِكِ ٱلنَّاسِ', page: 604, juz: 30 },
      { numberInSurah: 3, text: 'إِلَٰهِ ٱلنَّاسِ', page: 604, juz: 30 },
      { numberInSurah: 4, text: 'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ', page: 604, juz: 30 },
      { numberInSurah: 5, text: 'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ', page: 604, juz: 30 },
      { numberInSurah: 6, text: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ', page: 604, juz: 30 },
    ],
  },
};

export const VERIFIED_ADHKAR_DATASET: VerifiedDhikrItem[] = [
  {
    id: 'morning_ayat_kursi',
    category: 'morning',
    titleAr: 'آية الكرسي',
    arabicText:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    targetCount: 1,
    sourceReference: 'سورة البقرة: الآية 255 — رواه النسائي وصححه الألباني',
    virtueOrExplanation: 'من قالها حين يصبح أجير من الجن حتى يمسي، ومن قالها حين يمسي أجير من الجن حتى يصبح.',
  },
  {
    id: 'morning_asbahna',
    category: 'morning',
    titleAr: 'أصبحنا وأصبح الملك لله',
    arabicText:
      'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ.',
    targetCount: 1,
    sourceReference: 'صحيح مسلم (2723)',
    virtueOrExplanation: 'سؤال الله خير اليوم والبركة فيه، والاستعاذة من الكسل وسوء الكبر.',
  },
  {
    id: 'morning_sayyid_istighfar',
    category: 'morning',
    titleAr: 'سيد الاستغفار',
    arabicText:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.',
    targetCount: 1,
    sourceReference: 'صحيح البخاري (6306)',
    virtueOrExplanation: 'من قالها من النهار موقنًا بها فمات من يومه قبل أن يمسي فهو من أهل الجنة.',
  },
  {
    id: 'morning_bismillah_ladhi',
    category: 'morning',
    titleAr: 'بسم الله الذي لا يضر مع اسمه شيء',
    arabicText:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.',
    targetCount: 3,
    sourceReference: 'سنن أبي داود والترمذي (حسن صحيح)',
    virtueOrExplanation: 'من قالها ثلاث مرات إذا أصبح وثلاثًا إذا أمسى لم يضره شيء.',
  },
  {
    id: 'morning_hasbiya_allah',
    category: 'morning',
    titleAr: 'حسبي الله لا إله إلا هو',
    arabicText: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.',
    targetCount: 7,
    sourceReference: 'سنن أبي داود (5081)',
    virtueOrExplanation: 'من قالها حين يصبح وحين يمسي سبع مرات كفاه الله ما أهمه من أمر الدنيا والآخرة.',
  },
  {
    id: 'morning_subhanallah_wabihamdihi',
    category: 'morning',
    titleAr: 'سبحان الله وبحمده',
    arabicText: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ.',
    targetCount: 100,
    sourceReference: 'صحيح مسلم (2692)',
    virtueOrExplanation: 'من قالها حين يصبح وحين يمسي مائة مرة لم يأت أحد يوم القيامة بأفضل مما جاء به.',
  },
  {
    id: 'evening_amsayna',
    category: 'evening',
    titleAr: 'أمسينا وأمسى الملك لله',
    arabicText:
      'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ.',
    targetCount: 1,
    sourceReference: 'صحيح مسلم (2723)',
    virtueOrExplanation: 'ذكر المساء الجامع لسؤال خير الليلة والاستعاذة من شرها.',
  },
  {
    id: 'evening_allahumma_bika_amsayna',
    category: 'evening',
    titleAr: 'اللهم بك أمسينا وبك أصبحنا',
    arabicText: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ.',
    targetCount: 1,
    sourceReference: 'سنن الترمذي (3391)',
    virtueOrExplanation: 'تجديد التوكل والافتقار إلى الله عز وجل عند دخول المساء.',
  },
  {
    id: 'evening_audhu_bikalimat',
    category: 'evening',
    titleAr: 'أعوذ بكلمات الله التامات',
    arabicText: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.',
    targetCount: 3,
    sourceReference: 'صحيح مسلم (2708)',
    virtueOrExplanation: 'من قالها حين يمسي ثلاث مرات لم تضره حُمَة تلك الليلة.',
  },
  {
    id: 'evening_sayyid_istighfar',
    category: 'evening',
    titleAr: 'سيد الاستغفار (المساء)',
    arabicText:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.',
    targetCount: 1,
    sourceReference: 'صحيح البخاري (6306)',
    virtueOrExplanation: 'من قالها من الليل وهو موقن بها فمات قبل أن يصبح فهو من أهل الجنة.',
  },
  {
    id: 'after_prayer_istighfar',
    category: 'after_prayer',
    titleAr: 'الاستغفار والسلام بعد الصلاة',
    arabicText:
      'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ. اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ.',
    targetCount: 1,
    sourceReference: 'صحيح مسلم (591)',
    virtueOrExplanation: 'أول ما يقال دبر الصلوات المفروضة.',
  },
  {
    id: 'after_prayer_tasbih',
    category: 'after_prayer',
    titleAr: 'التسبيح والتحميد والتكبير',
    arabicText: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ.',
    targetCount: 33,
    sourceReference: 'صحيح مسلم (597)',
    virtueOrExplanation: 'غُفرت خطاياه وإن كانت مثل زبد البحر.',
  },
];

export const PRAYER_ARABIC_NAMES: Record<PrayerName, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

/**
 * Applies user-configured minute adjustments to raw prayer times (HH:mm).
 */
export function applyPrayerManualAdjustments(
  rawTimings: Record<PrayerName, string>,
  adjustments: Record<PrayerName, number>
): Record<PrayerName, string> {
  const result = {} as Record<PrayerName, string>;
  const names: PrayerName[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  for (const name of names) {
    const raw = (rawTimings[name] || '00:00').split(' ')[0]; // strip (EEST) if present
    const [hStr, mStr] = raw.split(':');
    const baseMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
    const delta = adjustments[name] ?? 0;
    const total = ((baseMinutes + delta) % 1440 + 1440) % 1440;
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    result[name] = `${hh}:${mm}`;
  }

  return result;
}

/**
 * Determines the next upcoming obligatory prayer and countdown minutes based on current HH:mm.
 */
export function getNextPrayerCountdown(
  timings: Record<PrayerName, string>,
  currentTimeHHMM: string
): {
  prayerName: PrayerName;
  prayerNameAr: string;
  prayerTime: string;
  minutesRemaining: number;
} {
  const obligatory: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const [curH, curM] = currentTimeHHMM.split(':').map((n) => parseInt(n, 10));
  const curMinutes = curH * 60 + curM;

  for (const p of obligatory) {
    const clean = (timings[p] || '00:00').split(' ')[0];
    const [pH, pM] = clean.split(':').map((n) => parseInt(n, 10));
    const pMinutes = pH * 60 + pM;
    if (pMinutes > curMinutes) {
      return {
        prayerName: p,
        prayerNameAr: PRAYER_ARABIC_NAMES[p],
        prayerTime: clean,
        minutesRemaining: pMinutes - curMinutes,
      };
    }
  }

  // Wrap around to tomorrow's Fajr
  const fajrClean = (timings.Fajr || '05:00').split(' ')[0];
  const [fH, fM] = fajrClean.split(':').map((n) => parseInt(n, 10));
  const fMinutes = fH * 60 + fM;
  return {
    prayerName: 'Fajr',
    prayerNameAr: PRAYER_ARABIC_NAMES.Fajr,
    prayerTime: fajrClean,
    minutesRemaining: 1440 - curMinutes + fMinutes,
  };
}

/**
 * Detects whether a user calendar event conflicts with reserved prayer blocks.
 * Never overwrites user events; returns conflict info so user can resolve or adjust.
 */
export function detectPrayerScheduleConflicts(params: {
  timings: Record<PrayerName, string>;
  settings: PrayerSettings;
  events: { id: string; title: string; startTime: string; endTime: string; isAllDay?: boolean }[];
}): {
  eventId: string;
  eventTitle: string;
  prayerName: PrayerName;
  prayerNameAr: string;
  prayerTime: string;
}[] {
  const { timings, settings, events } = params;
  const conflicts: {
    eventId: string;
    eventTitle: string;
    prayerName: PrayerName;
    prayerNameAr: string;
    prayerTime: string;
  }[] = [];

  if (!settings.showInPlanner) return conflicts;

  const obligatory: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const toMin = (hhmm: string) => {
    const clean = hhmm.split(' ')[0];
    const [h, m] = clean.split(':').map((n) => parseInt(n, 10));
    return h * 60 + m;
  };

  for (const ev of events) {
    if (ev.isAllDay) continue;
    const evStart = toMin(ev.startTime);
    const evEnd = toMin(ev.endTime);

    for (const p of obligatory) {
      const pMin = toMin(timings[p]);
      const pBlockEnd = pMin + settings.reserveMinutesAround;
      if (evStart < pBlockEnd && evEnd > pMin) {
        conflicts.push({
          eventId: ev.id,
          eventTitle: ev.title,
          prayerName: p,
          prayerNameAr: PRAYER_ARABIC_NAMES[p],
          prayerTime: timings[p].split(' ')[0],
        });
      }
    }
  }

  return conflicts;
}

/**
 * Calculates Qibla bearing in degrees from North (0-360) for any (latitude, longitude)
 * relative to the Kaaba in Makkah (21.422487 N, 39.826206 E).
 */
export function calculateQiblaBearing(latDeg: number, lonDeg: number): number {
  const kaabaLat = (21.422487 * Math.PI) / 180;
  const kaabaLon = (39.826206 * Math.PI) / 180;
  const phi = (latDeg * Math.PI) / 180;
  const lambda = (lonDeg * Math.PI) / 180;

  const y = Math.sin(kaabaLon - lambda);
  const x = Math.cos(phi) * Math.tan(kaabaLat) - Math.sin(phi) * Math.cos(kaabaLon - lambda);
  const bearingRad = Math.atan2(y, x);
  const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;
  return Math.round(bearingDeg * 10) / 10;
}
