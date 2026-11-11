'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  EyeOff,
  Flame,
  HeartPulse,
  Moon,
  Newspaper,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import { computeAdaptiveHomeContext } from '@/domain/intelligence/adaptive';
import { formatMinorUnits } from '@/domain/finance/engine';
import {
  applyPrayerManualAdjustments,
  getNextPrayerCountdown,
  VERIFIED_ADHKAR_DATASET,
} from '@/domain/deen/verified-data';

interface HomeCommandCenterProps {
  onOpenQuickCapture: (preset?: string) => void;
  onOpenMonthlyClosing: () => void;
}

export function HomeCommandCenter({
  onOpenQuickCapture,
  onOpenMonthlyClosing,
}: HomeCommandCenterProps) {
  const {
    state,
    setActiveTab,
    prayerSchedule,
    currentPeriodSummary,
    prevPeriodKey,
    isPrevMonthClosed,
    toggleTask,
    toggleHabitDate,
    incrementDhikr,
    updateQuranGoalProgress,
    updatePreferences,
  } = useLifeOS();

  const [overridePhase, setOverridePhase] = useState<'auto' | 'morning' | 'afternoon' | 'evening'>(
    'auto'
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const effectiveHour =
    overridePhase === 'morning'
      ? 8
      : overridePhase === 'afternoon'
      ? 14
      : overridePhase === 'evening'
      ? 20
      : now.getHours();

  const adaptive = useMemo(
    () => computeAdaptiveHomeContext(effectiveHour, state.profile.displayName),
    [effectiveHour, state.profile.displayName]
  );

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

  const nextPrayer = useMemo(
    () => getNextPrayerCountdown(adjustedTimings, currentHHMM),
    [adjustedTimings, currentHHMM]
  );

  const pendingTasks = state.tasks.filter((t) => !t.isCompleted && !t.isArchived);
  const completedTasksCount = state.tasks.filter((t) => t.isCompleted).length;
  const totalTasksCount = state.tasks.filter((t) => !t.isArchived).length;
  const taskCompletionPercent =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const todayEvents = state.events
    .filter((e) => e.date === todayISO)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recommendedDhikrList = VERIFIED_ADHKAR_DATASET.filter(
    (d) => d.category === adaptive.recommendedAdhkar
  );
  const featuredDhikr = recommendedDhikrList[0];
  const featuredDhikrCount =
    (state.adhkarProgress[todayISO] && state.adhkarProgress[todayISO][featuredDhikr.id]) || 0;

  const isWidgetVisible = (id: string) => {
    const found = state.preferences.dashboardWidgets.find((w) => w.id === id);
    return found ? found.visible : true;
  };

  const toggleWidgetVisibility = (id: string) => {
    const updated = state.preferences.dashboardWidgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    updatePreferences({ dashboardWidgets: updated });
  };

  return (
    <div className={`space-y-5 pb-28 ${adaptive.ambientGradientClass}`}>
      {/* Adaptive Hero Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="lifeos-card-elevated p-5 relative overflow-hidden"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-highlight/70 border border-primary-violet/30 text-xs text-primary-violet-light">
              {adaptive.phase === 'morning' && <Sun className="w-3.5 h-3.5 text-warning-amber" />}
              {adaptive.phase === 'afternoon' && (
                <Sparkles className="w-3.5 h-3.5 text-cyan-accent" />
              )}
              {adaptive.phase === 'evening' && (
                <Moon className="w-3.5 h-3.5 text-religious-gold" />
              )}
              <span>
                {adaptive.phase === 'morning'
                  ? 'الفترة الصباحية الذكية'
                  : adaptive.phase === 'afternoon'
                  ? 'فترة الظهيرة والتركيز'
                  : 'الفترة المسائية والسكينة'}
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-religious-gold font-medium">
                {prayerSchedule?.dateHijri || '29 جمادى الأولى 1448'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary mt-2">
              {adaptive.greetingAr}
            </h1>
            <p className="text-sm text-text-secondary max-w-xl">{adaptive.subGreetingAr}</p>
          </div>

          {/* Time-of-day Simulator & Widget Customizer Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="inline-flex items-center rounded-full p-1 bg-bg-secondary border border-white/10 text-xs"
              role="group"
              aria-label="تبديل طور اليوم"
            >
              {(
                [
                  { id: 'auto', label: 'تلقائي' },
                  { id: 'morning', label: 'صباحاً', icon: Sun },
                  { id: 'afternoon', label: 'ظهراً', icon: Sunset },
                  { id: 'evening', label: 'مساءً', icon: Moon },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOverridePhase(item.id)}
                  className={`px-2.5 py-1 rounded-full transition-all min-h-[32px] ${
                    overridePhase === item.id
                      ? 'bg-primary-violet text-white font-medium shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCustomizeOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-highlight/60 hover:bg-surface-highlight text-xs text-text-primary border border-white/10 min-h-[40px]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-accent" />
              <span>تخصيص اللوحة</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <button
            type="button"
            onClick={() => setActiveTab('lifehub')}
            className="text-right p-3.5 rounded-2xl bg-bg-secondary/80 border border-religious-gold/25 hover:border-religious-gold/50 transition-all"
          >
            <div className="flex items-center justify-between text-xs text-religious-gold">
              <span>الصلاة القادمة: {nextPrayer.prayerNameAr}</span>
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-text-primary tabular-nums mt-1">
              {nextPrayer.prayerTime}
            </div>
            <div className="text-[11px] text-text-muted tabular-nums">
              متبقي {Math.floor(nextPrayer.minutesRemaining / 60)} س و{' '}
              {nextPrayer.minutesRemaining % 60} د
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className="text-right p-3.5 rounded-2xl bg-bg-secondary/80 border border-white/10 hover:border-primary-violet/40 transition-all"
          >
            <div className="flex items-center justify-between text-xs text-primary-violet-light">
              <span>إنجاز مهام اليوم</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-text-primary tabular-nums mt-1">
              {completedTasksCount} / {totalTasksCount} ({taskCompletionPercent}%)
            </div>
            <div className="text-[11px] text-text-muted">
              {pendingTasks.length} مهام متبقية ذات أولوية
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className="text-right p-3.5 rounded-2xl bg-bg-secondary/80 border border-white/10 hover:border-emerald-success/40 transition-all"
          >
            <div className="flex items-center justify-between text-xs text-emerald-success">
              <span>السيولة النقدية المتاحة</span>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-text-primary tabular-nums mt-1">
              {formatMinorUnits(
                currentPeriodSummary.totalAvailableCashMinor,
                state.profile.currency
              )}
            </div>
            <div className="text-[11px] text-text-muted tabular-nums">
              متبقي بالميزانيات:{' '}
              {formatMinorUnits(
                currentPeriodSummary.totalRemainingCategoryBudgetMinor,
                state.profile.currency
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wellbeing')}
            className="text-right p-3.5 rounded-2xl bg-bg-secondary/80 border border-white/10 hover:border-cyan-accent/40 transition-all"
          >
            <div className="flex items-center justify-between text-xs text-cyan-accent">
              <span>الورد والعادات اليومية</span>
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-text-primary tabular-nums mt-1">
              {state.quranGoal.completedToday} / {state.quranGoal.dailyTarget} صفحات
            </div>
            <div className="text-[11px] text-text-muted">
              سورة الكهف • الآية {state.quranGoal.currentAyah}
            </div>
          </button>
        </div>
      </motion.section>

      {/* Widget Customization Drawer */}
      {customizeOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="lifeos-card p-4 border-primary-violet/40"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">
              تخصيص وحدات الشاشة الرئيسية (إظهار / إخفاء)
            </h2>
            <button
              type="button"
              onClick={() => setCustomizeOpen(false)}
              className="text-xs text-primary-violet-light hover:underline"
            >
              تم الحفظ
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.preferences.dashboardWidgets.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => toggleWidgetVisibility(w.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all min-h-[40px] ${
                  w.visible
                    ? 'bg-primary-violet/20 border-primary-violet text-text-primary'
                    : 'bg-bg-secondary border-white/10 text-text-muted'
                }`}
              >
                {w.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{w.labelAr}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mandatory Pending Monthly Rollover Banner */}
      {!isPrevMonthClosed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-gradient-to-l from-primary-violet/25 via-surface-elevated to-surface-primary border border-primary-violet/45 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning-amber">
              <Bell className="w-4 h-4" />
              <span>مراجعة إغلاق الشهر السابق ({prevPeriodKey}) معلقة بانتظار قرارك</span>
            </div>
            <p className="text-xs text-text-secondary">
              لا يقوم LifeOS بترحيل الميزانيات تلقائياً. راجع الفوائض وحدد لكل فئة: ترحيل كامل أو
              مخصص أو تصفير.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMonthlyClosing}
            className="px-4 py-2.5 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-xs font-semibold shadow-md transition-all min-h-[44px]"
          >
            فتح معالج الإغلاق الشهري
          </button>
        </motion.div>
      )}

      {/* Main Adaptive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left/Right Column 1: Priorities, Tasks & Schedule */}
        <div className="lg:col-span-7 space-y-5">
          {isWidgetVisible('priorities') && (
            <section className="lifeos-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-violet-light" />
                  <h2 className="text-base font-bold text-text-primary">
                    {adaptive.phase === 'morning'
                      ? 'أولويات الصباح والمهمة الأهم'
                      : adaptive.phase === 'afternoon'
                      ? 'المهام الجارية وجلسة التركيز المقترحة'
                      : 'ملخص إنجازات اليوم وتهيئة الغد'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenQuickCapture('نظملي بكرة، عندي شغل الساعة 9، وعايز أتمرن وأقرأ وردي.')}
                  className="text-xs text-cyan-accent hover:underline flex items-center gap-1"
                >
                  <span>تنظيم بالذكاء الاصطناعي</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {state.tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      task.isCompleted
                        ? 'bg-bg-secondary/40 border-white/5 opacity-70'
                        : 'bg-bg-secondary/90 border-white/10 hover:border-primary-violet/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        aria-label={`تبديل حالة المهمة ${task.title}`}
                        className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                          task.isCompleted
                            ? 'bg-emerald-success border-emerald-success text-bg-primary'
                            : 'border-text-muted hover:border-primary-violet'
                        }`}
                      >
                        {task.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            task.isCompleted
                              ? 'line-through text-text-muted'
                              : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-text-muted">
                          <span className="px-2 py-0.5 rounded-full bg-surface-highlight/60 text-text-secondary">
                            {task.category}
                          </span>
                          {task.dueTime && (
                            <span className="tabular-nums flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.dueTime}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              task.priority === 'urgent'
                                ? 'bg-danger-coral/20 text-danger-coral'
                                : task.priority === 'high'
                                ? 'bg-warning-amber/20 text-warning-amber'
                                : 'bg-cyan-accent/15 text-cyan-accent'
                            }`}
                          >
                            {task.priority === 'urgent'
                              ? 'عاجل'
                              : task.priority === 'high'
                              ? 'مهم'
                              : 'عادي'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('planner')}
                      className="text-xs text-text-muted hover:text-text-primary px-2 py-1"
                    >
                      التفاصيل
                    </button>
                  </div>
                ))}
              </div>

              {/* Today's Agenda Strip */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-accent" />
                    مواعيد اليوم المجدولة ({todayEvents.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('planner')}
                    className="text-xs text-primary-violet-light hover:underline"
                  >
                    فتح التقويم الكامل
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {todayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-surface-elevated/70 border border-white/10"
                      style={{ borderRightWidth: '3px', borderRightColor: ev.color }}
                    >
                      <div className="text-xs font-semibold text-text-primary truncate">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-text-muted tabular-nums mt-1">
                        {ev.startTime} – {ev.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Financial Snapshot Widget */}
          {isWidgetVisible('finance') && (
            <section className="lifeos-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-success" />
                  <h2 className="text-base font-bold text-text-primary">
                    النبض المالي وميزانية الشهر ({state.activePeriodKey})
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenQuickCapture('سجل إني صرفت 350 جنيه أكل النهاردة.')
                    }
                    className="px-3 py-1.5 rounded-full bg-surface-highlight hover:bg-primary-violet text-xs text-text-primary transition-all"
                  >
                    + تسجيل مصروف سريع
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('finance')}
                    className="text-xs text-primary-violet-light hover:underline"
                  >
                    استوديو المالية
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-bg-secondary border border-white/10">
                  <div className="text-[11px] text-text-muted">إجمالي الدخل المستلم</div>
                  <div className="text-sm sm:text-base font-bold text-emerald-success tabular-nums mt-1">
                    {formatMinorUnits(
                      currentPeriodSummary.totalIncomeMinor,
                      state.profile.currency
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-bg-secondary border border-white/10">
                  <div className="text-[11px] text-text-muted">إجمالي المصروفات</div>
                  <div className="text-sm sm:text-base font-bold text-danger-coral tabular-nums mt-1">
                    {formatMinorUnits(
                      currentPeriodSummary.totalExpenseMinor,
                      state.profile.currency
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-bg-secondary border border-white/10">
                  <div className="text-[11px] text-text-muted">المتبقي في ميزانيات الفئات</div>
                  <div className="text-sm sm:text-base font-bold text-cyan-accent tabular-nums mt-1">
                    {formatMinorUnits(
                      currentPeriodSummary.totalRemainingCategoryBudgetMinor,
                      state.profile.currency
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {currentPeriodSummary.categoryStatuses.slice(0, 3).map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text-primary">{cat.categoryName}</span>
                      <span className="tabular-nums text-text-secondary">
                        صُرف {formatMinorUnits(cat.spentMinor, state.profile.currency)} من{' '}
                        {formatMinorUnits(cat.effectiveBudgetMinor, state.profile.currency)} (
                        {cat.utilizationPercent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, cat.utilizationPercent)}%`,
                          backgroundColor:
                            cat.overspentMinor > 0 ? 'var(--danger-coral)' : cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Column 2: Deen Hub (Adhkar + Wird), Habits & News */}
        <div className="lg:col-span-5 space-y-5">
          {isWidgetVisible('prayer_adhkar') && (
            <section className="lifeos-card-deen p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-religious-gold" />
                  <h2 className="text-base font-bold text-text-primary">
                    {adaptive.recommendedAdhkar === 'morning'
                      ? 'ورد أذكار الصباح والسكينة'
                      : 'ورد أذكار المساء والقرآن'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('lifehub')}
                  className="text-xs text-religious-gold hover:underline"
                >
                  فتح ركن الدين
                </button>
              </div>

              {/* Interactive Verified Dhikr Card */}
              <div className="p-4 rounded-2xl bg-bg-primary/70 border border-religious-gold/25 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-religious-gold">
                    {featuredDhikr.titleAr}
                  </span>
                  <span className="text-text-muted">{featuredDhikr.sourceReference}</span>
                </div>
                <p className="quran-uthmani-text text-base text-text-primary leading-relaxed">
                  {featuredDhikr.arabicText}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-text-secondary tabular-nums">
                    التكرار: {featuredDhikrCount} / {featuredDhikr.targetCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      incrementDhikr(featuredDhikr.id, featuredDhikr.targetCount)
                    }
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all min-h-[40px] ${
                      featuredDhikrCount >= featuredDhikr.targetCount
                        ? 'bg-emerald-success text-bg-primary'
                        : 'bg-religious-gold text-bg-primary hover:opacity-90'
                    }`}
                  >
                    {featuredDhikrCount >= featuredDhikr.targetCount
                      ? 'تم الإتمام بحمد الله ✓'
                      : 'اضغط للتسبيح والعد'}
                  </button>
                </div>
              </div>

              {/* Daily Quran Wird Quick Progress */}
              <div className="p-3.5 rounded-2xl bg-bg-secondary/75 border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    الورد القرآني اليومي ({state.quranGoal.completedToday} من{' '}
                    {state.quranGoal.dailyTarget} صفحات)
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    آخر موضع: سورة الكهف • صفحة {state.quranGoal.currentPage}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuranGoalProgress(1)}
                    className="px-3 py-2 rounded-xl bg-surface-highlight hover:bg-primary-violet text-xs text-text-primary transition-all min-h-[40px]"
                  >
                    + صفحة مقروءة
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Habits & Wellbeing Snapshot */}
          {isWidgetVisible('habits') && (
            <section className="lifeos-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-cyan-accent" />
                  <h2 className="text-base font-bold text-text-primary">العادات اليومية والصحة</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('wellbeing')}
                  className="text-xs text-cyan-accent hover:underline"
                >
                  كل العادات
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {state.habits.slice(0, 4).map((habit) => {
                  const doneToday = habit.completedDates.includes(todayISO);
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => toggleHabitDate(habit.id, todayISO)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 min-h-[54px] ${
                        doneToday
                          ? 'bg-emerald-success/15 border-emerald-success/50 text-text-primary'
                          : 'bg-bg-secondary/80 border-white/10 text-text-secondary hover:border-white/25'
                      }`}
                    >
                      <span className="text-xs font-medium line-clamp-1">{habit.title}</span>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          doneToday
                            ? 'bg-emerald-success text-bg-primary font-bold'
                            : 'bg-surface-highlight text-text-muted'
                        }`}
                      >
                        {doneToday ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Compact News Digest Widget */}
          {isWidgetVisible('news') && (
            <section className="lifeos-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-primary-violet-light" />
                  <h2 className="text-sm font-bold text-text-primary">
                    موجز الأخبار الموثق (لا يطغى على أولوياتك)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('lifehub')}
                  className="text-xs text-primary-violet-light hover:underline"
                >
                  غرفة الأخبار
                </button>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                البنك المركزي المصري يعلن تحديثات جديدة لمنظومة المدفوعات الرقمية الفورية • تطورات
                الجيل الجديد من نماذج الذكاء الاصطناعي في الإنتاجية.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
