'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Compass,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Moon,
  Newspaper,
  Palette,
  Pin,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  applyPrayerManualAdjustments,
  calculateQiblaBearing,
  PRAYER_ARABIC_NAMES,
  SURAH_INDEX,
  VERIFIED_ADHKAR_DATASET,
  VERIFIED_OFFLINE_SURAHS,
} from '@/domain/deen/verified-data';
import { NewsArticleItem, NewsCategory, PrayerName, ThemeId } from '@/domain/types';

export function LifeHubStudio() {
  const {
    state,
    prayerSchedule,
    refreshPrayerSchedule,
    setTheme,
    updateProfile,
    updateNotificationSettings,
    updatePrayerSettings,
    togglePrayerCompleted,
    incrementDhikr,
    resetDhikrCategory,
    saveQuranBookmark,
    deleteQuranBookmark,
    updateQuranGoalProgress,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoalMilestone,
    saveNote,
    toggleNotePin,
    toggleNoteFavorite,
    deleteNote,
    toggleSaveArticle,
    recordArticleRead,
    resetToFactoryDemo,
  } = useLifeOS();

  const [hubSection, setHubSection] = useState<
    'deen' | 'quran' | 'adhkar' | 'news' | 'goals' | 'notes' | 'settings'
  >('deen');

  // Quran Reader state
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [surahData, setSurahData] = useState<{
    number: number;
    nameAr: string;
    ayahs: { numberInSurah: number; text: string; page: number; juz: number }[];
    source: string;
  }>(() => ({
    ...VERIFIED_OFFLINE_SURAHS[1],
    source: 'verified_uthmani_cache',
  }));
  const [quranLoading, setQuranLoading] = useState(false);
  const [quranFontSize, setQuranFontSize] = useState<'text-xl' | 'text-2xl' | 'text-3xl'>(
    'text-2xl'
  );
  const [distractionFreeQuran, setDistractionFreeQuran] = useState(false);

  // Adhkar filter state
  const [adhkarCategory, setAdhkarCategory] = useState<'morning' | 'evening' | 'after_prayer'>(
    'morning'
  );

  // News Hub state
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('top');
  const [newsCountry, setNewsCountry] = useState('eg');
  const [newsLang, setNewsLang] = useState('ar');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsViewMode, setNewsViewMode] = useState<'feed' | 'saved' | 'history'>('feed');
  const [newsArticles, setNewsArticles] = useState<NewsArticleItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSourceMode, setNewsSourceMode] = useState('cached_verified_snapshot');
  const [newsRetrievedAt, setNewsRetrievedAt] = useState('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Goal creation & edit state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState('2027-06-30');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');

  // Note creation & search state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('أفكار');
  const [noteSearch, setNoteSearch] = useState('');

  const todayISO = new Date().toISOString().slice(0, 10);

  // Fetch Surah from /api/quran
  useEffect(() => {
    let cancelled = false;
    async function loadSurah() {
      setQuranLoading(true);
      try {
        const res = await fetch(`/api/quran?surah=${selectedSurah}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && Array.isArray(json?.ayahs)) {
            setSurahData(json);
          }
        }
      } catch {
        // Fallback already loaded
      } finally {
        if (!cancelled) setQuranLoading(false);
      }
    }
    loadSurah();
    return () => {
      cancelled = true;
    };
  }, [selectedSurah]);

  // Fetch News from /api/news
  const loadNewsFeed = async (
    cat: NewsCategory,
    country = newsCountry,
    lang = newsLang,
    q = newsSearch
  ) => {
    setNewsLoading(true);
    try {
      const res = await fetch(
        `/api/news?category=${cat}&country=${encodeURIComponent(
          country
        )}&lang=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const json = await res.json();
        setNewsArticles(json.articles || []);
        setNewsSourceMode(json.sourceMode || 'cached_verified_snapshot');
        setNewsRetrievedAt(json.retrievedAt || new Date().toISOString());
      }
    } catch {
      // Retain existing articles
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    loadNewsFeed(newsCategory, newsCountry, newsLang, newsSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsCategory, newsCountry, newsLang]);

  const adjustedTimings = useMemo(() => {
    const raw = prayerSchedule?.timings || {
      Fajr: '04:48',
      Sunrise: '06:16',
      Dhuhr: '11:39',
      Asr: '14:42',
      Maghrib: '17:02',
      Isha: '18:22',
    };
    return applyPrayerManualAdjustments(raw, state.prayerSettings.manualAdjustments);
  }, [prayerSchedule, state.prayerSettings.manualAdjustments]);

  const qiblaBearing = useMemo(
    () =>
      calculateQiblaBearing(
        state.prayerSettings.latitude,
        state.prayerSettings.longitude
      ),
    [state.prayerSettings.latitude, state.prayerSettings.longitude]
  );

  const exportFullJSONBackup = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `lifeos-backup-${todayISO}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    return [...state.notes]
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [state.notes, noteSearch]);

  const displayedNews = useMemo(() => {
    if (newsViewMode === 'saved') return state.savedArticles;
    if (newsViewMode === 'history') {
      return newsArticles.filter((a) => state.readArticleUrls.includes(a.url));
    }
    return newsArticles;
  }, [newsViewMode, state.savedArticles, state.readArticleUrls, newsArticles]);

  return (
    <div className="space-y-5 pb-28">
      {/* Top Hub Navigation */}
      <div className="lifeos-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              حياتي — ركن الدين، الأخبار، الأهداف، المعرفة، والإعدادات
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              منظومة متكاملة تجمع الروحانيات الموثقة، المتابعة الإخبارية، التخطيط بعيد المدى،
              وتخصيص الهوية البصرية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'deen', label: 'مواقيت الصلاة والقبلة', icon: Compass },
              { id: 'quran', label: 'المصحف العثماني والورد', icon: BookOpen },
              { id: 'adhkar', label: 'أذكار الصباح والمساء الموثقة', icon: Sparkles },
              { id: 'news', label: 'الأخبار اليومية الموثقة', icon: Newspaper },
              { id: 'goals', label: 'الأهداف الكبرى', icon: Target },
              { id: 'notes', label: 'الملاحظات واليوميات', icon: FileText },
              { id: 'settings', label: 'الإعدادات والثيمات', icon: Settings },
            ] as const
          ).map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setHubSection(sec.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all min-h-[44px] ${
                  hubSection === sec.id
                    ? 'bg-primary-violet text-white shadow-md'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. DEEN HUB: PRAYER TIMES, HIJRI CALENDAR & QIBLA */}
      {hubSection === 'deen' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 lifeos-card-deen p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-religious-gold">
                  التاريخ الهجري: {prayerSchedule?.dateHijri || '29 جمادى الأولى 1448'} (تعديل:{' '}
                  {state.prayerSettings.hijriAdjustment >= 0
                    ? `+${state.prayerSettings.hijriAdjustment}`
                    : state.prayerSettings.hijriAdjustment}{' '}
                  يوم)
                </span>
                <h2 className="text-lg font-bold text-text-primary mt-0.5">
                  مواقيت الصلاة المعتمدة ({state.prayerSettings.city}،{' '}
                  {state.prayerSettings.country})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-bg-primary/70 border border-religious-gold/30 text-religious-gold">
                  {prayerSchedule?.source === 'aladhan_live'
                    ? 'متصل مباشرة بـ AlAdhan API ✓'
                    : 'جدول موثق محفوظ مع طابع الحداثة'}
                </span>
                <button
                  type="button"
                  onClick={refreshPrayerSchedule}
                  className="p-2 rounded-full bg-bg-primary text-religious-gold border border-religious-gold/30"
                  title="تحديث المواقيت"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as PrayerName[]).map(
                (p) => {
                  const isDone =
                    state.prayerTracking[todayISO] && state.prayerTracking[todayISO][p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePrayerCompleted(todayISO, p)}
                      className={`p-4 rounded-2xl border text-right transition-all ${
                        isDone
                          ? 'bg-emerald-success/15 border-emerald-success/50'
                          : 'bg-bg-primary/70 border-religious-gold/25 hover:border-religious-gold'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-religious-gold">
                          {PRAYER_ARABIC_NAMES[p]}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {isDone ? 'أُديت ✓' : 'تحديد'}
                        </span>
                      </div>
                      <div className="text-xl font-bold text-text-primary tabular-nums mt-1">
                        {adjustedTimings[p]}
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            {/* City, Calculation Method, Asr School & Hijri Adjustment Controls */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">المدينة</label>
                <select
                  value={state.prayerSettings.city}
                  onChange={(e) => {
                    const city = e.target.value;
                    const coords: Record<string, { country: string; lat: number; lon: number }> = {
                      Cairo: { country: 'Egypt', lat: 30.0444, lon: 31.2357 },
                      Makkah: { country: 'Saudi Arabia', lat: 21.4225, lon: 39.8262 },
                      Riyadh: { country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753 },
                      Alexandria: { country: 'Egypt', lat: 31.2001, lon: 29.9187 },
                    };
                    const picked = coords[city] || coords.Cairo;
                    updatePrayerSettings({
                      city,
                      country: picked.country,
                      latitude: picked.lat,
                      longitude: picked.lon,
                    });
                  }}
                  className="lifeos-input w-full text-xs"
                >
                  <option value="Cairo">القاهرة — مصر</option>
                  <option value="Alexandria">الإسكندرية — مصر</option>
                  <option value="Makkah">مكة المكرمة — السعودية</option>
                  <option value="Riyadh">الرياض — السعودية</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">طريقة الحساب</label>
                <select
                  value={state.prayerSettings.calculationMethod}
                  onChange={(e) =>
                    updatePrayerSettings({
                      calculationMethod: parseInt(e.target.value, 10),
                    })
                  }
                  className="lifeos-input w-full text-xs"
                >
                  <option value={5}>الهيئة المصرية العامة للمساحة (5)</option>
                  <option value={4}>جامعة أم القرى — مكة المكرمة (4)</option>
                  <option value={3}>رابطة العالم الإسلامي (3)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">مذهب حساب العصر</label>
                <select
                  value={state.prayerSettings.asrSchool}
                  onChange={(e) =>
                    updatePrayerSettings({
                      asrSchool: parseInt(e.target.value, 10) as 0 | 1,
                    })
                  }
                  className="lifeos-input w-full text-xs"
                >
                  <option value={0}>الجمهور (شافعي / مالكي / حنبلي)</option>
                  <option value={1}>المذهب الحنفي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  تعديل التاريخ الهجري
                </label>
                <select
                  value={state.prayerSettings.hijriAdjustment}
                  onChange={(e) =>
                    updatePrayerSettings({
                      hijriAdjustment: parseInt(e.target.value, 10),
                    })
                  }
                  className="lifeos-input w-full text-xs tabular-nums"
                >
                  <option value={-2}>-2 يوم</option>
                  <option value={-1}>-1 يوم</option>
                  <option value={0}>مطابق (0)</option>
                  <option value={1}>+1 يوم</option>
                  <option value={2}>+2 يوم</option>
                </select>
              </div>
            </div>
          </div>

          {/* Qibla Direction & Daily Wird Card */}
          <div className="lg:col-span-4 space-y-5">
            <div className="lifeos-card-deen p-5 space-y-3 text-center">
              <Compass className="w-8 h-8 text-religious-gold mx-auto" />
              <h3 className="text-base font-bold text-text-primary">اتجاه القبلة المحسوب فلكياً</h3>
              <div className="text-3xl font-bold text-religious-gold tabular-nums">
                {qiblaBearing}°
              </div>
              <p className="text-xs text-text-secondary">
                من الشمال الجغرافي لموقعك المختار ({state.prayerSettings.city}). في حال عدم توفر
                حساس البوصلة المغناطيسية بالجهاز، اعتمد الزاوية الفلكية أعلاه.
              </p>
            </div>

            <div className="lifeos-card p-5 space-y-3">
              <h3 className="text-base font-bold text-text-primary">متابعة الورد القرآني اليومي</h3>
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>وحدة الورد:</span>
                <select
                  value={state.quranGoal.unitType}
                  onChange={(e) =>
                    updateQuranGoalProgress(
                      0,
                      state.quranGoal.dailyTarget,
                      e.target.value as 'pages' | 'verses' | 'juz' | 'surah'
                    )
                  }
                  className="bg-bg-secondary border border-white/10 rounded-lg px-2 py-1 text-xs"
                >
                  <option value="pages">صفحات</option>
                  <option value="verses">آيات</option>
                  <option value="juz">أجزاء</option>
                  <option value="surah">سور</option>
                </select>
              </div>
              <div className="text-sm text-text-secondary tabular-nums">
                أنجزت اليوم:{' '}
                <strong className="text-emerald-success">{state.quranGoal.completedToday}</strong> من{' '}
                <strong>{state.quranGoal.dailyTarget}</strong> ({state.quranGoal.unitType})
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuranGoalProgress(1)}
                  className="flex-1 py-2.5 rounded-full bg-religious-gold text-bg-primary text-xs font-bold"
                >
                  + تسجيل إنجاز ورد
                </button>
                <button
                  type="button"
                  onClick={() => setHubSection('quran')}
                  className="px-4 py-2.5 rounded-full bg-bg-secondary border border-white/10 text-xs text-text-primary"
                >
                  فتح المصحف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. QURAN READER (VERIFIED UTHMANI TEXT, NO GENERATIVE AI) */}
      {hubSection === 'quran' && (
        <div className="space-y-4">
          <div className="lifeos-card-deen p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedSurah}
                  onChange={(e) => setSelectedSurah(parseInt(e.target.value, 10))}
                  aria-label="اختيار السورة"
                  className="lifeos-input text-sm font-bold"
                >
                  {SURAH_INDEX.map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number}. سورة {s.nameAr} ({s.ayahCount} آية • جزء {s.juz} • ص {s.startPage})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-religious-gold">
                  {quranLoading ? 'جاري التحميل...' : 'الرسم العثماني الموثق (AlQuran Cloud)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuranFontSize((prev) =>
                      prev === 'text-xl'
                        ? 'text-2xl'
                        : prev === 'text-2xl'
                        ? 'text-3xl'
                        : 'text-xl'
                    )
                  }
                  className="px-3 py-1.5 rounded-full bg-bg-primary border border-religious-gold/30 text-xs text-text-primary"
                >
                  حجم الخط
                </button>
                <button
                  type="button"
                  onClick={() => setDistractionFreeQuran((d) => !d)}
                  className="px-3 py-1.5 rounded-full bg-religious-gold/20 border border-religious-gold text-xs text-religious-gold font-semibold"
                >
                  {distractionFreeQuran ? 'إنهاء وضع القراءة الخاشعة' : 'وضع القراءة الخاشعة'}
                </button>
              </div>
            </div>

            {/* Verified Quranic Text Flow */}
            <div
              className={`p-6 rounded-3xl bg-bg-primary/90 border border-religious-gold/30 ${quranFontSize} quran-uthmani-text text-text-primary text-justify leading-loose`}
            >
              <div className="text-center text-religious-gold font-bold mb-4 text-xl">
                {surahData.nameAr}
              </div>
              {surahData.ayahs.map((ayah) => (
                <span key={ayah.numberInSurah} className="inline">
                  {ayah.text}{' '}
                  <button
                    type="button"
                    onClick={() =>
                      saveQuranBookmark({
                        surahNumber: surahData.number,
                        surahNameAr: surahData.nameAr,
                        ayahNumber: ayah.numberInSurah,
                        pageNumber: ayah.page,
                        juzNumber: ayah.juz,
                        note: `علامة مرجعية عند الآية ${ayah.numberInSurah}`,
                        isLastRead: true,
                      })
                    }
                    title="حفظ كعلامة مرجعية وموضع آخر قراءة"
                    className="inline-flex items-center justify-center px-2 py-0.5 mx-1 rounded-full bg-religious-gold/15 border border-religious-gold/40 text-xs text-religious-gold tabular-nums hover:bg-religious-gold hover:text-bg-primary transition-all"
                  >
                    ﴿{ayah.numberInSurah}﴾
                  </button>{' '}
                </span>
              ))}
            </div>

            {!distractionFreeQuran && (
              <div className="pt-3 border-t border-white/10">
                <h3 className="text-xs font-bold text-religious-gold mb-2 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" />
                  العلامات المرجعية وموضع آخر قراءة ({state.quranBookmarks.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {state.quranBookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="p-3 rounded-xl bg-bg-primary/70 border border-white/10 flex items-center justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSurah(bm.surahNumber)}
                        className="text-right flex-1"
                      >
                        <div className="text-xs font-bold text-text-primary">
                          سورة {bm.surahNameAr} • الآية {bm.ayahNumber} (صفحة {bm.pageNumber})
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">{bm.note}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuranBookmark(bm.id)}
                        aria-label="حذف العلامة المرجعية"
                        className="p-1.5 text-text-muted hover:text-danger-coral"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. VERIFIED MORNING & EVENING ADHKAR */}
      {hubSection === 'adhkar' && (
        <div className="lifeos-card-deen p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(
                [
                  { id: 'morning', label: 'أذكار الصباح', icon: Sun },
                  { id: 'evening', label: 'أذكار المساء', icon: Moon },
                  { id: 'after_prayer', label: 'أذكار بعد الصلاة', icon: Sparkles },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAdhkarCategory(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold ${
                      adhkarCategory === tab.id
                        ? 'bg-religious-gold text-bg-primary'
                        : 'bg-bg-primary text-text-secondary border border-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => resetDhikrCategory(adhkarCategory)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-primary border border-white/10 text-xs text-text-secondary hover:text-text-primary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير عداد الفئة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VERIFIED_ADHKAR_DATASET.filter((d) => d.category === adhkarCategory).map(
              (dhikr) => {
                const count =
                  (state.adhkarProgress[todayISO] &&
                    state.adhkarProgress[todayISO][dhikr.id]) ||
                  0;
                const isDone = count >= dhikr.targetCount;

                return (
                  <div
                    key={dhikr.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                      isDone
                        ? 'bg-emerald-success/10 border-emerald-success/45'
                        : 'bg-bg-primary/80 border-religious-gold/25'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-religious-gold">{dhikr.titleAr}</span>
                        <span className="text-[11px] text-text-muted">
                          {dhikr.sourceReference}
                        </span>
                      </div>
                      <p className="quran-uthmani-text text-lg text-text-primary leading-relaxed">
                        {dhikr.arabicText}
                      </p>
                      <p className="text-xs text-text-secondary">{dhikr.virtueOrExplanation}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="text-xs font-bold tabular-nums text-text-primary">
                        العدد: {count} / {dhikr.targetCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => incrementDhikr(dhikr.id, dhikr.targetCount)}
                        className={`px-5 py-2.5 rounded-full text-xs font-bold min-h-[42px] transition-all ${
                          isDone
                            ? 'bg-emerald-success text-bg-primary'
                            : 'bg-religious-gold text-bg-primary hover:opacity-90'
                        }`}
                      >
                        {isDone ? 'اكتمل الذكر ✓' : 'تسبيح (+1)'}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* 4. NEWS HUB (ALL 10 CATEGORIES, COUNTRY/LANGUAGE, SEARCH, SAVED, HISTORY, SHARE) */}
      {hubSection === 'news' && (
        <div className="lifeos-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs text-primary-violet-light">
                <Globe className="w-4 h-4" />
                <span>
                  {newsSourceMode === 'gnews_live'
                    ? 'متصل مباشرة بـ GNews API'
                    : 'موجز إخباري موثق (يدعم مفتاح GNEWS_API_KEY في الخادم)'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-text-primary mt-0.5">
                غرفة الأخبار اليومية الموثقة
              </h2>
            </div>

            {/* Country, Language, Search & Saved/History toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newsCountry}
                onChange={(e) => setNewsCountry(e.target.value)}
                aria-label="دولة الأخبار"
                className="lifeos-input text-xs py-1.5"
              >
                <option value="eg">مصر (EG)</option>
                <option value="sa">السعودية (SA)</option>
                <option value="ae">الإمارات (AE)</option>
                <option value="us">عالمي (US)</option>
              </select>

              <select
                value={newsLang}
                onChange={(e) => setNewsLang(e.target.value)}
                aria-label="لغة الأخبار"
                className="lifeos-input text-xs py-1.5"
              >
                <option value="ar">العربية (AR)</option>
                <option value="en">English (EN)</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute right-3 top-3" />
                <input
                  type="search"
                  value={newsSearch}
                  onChange={(e) => setNewsSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadNewsFeed(newsCategory, newsCountry, newsLang, newsSearch);
                    }
                  }}
                  placeholder="بحث في الأخبار..."
                  className="lifeos-input pr-8 text-xs py-1.5 w-44"
                />
              </div>

              <button
                type="button"
                onClick={() => loadNewsFeed(newsCategory, newsCountry, newsLang, newsSearch)}
                className="p-2.5 rounded-full bg-bg-secondary border border-white/10 text-cyan-accent"
                title="تحديث الأخبار"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* All 10 Approved News Categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'top', label: 'أهم العناوين' },
                { id: 'local', label: 'أخبار محلية' },
                { id: 'world', label: 'العالم' },
                { id: 'business', label: 'أعمال' },
                { id: 'economy', label: 'اقتصاد' },
                { id: 'technology', label: 'تكنولوجيا' },
                { id: 'sports', label: 'رياضة' },
                { id: 'science', label: 'علوم' },
                { id: 'health', label: 'صحة' },
                { id: 'entertainment', label: 'ثقافة وترفيه' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setNewsViewMode('feed');
                  setNewsCategory(cat.id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  newsViewMode === 'feed' && newsCategory === cat.id
                    ? 'bg-primary-violet text-white'
                    : 'bg-bg-secondary text-text-secondary border border-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setNewsViewMode('saved')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                newsViewMode === 'saved'
                  ? 'bg-religious-gold text-bg-primary'
                  : 'bg-bg-secondary text-religious-gold border border-religious-gold/30'
              }`}
            >
              المحفوظات ({state.savedArticles.length})
            </button>
            <button
              type="button"
              onClick={() => setNewsViewMode('history')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                newsViewMode === 'history'
                  ? 'bg-cyan-accent text-bg-primary'
                  : 'bg-bg-secondary text-cyan-accent border border-cyan-accent/30'
              }`}
            >
              سجل القراءة ({state.readArticleUrls.length})
            </button>
          </div>

          {shareFeedback && (
            <div className="text-xs text-emerald-success font-semibold">{shareFeedback}</div>
          )}

          {newsLoading ? (
            <div className="p-8 text-center text-sm text-text-muted">جاري تحديث الأخبار...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedNews.map((art) => {
                const isSaved = state.savedArticles.some((s) => s.url === art.url);
                return (
                  <article
                    key={art.id}
                    className="p-4 rounded-2xl bg-bg-secondary/90 border border-white/10 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-cyan-accent">
                        <span className="font-bold">{art.sourceName}</span>
                        <span className="tabular-nums text-text-muted">
                          نُشر: {art.publishedAt.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-text-primary leading-snug">
                        {art.title}
                      </h3>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {art.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                      <span className="text-text-muted tabular-nums">
                        استُرجع: {(art.retrievedAt || newsRetrievedAt).slice(11, 16)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(art.url).catch(() => {});
                            }
                            setShareFeedback(`تم نسخ رابط الخبر: ${art.title.slice(0, 35)}...`);
                            setTimeout(() => setShareFeedback(null), 3000);
                          }}
                          className="p-1.5 rounded-lg border border-white/10 text-text-secondary hover:text-text-primary"
                          title="مشاركة الخبر"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSaveArticle(art)}
                          className={`px-2.5 py-1 rounded-lg border ${
                            isSaved
                              ? 'bg-primary-violet/20 border-primary-violet text-primary-violet-light'
                              : 'border-white/10 text-text-secondary'
                          }`}
                        >
                          {isSaved ? 'محفوظ ★' : 'حفظ المقال'}
                        </button>
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => recordArticleRead(art.url)}
                          className="inline-flex items-center gap-1 text-primary-violet-light hover:underline"
                        >
                          <span>المصدر الأصلي</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. GOALS & MILESTONES */}
      {hubSection === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            {state.goals.map((g) => {
              const done = g.milestones.filter((m) => m.isCompleted).length;
              const pct =
                g.milestones.length > 0 ? Math.round((done / g.milestones.length) * 100) : 0;
              return (
                <div key={g.id} className="lifeos-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {editingGoalId === g.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editGoalTitle}
                            onChange={(e) => setEditGoalTitle(e.target.value)}
                            className="lifeos-input text-xs py-1 px-2 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editGoalTitle.trim()) {
                                updateGoal(g.id, { title: editGoalTitle.trim() });
                              }
                              setEditingGoalId(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-success text-bg-primary text-xs font-bold"
                          >
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-base font-bold text-text-primary">{g.title}</h3>
                      )}
                      <p className="text-xs text-text-secondary mt-0.5">{g.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-3 py-1 rounded-full bg-emerald-success/20 text-emerald-success text-xs font-bold tabular-nums">
                        {pct}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGoalId(g.id);
                          setEditGoalTitle(g.title);
                        }}
                        aria-label={`تعديل الهدف ${g.title}`}
                        className="p-1.5 text-text-muted hover:text-cyan-accent"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGoal(g.id)}
                        aria-label={`حذف الهدف ${g.title}`}
                        className="p-1.5 text-text-muted hover:text-danger-coral"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {g.milestones.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleGoalMilestone(g.id, m.id)}
                        className="w-full p-2.5 rounded-xl bg-bg-secondary border border-white/10 flex items-center justify-between text-xs text-right"
                      >
                        <span className={m.isCompleted ? 'line-through text-text-muted' : ''}>
                          {m.title}
                        </span>
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            m.isCompleted ? 'text-emerald-success' : 'text-text-muted'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-4 lifeos-card p-5 space-y-3">
            <h3 className="text-base font-bold text-text-primary">إضافة هدف استراتيجي جديد</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!goalTitle.trim()) return;
                addGoal({
                  title: goalTitle.trim(),
                  description: 'هدف شخصي ضمن منظومة الإنجاز',
                  category: 'personal',
                  targetDate: goalDate,
                  milestones: [
                    { id: `gm_${Date.now()}`, title: 'المرحلة الأولى للتنفيذ', isCompleted: false },
                  ],
                  linkedTaskIds: [],
                  linkedHabitIds: [],
                  notes: '',
                });
                setGoalTitle('');
              }}
              className="space-y-3"
            >
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="عنوان الهدف"
                className="lifeos-input w-full text-sm"
                required
              />
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="lifeos-input w-full text-sm tabular-nums"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-primary-violet text-white text-xs font-bold min-h-[44px]"
              >
                + حفظ الهدف
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. NOTES & PERSONAL KNOWLEDGE */}
      {hubSection === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-3">
            <div className="lifeos-card p-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-text-muted mr-2" />
              <input
                type="search"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="ابحث في الملاحظات واليوميات..."
                className="bg-transparent text-xs text-text-primary w-full focus:outline-none"
              />
            </div>

            {filteredNotes.map((n) => (
              <div key={n.id} className="lifeos-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary">{n.title}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-highlight text-cyan-accent">
                      {n.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleNotePin(n.id)}
                      aria-label="تثبيت الملاحظة"
                      className={`p-1.5 rounded-lg ${
                        n.isPinned ? 'text-primary-violet-light' : 'text-text-muted'
                      }`}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleNoteFavorite(n.id)}
                      aria-label="تفضيل الملاحظة"
                      className={`p-1.5 rounded-lg ${
                        n.isFavorite ? 'text-religious-gold' : 'text-text-muted'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(n.id)}
                      aria-label="حذف الملاحظة"
                      className="p-1.5 text-text-muted hover:text-danger-coral"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                  {n.content}
                </p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 lifeos-card p-5 space-y-3">
            <h3 className="text-base font-bold text-text-primary">تدوين ملاحظة أو يومية جديدة</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteTitle.trim()) return;
                saveNote({
                  title: noteTitle.trim(),
                  content: noteContent.trim(),
                  category: noteCategory,
                  tags: ['LifeOS'],
                  checklist: [],
                  isPinned: false,
                  isFavorite: false,
                  isJournal: noteCategory === 'يوميات',
                  isArchived: false,
                });
                setNoteTitle('');
                setNoteContent('');
              }}
              className="space-y-3"
            >
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="عنوان الملاحظة"
                className="lifeos-input w-full text-sm"
                required
              />
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
                className="lifeos-input w-full text-xs"
              >
                <option value="أفكار">أفكار ومعرفة</option>
                <option value="يوميات">يوميات وتأملات</option>
                <option value="هندسة البرمجيات">ملاحظات تقنية</option>
              </select>
              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب ملاحظاتك بدون أي مشتتات..."
                className="lifeos-input w-full text-sm"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-primary-violet text-white text-xs font-bold min-h-[44px]"
              >
                حفظ الملاحظة تلقائياً
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. SETTINGS, MULTI-THEME ENGINE, NOTIFICATIONS & DATA EXPORT */}
      {hubSection === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            <div className="lifeos-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary-violet-light" />
                <h2 className="text-base font-bold text-text-primary">
                  محرك الثيمات والهوية البصرية (Midnight Aurora + 3 ثيمات إضافية)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    {
                      id: 'midnight-aurora',
                      name: 'Midnight Aurora (الافتراضي المعتمد)',
                      desc: 'كحلي ليلي عميق مع إضاءة بنفسجية وسماوية فاخرة',
                      preview: '#080D19',
                    },
                    {
                      id: 'pearl-studio',
                      name: 'Pearl Studio (الوضع النهاري اللؤلؤي)',
                      desc: 'أسطح ناصعة عالية التباين للقراءة النهارية',
                      preview: '#F3F6FC',
                    },
                    {
                      id: 'emerald-noir',
                      name: 'Emerald Noir (الزمرد الليلي)',
                      desc: 'تدرجات زمردية هادئة مع لمسات ذهبية',
                      preview: '#05100D',
                    },
                    {
                      id: 'solar-pulse',
                      name: 'Solar Pulse (النبض الدافئ)',
                      desc: 'تباين كهرماني دافئ مريح للعين ليلاً',
                      preview: '#120C08',
                    },
                  ] as { id: ThemeId; name: string; desc: string; preview: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`p-4 rounded-2xl border text-right transition-all ${
                      state.preferences.theme === t.id
                        ? 'border-primary-violet bg-primary-violet/15'
                        : 'border-white/10 bg-bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text-primary">{t.name}</span>
                      <span
                        className="w-5 h-5 rounded-full border border-white/20"
                        style={{ backgroundColor: t.preview }}
                      />
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification & Quiet Hours Settings */}
            <div className="lifeos-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-accent" />
                <h3 className="text-base font-bold text-text-primary">
                  إعدادات التنبيهات الذكية وساعات الهدوء
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="p-3 rounded-xl bg-bg-secondary border border-white/10 flex items-center justify-between cursor-pointer">
                  <span>تنبيهات مواقيت الصلاة والأذكار</span>
                  <input
                    type="checkbox"
                    checked={state.notificationSettings.prayersEnabled}
                    onChange={(e) =>
                      updateNotificationSettings({ prayersEnabled: e.target.checked })
                    }
                  />
                </label>
                <label className="p-3 rounded-xl bg-bg-secondary border border-white/10 flex items-center justify-between cursor-pointer">
                  <span>تذكير مراجعة إغلاق الشهر المالي</span>
                  <input
                    type="checkbox"
                    checked={state.notificationSettings.monthlyClosingEnabled}
                    onChange={(e) =>
                      updateNotificationSettings({
                        monthlyClosingEnabled: e.target.checked,
                      })
                    }
                  />
                </label>
                <div className="p-3 rounded-xl bg-bg-secondary border border-white/10 flex items-center justify-between">
                  <span>بداية ساعات الهدوء</span>
                  <input
                    type="time"
                    value={state.notificationSettings.quietHoursStart}
                    onChange={(e) =>
                      updateNotificationSettings({ quietHoursStart: e.target.value })
                    }
                    className="bg-surface-primary border border-white/10 rounded px-2 py-1 tabular-nums"
                  />
                </div>
                <div className="p-3 rounded-xl bg-bg-secondary border border-white/10 flex items-center justify-between">
                  <span>نهاية ساعات الهدوء</span>
                  <input
                    type="time"
                    value={state.notificationSettings.quietHoursEnd}
                    onChange={(e) =>
                      updateNotificationSettings({ quietHoursEnd: e.target.value })
                    }
                    className="bg-surface-primary border border-white/10 rounded px-2 py-1 tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 lifeos-card p-5 space-y-4">
            <h3 className="text-base font-bold text-text-primary">
              الملف الشخصي، اللغة، العملة، والنسخ الاحتياطي
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">الاسم المعروض</label>
                <input
                  type="text"
                  value={state.profile.displayName}
                  onChange={(e) => updateProfile({ displayName: e.target.value })}
                  className="lifeos-input w-full text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">اللغة والاتجاه</label>
                  <select
                    value={state.profile.locale}
                    onChange={(e) =>
                      updateProfile({ locale: e.target.value as 'ar' | 'en' })
                    }
                    className="lifeos-input w-full text-xs"
                  >
                    <option value="ar">العربية (RTL)</option>
                    <option value="en">English (LTR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">العملة الأساسية</label>
                  <select
                    value={state.profile.currency}
                    onChange={(e) => updateProfile({ currency: e.target.value })}
                    className="lifeos-input w-full text-xs"
                  >
                    <option value="EGP">جنيه مصري (EGP)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={exportFullJSONBackup}
                  className="w-full py-2.5 rounded-full bg-surface-highlight hover:bg-primary-violet text-xs font-semibold text-text-primary min-h-[44px]"
                >
                  تصدير نسخة احتياطية كاملة (JSON)
                </button>
                <button
                  type="button"
                  onClick={resetToFactoryDemo}
                  className="w-full py-2.5 rounded-full bg-danger-coral/15 border border-danger-coral/40 text-xs font-semibold text-danger-coral min-h-[44px]"
                >
                  إعادة ضبط البيانات الافتراضية / مسح الحساب المحلي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
