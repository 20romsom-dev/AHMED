// =============================================================================
// LIFEOS — UNIFIED STATE & OFFLINE-FIRST PERSISTENCE STORE
// - Uses IndexedDB (idb-keyval) + LocalStorage mirror + optional Supabase sync
// - Provides deterministic, realistic initial state that users can modify,
//   reset, export as JSON/CSV, or clear completely.
// =============================================================================

'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  AppNotification,
  BudgetAllocation,
  CalendarEventItem,
  CategoryCarryoverInput,
  DailyQuranGoal,
  DebtRecord,
  FinancialAccount,
  FinancialTransaction,
  FocusSessionRecord,
  GoalItem,
  HabitItem,
  IncomeSource,
  MonthlyClosingReview,
  NavTabId,
  NewsArticleItem,
  NoteItem,
  NotificationSettings,
  PrayerName,
  PrayerScheduleData,
  PrayerSettings,
  ProjectItem,
  QuranBookmark,
  SavingsGoal,
  TaskItem,
  ThemeId,
  TransactionCategory,
  UserPreferences,
  UserProfile,
  WellnessLog,
} from '@/domain/types';
import {
  computePeriodSummary,
  executeMonthlyClosingCarryover,
  PeriodFinancialSummary,
  reconcileAccountBalance,
  toMinorUnits,
} from '@/domain/finance/engine';
import { VERIFIED_ADHKAR_DATASET } from '@/domain/deen/verified-data';

const STORAGE_KEY = 'lifeos_master_state_v1';

export interface LifeOSState {
  profile: UserProfile;
  preferences: UserPreferences;
  notificationSettings: NotificationSettings;
  activePeriodKey: string; // YYYY-MM
  tasks: TaskItem[];
  projects: ProjectItem[];
  events: CalendarEventItem[];
  focusSessions: FocusSessionRecord[];
  accounts: FinancialAccount[];
  incomeSources: IncomeSource[];
  categories: TransactionCategory[];
  allocations: BudgetAllocation[];
  transactions: FinancialTransaction[];
  closingReviews: MonthlyClosingReview[];
  savingsGoals: SavingsGoal[];
  debts: DebtRecord[];
  habits: HabitItem[];
  wellnessLogs: Record<string, WellnessLog>; // date -> WellnessLog
  goals: GoalItem[];
  notes: NoteItem[];
  prayerSettings: PrayerSettings;
  prayerTracking: Record<string, Record<PrayerName, boolean>>; // date -> prayer -> completed
  quranBookmarks: QuranBookmark[];
  quranGoal: DailyQuranGoal;
  adhkarProgress: Record<string, Record<string, number>>; // date -> dhikrId -> count
  savedArticles: NewsArticleItem[];
  readArticleUrls: string[];
  notifications: AppNotification[];
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncedAt: string;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentPeriodKey(): string {
  return getTodayISO().slice(0, 7);
}

function getPrevPeriodKey(periodKey: string): string {
  const [y, m] = periodKey.split('-').map((n) => parseInt(n, 10));
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function createInitialLifeOSState(): LifeOSState {
  const today = getTodayISO();
  const currentPeriod = getCurrentPeriodKey();
  const prevPeriod = getPrevPeriodKey(currentPeriod);

  return {
    profile: {
      id: 'usr_local_owner',
      displayName: 'أحمد',
      email: 'ahmed@lifeos.app',
      locale: 'ar',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      weekStart: 6,
      onboardingCompleted: true,
    },
    preferences: {
      theme: 'midnight-aurora',
      reducedMotion: false,
      enabledModules: {
        planner: true,
        finance: true,
        wellbeing: true,
        goals: true,
        notes: true,
        deen: true,
        news: true,
        ai: true,
      },
      dashboardWidgets: [
        { id: 'priorities', labelAr: 'أولويات اليوم', labelEn: 'Daily Priorities', visible: true, compact: false, order: 1 },
        { id: 'prayer_adhkar', labelAr: 'الصلاة والأذكار', labelEn: 'Prayer & Adhkar', visible: true, compact: false, order: 2 },
        { id: 'finance', labelAr: 'النبض المالي والميزانية', labelEn: 'Financial Pulse', visible: true, compact: false, order: 3 },
        { id: 'tasks', labelAr: 'المهام القادمة', labelEn: 'Upcoming Tasks', visible: true, compact: false, order: 4 },
        { id: 'quran_wird', labelAr: 'الورد القرآني', labelEn: 'Quran Wird', visible: true, compact: false, order: 5 },
        { id: 'habits', labelAr: 'العادات والصحة', labelEn: 'Habits & Wellbeing', visible: true, compact: false, order: 6 },
        { id: 'news', labelAr: 'موجز الأخبار الموثق', labelEn: 'Verified News Digest', visible: true, compact: true, order: 7 },
      ],
      monthClosingReminderDays: 3,
      aiEnabled: true,
    },
    notificationSettings: {
      tasksEnabled: true,
      appointmentsEnabled: true,
      prayersEnabled: true,
      prayerLeadMinutes: 15,
      morningAdhkarEnabled: true,
      morningAdhkarTime: '06:30',
      eveningAdhkarEnabled: true,
      eveningAdhkarTime: '17:30',
      quranWirdEnabled: true,
      habitsEnabled: true,
      billsEnabled: true,
      monthlyClosingEnabled: true,
      goalsEnabled: true,
      newsEnabled: false,
      quietHoursStart: '23:00',
      quietHoursEnd: '05:00',
    },
    activePeriodKey: currentPeriod,
    tasks: [
      {
        id: 'tsk_1',
        projectId: 'prj_1',
        title: 'مراجعة خطة إطلاق النسخة الجديدة من المنتج',
        description: 'مراجعة تجربة المستخدم النهائية وتدقيق سرعة الاستجابة على الهواتف.',
        dueDate: today,
        dueTime: '11:00',
        priority: 'urgent',
        category: 'عمل',
        recurrenceRule: null,
        isCompleted: false,
        subtasks: [
          { id: 'sub_1', title: 'تدقيق التباين اللوني ودعم RTL', isCompleted: true },
          { id: 'sub_2', title: 'اختبار محرك الميزانية وترحيل الشهر', isCompleted: false },
        ],
        notes: 'التركيز على سلاسة الانتقالات الحركية',
        isArchived: false,
        createdAt: `${today}T07:30:00Z`,
      },
      {
        id: 'tsk_2',
        projectId: null,
        title: 'سداد فاتورة الإنترنت المنزلي والكهرباء',
        description: 'الدفع عبر تطبيق المحفظة البنكية وتوثيق الإيصال.',
        dueDate: today,
        dueTime: '14:30',
        priority: 'high',
        category: 'مالية',
        recurrenceRule: 'MONTHLY',
        isCompleted: false,
        subtasks: [],
        notes: '',
        isArchived: false,
        createdAt: `${today}T08:00:00Z`,
      },
      {
        id: 'tsk_3',
        projectId: 'prj_2',
        title: 'قراءة فصل من كتاب التصميم المعماري للأنظمة',
        description: 'تلخيص أهم النقاط في ركن الملاحظات المعرفية.',
        dueDate: today,
        dueTime: '20:00',
        priority: 'medium',
        category: 'تعلم',
        recurrenceRule: 'DAILY',
        isCompleted: true,
        completedAt: `${today}T09:15:00Z`,
        subtasks: [],
        notes: '',
        isArchived: false,
        createdAt: `${today}T06:00:00Z`,
      },
    ],
    projects: [
      {
        id: 'prj_1',
        title: 'تطوير منصة LifeOS المتكاملة',
        description: 'بناء نظام تشغيل شخصي ذكي يدعم العربية بالكامل ويعمل دون اتصال.',
        color: '#8B5CF6',
        status: 'active',
        deadline: `${currentPeriod}-28`,
        milestones: [
          { id: 'ms_1', title: 'اعتماد نظام ألوان Midnight Aurora', isCompleted: true },
          { id: 'ms_2', title: 'إنجاز محرك الإغلاق الشهري المالي', isCompleted: true },
          { id: 'ms_3', title: 'دمج أوقات الصلاة والمصحف العثماني', isCompleted: false },
        ],
        notes: 'مشروع الربع الحالي الأساسي',
        isArchived: false,
        createdAt: `${currentPeriod}-01T09:00:00Z`,
      },
      {
        id: 'prj_2',
        title: 'خطة اللياقة والقراءة المعرفية',
        description: 'الالتزام بـ 4 جلسات تمرين أسبوعياً مع قراءة 30 صفحة يومياً.',
        color: '#36D6A1',
        status: 'active',
        deadline: `${currentPeriod}-30`,
        milestones: [
          { id: 'ms_4', title: 'إتمام 14 يوماً متتالية من أذكار الصباح والورد', isCompleted: true },
          { id: 'ms_5', title: 'إنهاء كتابين في الإدارة المالية', isCompleted: false },
        ],
        notes: '',
        isArchived: false,
        createdAt: `${currentPeriod}-02T10:00:00Z`,
      },
    ],
    events: [
      {
        id: 'evt_1',
        title: 'اجتماع تخطيط المنتج الأسبوعي',
        description: 'مناقشة أولويات الأسبوع ومؤشرات الأداء.',
        date: today,
        startTime: '10:00',
        endTime: '11:00',
        isAllDay: false,
        category: 'عمل',
        color: '#8B5CF6',
        reminderMinutes: 15,
        notes: '',
      },
      {
        id: 'evt_2',
        title: 'جلسة تركيز عميق — هندسة البرمجيات',
        description: 'إيقاف الإشعارات غير العاجلة.',
        date: today,
        startTime: '13:00',
        endTime: '14:30',
        isAllDay: false,
        category: 'تركيز',
        color: '#35D6E8',
        reminderMinutes: 10,
        notes: '',
      },
      {
        id: 'evt_3',
        title: 'تمرين المساء والنشاط البدني',
        description: 'تمرين كارديو وإطالة.',
        date: today,
        startTime: '18:00',
        endTime: '19:00',
        isAllDay: false,
        category: 'صحة',
        color: '#36D6A1',
        reminderMinutes: 15,
        notes: '',
      },
    ],
    focusSessions: [
      {
        id: 'fcs_1',
        taskId: 'tsk_1',
        label: 'تصميم معمارية النظام المالي',
        durationMinutes: 45,
        completedMinutes: 45,
        status: 'completed',
        startedAt: `${today}T08:00:00Z`,
        endedAt: `${today}T08:45:00Z`,
      },
    ],
    accounts: [
      {
        id: 'acc_bank_main',
        name: 'الحساب البنكي الأساسي (CIB)',
        type: 'bank',
        currency: 'EGP',
        openingBalanceMinor: toMinorUnits(18000),
        color: '#8B5CF6',
        icon: 'Landmark',
        isArchived: false,
      },
      {
        id: 'acc_cash_wallet',
        name: 'المحفظة النقدية (كاش)',
        type: 'cash',
        currency: 'EGP',
        openingBalanceMinor: toMinorUnits(3500),
        color: '#36D6A1',
        icon: 'Wallet',
        isArchived: false,
      },
      {
        id: 'acc_instapay',
        name: 'محفظة ذكية / InstaPay',
        type: 'wallet',
        currency: 'EGP',
        openingBalanceMinor: toMinorUnits(4200),
        color: '#35D6E8',
        icon: 'Smartphone',
        isArchived: false,
      },
      {
        id: 'acc_savings',
        name: 'حساب الادخار والطوارئ',
        type: 'savings',
        currency: 'EGP',
        openingBalanceMinor: toMinorUnits(45000),
        color: '#D5B978',
        icon: 'PiggyBank',
        isArchived: false,
      },
    ],
    incomeSources: [
      {
        id: 'inc_salary',
        name: 'الراتب الشهري الأساسي',
        expectedAmountMinor: toMinorUnits(35000),
        paydayOfMonth: 1,
        isRecurring: true,
        defaultAccountId: 'acc_bank_main',
        isActive: true,
      },
      {
        id: 'inc_consulting',
        name: 'استشارات ومشاريع تقنية',
        expectedAmountMinor: toMinorUnits(8000),
        paydayOfMonth: 15,
        isRecurring: false,
        defaultAccountId: 'acc_instapay',
        isActive: true,
      },
    ],
    categories: [
      {
        id: 'cat_food',
        name: 'طعام ومطاعم',
        icon: 'Utensils',
        color: '#8B5CF6',
        type: 'expense',
        defaultMonthlyBudgetMinor: toMinorUnits(7500),
        sortOrder: 1,
        isArchived: false,
      },
      {
        id: 'cat_housing',
        name: 'فواتير وسكن',
        icon: 'Home',
        color: '#35D6E8',
        type: 'expense',
        defaultMonthlyBudgetMinor: toMinorUnits(8000),
        sortOrder: 2,
        isArchived: false,
      },
      {
        id: 'cat_transport',
        name: 'مواصلات وانتقالات',
        icon: 'Car',
        color: '#36D6A1',
        type: 'expense',
        defaultMonthlyBudgetMinor: toMinorUnits(3000),
        sortOrder: 3,
        isArchived: false,
      },
      {
        id: 'cat_shopping',
        name: 'تسوق ومشتريات',
        icon: 'ShoppingBag',
        color: '#F4B860',
        type: 'expense',
        defaultMonthlyBudgetMinor: toMinorUnits(4000),
        sortOrder: 4,
        isArchived: false,
      },
      {
        id: 'cat_health',
        name: 'صحة وعافية',
        icon: 'HeartPulse',
        color: '#FF7185',
        type: 'expense',
        defaultMonthlyBudgetMinor: toMinorUnits(2500),
        sortOrder: 5,
        isArchived: false,
      },
      {
        id: 'cat_education',
        name: 'تعليم وتطوير ذاتي',
        icon: 'BookOpen',
        color: '#D5B978',
        type: 'expense',
        defaultMonthlyBudgetMinor: toMinorUnits(2000),
        sortOrder: 6,
        isArchived: false,
      },
    ],
    allocations: [
      // Previous month allocations (left unclosed so user can experience & test the Mandatory Monthly Closing Wizard)
      { id: 'al_prev_1', periodKey: prevPeriod, categoryId: 'cat_food', allocatedMinor: toMinorUnits(7500), carryoverMinor: 0 },
      { id: 'al_prev_2', periodKey: prevPeriod, categoryId: 'cat_housing', allocatedMinor: toMinorUnits(8000), carryoverMinor: 0 },
      { id: 'al_prev_3', periodKey: prevPeriod, categoryId: 'cat_transport', allocatedMinor: toMinorUnits(3000), carryoverMinor: 0 },
      { id: 'al_prev_4', periodKey: prevPeriod, categoryId: 'cat_shopping', allocatedMinor: toMinorUnits(4000), carryoverMinor: 0 },
      { id: 'al_prev_5', periodKey: prevPeriod, categoryId: 'cat_health', allocatedMinor: toMinorUnits(2500), carryoverMinor: 0 },
      { id: 'al_prev_6', periodKey: prevPeriod, categoryId: 'cat_education', allocatedMinor: toMinorUnits(2000), carryoverMinor: 0 },
      // Current month allocations
      { id: 'al_cur_1', periodKey: currentPeriod, categoryId: 'cat_food', allocatedMinor: toMinorUnits(7500), carryoverMinor: 0 },
      { id: 'al_cur_2', periodKey: currentPeriod, categoryId: 'cat_housing', allocatedMinor: toMinorUnits(8000), carryoverMinor: 0 },
      { id: 'al_cur_3', periodKey: currentPeriod, categoryId: 'cat_transport', allocatedMinor: toMinorUnits(3000), carryoverMinor: 0 },
      { id: 'al_cur_4', periodKey: currentPeriod, categoryId: 'cat_shopping', allocatedMinor: toMinorUnits(4000), carryoverMinor: 0 },
      { id: 'al_cur_5', periodKey: currentPeriod, categoryId: 'cat_health', allocatedMinor: toMinorUnits(2500), carryoverMinor: 0 },
      { id: 'al_cur_6', periodKey: currentPeriod, categoryId: 'cat_education', allocatedMinor: toMinorUnits(2000), carryoverMinor: 0 },
    ],
    transactions: [
      // Previous month transactions
      {
        id: 'tx_prev_sal',
        type: 'income',
        amountMinor: toMinorUnits(35000),
        accountId: 'acc_bank_main',
        incomeSourceId: 'inc_salary',
        date: `${prevPeriod}-01`,
        periodKey: prevPeriod,
        description: 'راتب الشهر السابق',
        notes: 'إيداع بنكي مباشر',
        isRecurring: true,
        createdAt: `${prevPeriod}-01T09:00:00Z`,
      },
      {
        id: 'tx_prev_food',
        type: 'expense',
        amountMinor: toMinorUnits(5800), // 1,700 EGP remaining for carryover!
        accountId: 'acc_bank_main',
        categoryId: 'cat_food',
        date: `${prevPeriod}-18`,
        periodKey: prevPeriod,
        description: 'إجمالي مشتريات الطعام والتموين',
        notes: '',
        isRecurring: false,
        createdAt: `${prevPeriod}-18T14:00:00Z`,
      },
      {
        id: 'tx_prev_housing',
        type: 'expense',
        amountMinor: toMinorUnits(7400), // 600 EGP remaining
        accountId: 'acc_bank_main',
        categoryId: 'cat_housing',
        date: `${prevPeriod}-05`,
        periodKey: prevPeriod,
        description: 'الإيجار وفواتير المرافق',
        notes: '',
        isRecurring: true,
        createdAt: `${prevPeriod}-05T11:00:00Z`,
      },
      {
        id: 'tx_prev_transport',
        type: 'expense',
        amountMinor: toMinorUnits(2100), // 900 EGP remaining
        accountId: 'acc_cash_wallet',
        categoryId: 'cat_transport',
        date: `${prevPeriod}-22`,
        periodKey: prevPeriod,
        description: 'وقود وانتقالات الشهر',
        notes: '',
        isRecurring: false,
        createdAt: `${prevPeriod}-22T17:00:00Z`,
      },
      // Current month transactions
      {
        id: 'tx_cur_sal',
        type: 'income',
        amountMinor: toMinorUnits(35000),
        accountId: 'acc_bank_main',
        incomeSourceId: 'inc_salary',
        date: `${currentPeriod}-01`,
        periodKey: currentPeriod,
        description: 'راتب الشهر الحالي الأساسي',
        notes: 'تم الاستلام بالكامل',
        isRecurring: true,
        createdAt: `${currentPeriod}-01T09:00:00Z`,
      },
      {
        id: 'tx_cur_freelance',
        type: 'income',
        amountMinor: toMinorUnits(6500),
        accountId: 'acc_instapay',
        incomeSourceId: 'inc_consulting',
        date: `${currentPeriod}-04`,
        periodKey: currentPeriod,
        description: 'دفعة استشارات تصميم الأنظمة',
        notes: '',
        isRecurring: false,
        createdAt: `${currentPeriod}-04T15:00:00Z`,
      },
      {
        id: 'tx_cur_housing',
        type: 'expense',
        amountMinor: toMinorUnits(6800),
        accountId: 'acc_bank_main',
        categoryId: 'cat_housing',
        date: `${currentPeriod}-03`,
        periodKey: currentPeriod,
        description: 'إيجار السكن وفاتورة الكهرباء والإنترنت',
        notes: '',
        isRecurring: true,
        createdAt: `${currentPeriod}-03T10:00:00Z`,
      },
      {
        id: 'tx_cur_food_1',
        type: 'expense',
        amountMinor: toMinorUnits(2850),
        accountId: 'acc_bank_main',
        categoryId: 'cat_food',
        date: `${currentPeriod}-06`,
        periodKey: currentPeriod,
        description: 'مستلزمات المنزل الأسبوعية ومطاعم',
        notes: '',
        isRecurring: false,
        createdAt: `${currentPeriod}-06T19:00:00Z`,
      },
      {
        id: 'tx_cur_transport_1',
        type: 'expense',
        amountMinor: toMinorUnits(950),
        accountId: 'acc_cash_wallet',
        categoryId: 'cat_transport',
        date: `${currentPeriod}-07`,
        periodKey: currentPeriod,
        description: 'تموين وقود السيارة',
        notes: '',
        isRecurring: false,
        createdAt: `${currentPeriod}-07T12:00:00Z`,
      },
      {
        id: 'tx_cur_uncat',
        type: 'expense',
        amountMinor: toMinorUnits(450),
        accountId: 'acc_cash_wallet',
        categoryId: null, // Uncategorized expense (reduces cash only, no category budget reduced)
        date: today,
        periodKey: currentPeriod,
        description: 'إكراميات ومصروف نقدي غير مصنف',
        notes: 'يخصم من الرصيد النقدي فقط دون التأثير على ميزانيات الفئات',
        isRecurring: false,
        createdAt: `${today}T09:00:00Z`,
      },
      {
        id: 'tx_cur_transfer',
        type: 'transfer',
        amountMinor: toMinorUnits(5000),
        accountId: 'acc_bank_main',
        toAccountId: 'acc_savings',
        categoryId: null,
        date: `${currentPeriod}-05`,
        periodKey: currentPeriod,
        description: 'تحويل ادخار شهري لحساب الطوارئ',
        notes: 'تحويل بين الحسابات الشخصية (لا يُحتسب مصروفاً)',
        isRecurring: true,
        createdAt: `${currentPeriod}-05T16:00:00Z`,
      },
    ],
    closingReviews: [],
    savingsGoals: [
      {
        id: 'svg_1',
        title: 'صندوق الطوارئ والأمان المالي (6 أشهر)',
        targetAmountMinor: toMinorUnits(120000),
        currentAmountMinor: toMinorUnits(50000),
        targetDate: '2027-06-30',
        linkedAccountId: 'acc_savings',
        color: '#36D6A1',
      },
      {
        id: 'svg_2',
        title: 'تحديث محطة العمل والأجهزة التقنية',
        targetAmountMinor: toMinorUnits(45000),
        currentAmountMinor: toMinorUnits(22500),
        targetDate: '2027-03-01',
        linkedAccountId: 'acc_instapay',
        color: '#8B5CF6',
      },
    ],
    debts: [
      {
        id: 'dbt_1',
        title: 'قسط تقسيط جهاز اللابتوب بدون فوائد',
        counterparty: 'البنك التجاري',
        direction: 'owed_by_me',
        totalAmountMinor: toMinorUnits(24000),
        remainingAmountMinor: toMinorUnits(8000),
        monthlyInstallmentMinor: toMinorUnits(2000),
        dueDay: 15,
        nextDueDate: `${currentPeriod}-15`,
        notes: 'متبقي 4 أقساط شهرية',
      },
    ],
    habits: [
      {
        id: 'hab_1',
        title: 'أذكار الصباح والمساء في وقتها',
        category: 'روحانيات',
        frequency: 'daily',
        targetPerPeriod: 1,
        reminderTime: '06:30',
        color: '#D5B978',
        icon: 'Sparkles',
        completedDates: [today],
        isArchived: false,
      },
      {
        id: 'hab_2',
        title: 'تمرين رياضي أو مشي سريع (30 دقيقة)',
        category: 'صحة',
        frequency: 'daily',
        targetPerPeriod: 1,
        reminderTime: '18:00',
        color: '#36D6A1',
        icon: 'Activity',
        completedDates: [],
        isArchived: false,
      },
      {
        id: 'hab_3',
        title: 'قراءة معرفية مركزة (20 صفحة)',
        category: 'تعلم',
        frequency: 'daily',
        targetPerPeriod: 1,
        reminderTime: '21:00',
        color: '#8B5CF6',
        icon: 'BookOpen',
        completedDates: [today],
        isArchived: false,
      },
      {
        id: 'hab_4',
        title: 'مراجعة المصروفات اليومية قبل النوم',
        category: 'مالية',
        frequency: 'daily',
        targetPerPeriod: 1,
        reminderTime: '22:00',
        color: '#35D6E8',
        icon: 'Wallet',
        completedDates: [today],
        isArchived: false,
      },
    ],
    wellnessLogs: {
      [today]: {
        date: today,
        waterCups: 6,
        waterTargetCups: 8,
        sleepHours: 7.5,
        exerciseMinutes: 35,
        activityType: 'مشي سريع وتمارين إطالة',
        mood: 4,
        moodLabel: 'صافٍ ومتوازن',
        notes: 'طاقة جيدة منذ الصباح مع التزام بساعات النوم.',
      },
    },
    goals: [
      {
        id: 'gol_1',
        title: 'إتقان هندسة النظم الموزعة والذكاء الاصطناعي التطبيقي',
        description: 'إتمام 3 مشاريع إنتاجية متكاملة مع توثيق معماري شامل.',
        category: 'learning',
        targetDate: '2027-03-31',
        milestones: [
          { id: 'gms_1', title: 'إنجاز مشروع LifeOS المعماري', isCompleted: true },
          { id: 'gms_2', title: 'بناء محرك المزامنة المحلية IndexedDB', isCompleted: true },
          { id: 'gms_3', title: 'نشر دراسة الحالة الهندسية', isCompleted: false },
        ],
        linkedTaskIds: ['tsk_1', 'tsk_3'],
        linkedHabitIds: ['hab_3'],
        notes: 'يرتبط مباشرة بمشروع التطوير المهني',
        isCompleted: false,
      },
      {
        id: 'gol_2',
        title: 'الوصول إلى نسبة ادخار واستثمار 35% من الدخل الشهري',
        description: 'ضبط الميزانيات الشهرية وترحيل الفوائض بانتظام.',
        category: 'financial',
        targetDate: '2027-06-30',
        milestones: [
          { id: 'gms_4', title: 'تأسيس صندوق الطوارئ الأولي', isCompleted: true },
          { id: 'gms_5', title: 'إغلاق 3 أشهر متتالية بدون تجاوز ميزانية', isCompleted: false },
        ],
        linkedTaskIds: ['tsk_2'],
        linkedHabitIds: ['hab_4'],
        notes: '',
        isCompleted: false,
      },
    ],
    notes: [
      {
        id: 'not_1',
        title: 'مبادئ تصميم النظم المالية عالية الموثوقية',
        content:
          '1. تخزين جميع القيم النقدية بوحدات العملة الصغرى الصحيحة (Integer Minor Units).\n2. الفصل الصارم بين الرصيد النقدي الفعلي في الحسابات وبين الميزانيات المخصصة للفئات.\n3. عدم ترحيل الفوائض الشهرية تلقائياً دون مراجعة وموافقة صريحة من المستخدم.',
        category: 'هندسة البرمجيات',
        tags: ['مالية', 'معمارية', 'LifeOS'],
        checklist: [
          { id: 'chk_1', text: 'تطبيق الحسابات الصحيحة بدون فواصل عائمة', checked: true },
          { id: 'chk_2', text: 'حماية عمليات الترحيل بمفتاح عدم التكرار Idempotency', checked: true },
        ],
        isPinned: true,
        isFavorite: true,
        isJournal: false,
        isArchived: false,
        updatedAt: `${today}T10:00:00Z`,
      },
      {
        id: 'not_2',
        title: 'تأملات المساء ويوميات الامتنان',
        content:
          'الحمد لله الذي بنعمته تتم الصالحات. تنظيم الوقت حول أوقات الصلاة يمنح اليوم إيقاعاً هادئاً ويمنع التشتت.',
        category: 'يوميات',
        tags: ['امتنان', 'توازن'],
        checklist: [],
        isPinned: false,
        isFavorite: true,
        isJournal: true,
        journalDate: today,
        isArchived: false,
        updatedAt: `${today}T18:00:00Z`,
      },
    ],
    prayerSettings: {
      city: 'Cairo',
      country: 'Egypt',
      latitude: 30.0444,
      longitude: 31.2357,
      calculationMethod: 5,
      asrSchool: 0,
      hijriAdjustment: 0,
      showInPlanner: true,
      reserveMinutesAround: 20,
      manualAdjustments: {
        Fajr: 0,
        Sunrise: 0,
        Dhuhr: 0,
        Asr: 0,
        Maghrib: 0,
        Isha: 0,
      },
    },
    prayerTracking: {
      [today]: {
        Fajr: true,
        Sunrise: true,
        Dhuhr: true,
        Asr: true,
        Maghrib: false,
        Isha: false,
      },
    },
    quranBookmarks: [
      {
        id: 'qbm_1',
        surahNumber: 18,
        surahNameAr: 'الكهف',
        ayahNumber: 10,
        pageNumber: 294,
        juzNumber: 15,
        note: 'وقفة تدبر عند دعاء الفتية: ربنا آتنا من لدنك رحمة وهيئ لنا من أمرنا رشدا',
        isLastRead: true,
        createdAt: `${today}T06:45:00Z`,
      },
      {
        id: 'qbm_2',
        surahNumber: 67,
        surahNameAr: 'الملك',
        ayahNumber: 1,
        pageNumber: 562,
        juzNumber: 29,
        note: 'ورد المساء قبل النوم',
        isLastRead: false,
        createdAt: `${today}T21:00:00Z`,
      },
    ],
    quranGoal: {
      unitType: 'pages',
      dailyTarget: 4,
      completedToday: 3,
      currentSurah: 18,
      currentAyah: 10,
      currentPage: 294,
      weeklyHistory: [4, 4, 3, 5, 4, 4, 3],
    },
    adhkarProgress: {
      [today]: {
        morning_ayat_kursi: 1,
        morning_asbahna: 1,
      },
    },
    savedArticles: [],
    readArticleUrls: [],
    notifications: [
      {
        id: 'ntf_1',
        category: 'closing',
        priority: 'high',
        title: 'مراجعة إغلاق الشهر السابق وترحيل الميزانية بانتظار تأكيدك',
        body: `يوجد فائض ميزانية في شهر ${prevPeriod} بقيمة 3,200 ج.م. افتح معالج الإغلاق الشهري لاختيار طريقة الترحيل.`,
        actionTab: 'finance',
        isRead: false,
        createdAt: `${today}T08:00:00Z`,
      },
      {
        id: 'ntf_2',
        category: 'prayer',
        priority: 'normal',
        title: 'تكامل أوقات الصلاة مع المخطط اليومي مفعل',
        body: 'يتم حجز 20 دقيقة تلقائياً حول كل صلاة مفروضة لمنع تعارض المواعيد.',
        actionTab: 'planner',
        isRead: false,
        createdAt: `${today}T07:00:00Z`,
      },
    ],
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  };
}

interface LifeOSContextValue {
  state: LifeOSState;
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  prayerSchedule: PrayerScheduleData | null;
  refreshPrayerSchedule: () => Promise<void>;
  currentPeriodSummary: PeriodFinancialSummary;
  previousPeriodSummary: PeriodFinancialSummary;
  prevPeriodKey: string;
  isPrevMonthClosed: boolean;
  // Theme & Profile
  setTheme: (theme: ThemeId) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
  // Planner actions
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'isCompleted' | 'isArchived'>) => void;
  updateTask: (taskId: string, patch: Partial<TaskItem>) => void;
  archiveTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteTask: (taskId: string) => void;
  addEvent: (evt: Omit<CalendarEventItem, 'id'>) => void;
  updateEvent: (eventId: string, patch: Partial<CalendarEventItem>) => void;
  deleteEvent: (eventId: string) => void;
  addProject: (prj: Omit<ProjectItem, 'id' | 'createdAt' | 'isArchived'>) => void;
  archiveProject: (projectId: string) => void;
  toggleProjectMilestone: (projectId: string, milestoneId: string) => void;
  recordFocusSession: (label: string, minutes: number, taskId?: string) => void;
  // Finance actions
  setActivePeriodKey: (periodKey: string) => void;
  addTransaction: (tx: Omit<FinancialTransaction, 'id' | 'createdAt' | 'periodKey'>) => void;
  updateTransaction: (txId: string, patch: Partial<FinancialTransaction>) => void;
  deleteTransaction: (txId: string) => void;
  addCategory: (cat: Omit<TransactionCategory, 'id' | 'sortOrder' | 'isArchived'>) => void;
  updateCategory: (categoryId: string, patch: Partial<TransactionCategory>) => void;
  updateCategoryBudget: (categoryId: string, periodKey: string, allocatedMinor: number) => void;
  archiveCategory: (categoryId: string) => void;
  addAccount: (acc: Omit<FinancialAccount, 'id' | 'isArchived'>) => void;
  updateAccount: (accountId: string, patch: Partial<FinancialAccount>) => void;
  archiveAccount: (accountId: string) => void;
  reconcileAccount: (accountId: string, actualCountedMinor: number) => void;
  confirmMonthlyRollover: (
    fromPeriodKey: string,
    toPeriodKey: string,
    decisions: CategoryCarryoverInput[]
  ) => MonthlyClosingReview;
  addIncomeSource: (src: Omit<IncomeSource, 'id' | 'isActive'>) => void;
  deleteIncomeSource: (id: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  contributeToSavingsGoal: (goalId: string, amountMinor: number) => void;
  addDebtRecord: (debt: Omit<DebtRecord, 'id'>) => void;
  payDebtInstallment: (debtId: string, amountMinor: number, accountId: string, dateISO: string) => void;
  // Wellbeing, Goals, Notes
  toggleHabitDate: (habitId: string, dateISO: string) => void;
  addHabit: (title: string, category: string, color: string, frequency?: 'daily' | 'weekly') => void;
  updateHabit: (habitId: string, patch: Partial<HabitItem>) => void;
  deleteHabit: (habitId: string) => void;
  updateWellnessToday: (patch: Partial<WellnessLog>) => void;
  addGoal: (goal: Omit<GoalItem, 'id' | 'isCompleted'>) => void;
  updateGoal: (goalId: string, patch: Partial<GoalItem>) => void;
  deleteGoal: (goalId: string) => void;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  saveNote: (note: Omit<NoteItem, 'id' | 'updatedAt'> & { id?: string }) => void;
  toggleNotePin: (noteId: string) => void;
  toggleNoteFavorite: (noteId: string) => void;
  deleteNote: (noteId: string) => void;
  // Deen actions
  updatePrayerSettings: (patch: Partial<PrayerSettings>) => void;
  togglePrayerCompleted: (dateISO: string, prayer: PrayerName) => void;
  incrementDhikr: (dhikrId: string, targetCount: number) => void;
  resetDhikrCategory: (category: 'morning' | 'evening' | 'after_prayer') => void;
  saveQuranBookmark: (bm: Omit<QuranBookmark, 'id' | 'createdAt'>) => void;
  deleteQuranBookmark: (bookmarkId: string) => void;
  updateQuranGoalProgress: (
    completedDelta: number,
    newDailyTarget?: number,
    unitType?: 'pages' | 'verses' | 'juz' | 'surah'
  ) => void;
  // News & Notifications & System
  toggleSaveArticle: (article: NewsArticleItem) => void;
  recordArticleRead: (url: string) => void;
  markNotificationRead: (id: string) => void;
  resetToFactoryDemo: () => void;
}

const LifeOSContext = createContext<LifeOSContextValue | null>(null);

export function LifeOSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LifeOSState>(() => createInitialLifeOSState());
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [hydrated, setHydrated] = useState(false);
  const [prayerSchedule, setPrayerSchedule] = useState<PrayerScheduleData | null>(null);

  // Hydrate from local storage / IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    async function loadPersisted() {
      try {
        const localRaw = window.localStorage.getItem(STORAGE_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw) as LifeOSState;
          if (!cancelled && parsed?.profile) {
            setState(parsed);
            setHydrated(true);
            return;
          }
        }
        const idbData = await idbGet<LifeOSState>(STORAGE_KEY);
        if (!cancelled && idbData?.profile) {
          setState(idbData);
        }
      } catch {
        // Use initial state safely
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    loadPersisted();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply theme attribute to document root
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', state.preferences.theme);
      document.documentElement.setAttribute('dir', state.profile.locale === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', state.profile.locale);
    }
  }, [state.preferences.theme, state.profile.locale]);

  // Persist to LocalStorage + IndexedDB whenever state updates after hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      idbSet(STORAGE_KEY, state).catch(() => {});
    } catch {
      // Storage quota safe fallback
    }
  }, [state, hydrated]);

  // Fetch prayer times from our server route (/api/prayer)
  const refreshPrayerSchedule = async () => {
    try {
      const { city, country, calculationMethod, asrSchool, hijriAdjustment } =
        state.prayerSettings;
      const res = await fetch(
        `/api/prayer?city=${encodeURIComponent(city)}&country=${encodeURIComponent(
          country
        )}&method=${calculationMethod}&school=${asrSchool}&adjustment=${hijriAdjustment}`
      );
      if (res.ok) {
        const data = (await res.json()) as PrayerScheduleData;
        setPrayerSchedule(data);
      }
    } catch {
      // Retain existing schedule
    }
  };

  useEffect(() => {
    refreshPrayerSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.prayerSettings.city,
    state.prayerSettings.country,
    state.prayerSettings.calculationMethod,
    state.prayerSettings.asrSchool,
    state.prayerSettings.hijriAdjustment,
  ]);

  const prevPeriodKey = useMemo(
    () => getPrevPeriodKey(state.activePeriodKey),
    [state.activePeriodKey]
  );

  const currentPeriodSummary = useMemo(
    () =>
      computePeriodSummary({
        periodKey: state.activePeriodKey,
        accounts: state.accounts,
        categories: state.categories,
        allocations: state.allocations,
        transactions: state.transactions,
      }),
    [
      state.activePeriodKey,
      state.accounts,
      state.categories,
      state.allocations,
      state.transactions,
    ]
  );

  const previousPeriodSummary = useMemo(
    () =>
      computePeriodSummary({
        periodKey: prevPeriodKey,
        accounts: state.accounts,
        categories: state.categories,
        allocations: state.allocations,
        transactions: state.transactions,
      }),
    [prevPeriodKey, state.accounts, state.categories, state.allocations, state.transactions]
  );

  const isPrevMonthClosed = useMemo(
    () => state.closingReviews.some((r) => r.fromPeriodKey === prevPeriodKey),
    [state.closingReviews, prevPeriodKey]
  );

  // Actions
  const setTheme = (theme: ThemeId) => {
    setState((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, theme },
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const updateProfile = (patch: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const updatePreferences = (patch: Partial<UserPreferences>) => {
    setState((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...patch },
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const updateNotificationSettings = (patch: Partial<NotificationSettings>) => {
    setState((prev) => ({
      ...prev,
      notificationSettings: { ...prev.notificationSettings, ...patch },
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const addTask = (
    task: Omit<TaskItem, 'id' | 'createdAt' | 'isCompleted' | 'isArchived'>
  ) => {
    const newTask: TaskItem = {
      ...task,
      id: `tsk_${Date.now()}`,
      isCompleted: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const updateTask = (taskId: string, patch: Partial<TaskItem>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const archiveTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, isArchived: !t.isArchived } : t)),
    }));
  };

  const toggleTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              isCompleted: !t.isCompleted,
              completedAt: !t.isCompleted ? new Date().toISOString() : null,
            }
          : t
      ),
      lastSyncedAt: new Date().toISOString(),
    }));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
              ),
            }
          : t
      ),
    }));
  };

  const addSubtask = (taskId: string, title: string) => {
    if (!title.trim()) return;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                { id: `sub_${Date.now()}`, title: title.trim(), isCompleted: false },
              ],
            }
          : t
      ),
    }));
  };

  const deleteTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const addEvent = (evt: Omit<CalendarEventItem, 'id'>) => {
    const newEvt: CalendarEventItem = {
      ...evt,
      id: `evt_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      events: [...prev.events, newEvt],
    }));
  };

  const updateEvent = (eventId: string, patch: Partial<CalendarEventItem>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
    }));
  };

  const deleteEvent = (eventId: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));
  };

  const addProject = (prj: Omit<ProjectItem, 'id' | 'createdAt' | 'isArchived'>) => {
    const newPrj: ProjectItem = {
      ...prj,
      id: `prj_${Date.now()}`,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      projects: [newPrj, ...prev.projects],
    }));
  };

  const archiveProject = (projectId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId ? { ...p, isArchived: !p.isArchived } : p
      ),
    }));
  };

  const toggleProjectMilestone = (projectId: string, milestoneId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones.map((m) =>
                m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
              ),
            }
          : p
      ),
    }));
  };

  const recordFocusSession = (label: string, minutes: number, taskId?: string) => {
    const session: FocusSessionRecord = {
      id: `fcs_${Date.now()}`,
      taskId: taskId || null,
      label,
      durationMinutes: minutes,
      completedMinutes: minutes,
      status: 'completed',
      startedAt: new Date(Date.now() - minutes * 60000).toISOString(),
      endedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      focusSessions: [session, ...prev.focusSessions],
    }));
  };

  const setActivePeriodKey = (periodKey: string) => {
    setState((prev) => ({ ...prev, activePeriodKey: periodKey }));
  };

  const addTransaction = (
    tx: Omit<FinancialTransaction, 'id' | 'createdAt' | 'periodKey'>
  ) => {
    const periodKey = tx.date.slice(0, 7);
    const idempotencyKey =
      tx.idempotencyKey ||
      `tx_${tx.type}_${tx.accountId}_${tx.amountMinor}_${tx.date}_${tx.description.trim()}`;

    setState((prev) => {
      // Idempotency guard: prevent accidental double-click duplicate submission within 3 seconds
      const recentDuplicate = prev.transactions.find(
        (existing) =>
          existing.idempotencyKey === idempotencyKey &&
          Date.now() - new Date(existing.createdAt).getTime() < 3000
      );
      if (recentDuplicate) return prev;

      const newTx: FinancialTransaction = {
        ...tx,
        id: `tx_${Date.now()}`,
        periodKey,
        amountMinor: Math.trunc(tx.amountMinor),
        idempotencyKey,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        lastSyncedAt: new Date().toISOString(),
      };
    });
  };

  const updateTransaction = (txId: string, patch: Partial<FinancialTransaction>) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => {
        if (t.id !== txId) return t;
        const updatedDate = patch.date ?? t.date;
        return {
          ...t,
          ...patch,
          date: updatedDate,
          periodKey: updatedDate.slice(0, 7),
        };
      }),
    }));
  };

  const deleteTransaction = (txId: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== txId),
    }));
  };

  const addCategory = (
    cat: Omit<TransactionCategory, 'id' | 'sortOrder' | 'isArchived'>
  ) => {
    const newCat: TransactionCategory = {
      ...cat,
      id: `cat_${Date.now()}`,
      sortOrder: state.categories.length + 1,
      isArchived: false,
    };
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
      allocations: [
        ...prev.allocations,
        {
          id: `al_${prev.activePeriodKey}_${newCat.id}`,
          periodKey: prev.activePeriodKey,
          categoryId: newCat.id,
          allocatedMinor: newCat.defaultMonthlyBudgetMinor,
          carryoverMinor: 0,
        },
      ],
    }));
  };

  const updateCategory = (categoryId: string, patch: Partial<TransactionCategory>) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === categoryId ? { ...c, ...patch } : c)),
    }));
  };

  const updateCategoryBudget = (
    categoryId: string,
    periodKey: string,
    allocatedMinor: number
  ) => {
    const cleanMinor = Math.max(0, Math.trunc(allocatedMinor));
    setState((prev) => {
      const idx = prev.allocations.findIndex(
        (a) => a.periodKey === periodKey && a.categoryId === categoryId
      );
      const nextAllocs = [...prev.allocations];
      if (idx >= 0) {
        nextAllocs[idx] = { ...nextAllocs[idx], allocatedMinor: cleanMinor };
      } else {
        nextAllocs.push({
          id: `al_${periodKey}_${categoryId}`,
          periodKey,
          categoryId,
          allocatedMinor: cleanMinor,
          carryoverMinor: 0,
        });
      }
      return {
        ...prev,
        allocations: nextAllocs,
      };
    });
  };

  const archiveCategory = (categoryId: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId ? { ...c, isArchived: true } : c
      ),
    }));
  };

  const addAccount = (acc: Omit<FinancialAccount, 'id' | 'isArchived'>) => {
    const newAcc: FinancialAccount = {
      ...acc,
      id: `acc_${Date.now()}`,
      isArchived: false,
    };
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAcc],
    }));
  };

  const updateAccount = (accountId: string, patch: Partial<FinancialAccount>) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === accountId ? { ...a, ...patch } : a)),
    }));
  };

  const archiveAccount = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === accountId ? { ...a, isArchived: !a.isArchived } : a
      ),
    }));
  };

  const reconcileAccount = (accountId: string, actualCountedMinor: number) => {
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account) return;
    const { adjustmentTransaction } = reconcileAccountBalance({
      account,
      transactions: state.transactions,
      actualCountedMinor,
      date: getTodayISO(),
    });
    if (adjustmentTransaction) {
      setState((prev) => ({
        ...prev,
        transactions: [adjustmentTransaction, ...prev.transactions],
      }));
    }
  };

  const confirmMonthlyRollover = (
    fromPeriodKey: string,
    toPeriodKey: string,
    decisions: CategoryCarryoverInput[]
  ): MonthlyClosingReview => {
    const result = executeMonthlyClosingCarryover({
      fromPeriodKey,
      toPeriodKey,
      accounts: state.accounts,
      categories: state.categories,
      allocations: state.allocations,
      transactions: state.transactions,
      existingReviews: state.closingReviews,
      decisionsInput: decisions,
      explicitUserConfirmed: true,
    });

    setState((prev) => ({
      ...prev,
      allocations: result.updatedAllocations,
      closingReviews: [result.review, ...prev.closingReviews],
      notifications: prev.notifications.map((n) =>
        n.category === 'closing' ? { ...n, isRead: true } : n
      ),
      lastSyncedAt: new Date().toISOString(),
    }));

    return result.review;
  };

  const addIncomeSource = (src: Omit<IncomeSource, 'id' | 'isActive'>) => {
    const newSrc: IncomeSource = {
      ...src,
      id: `inc_${Date.now()}`,
      isActive: true,
    };
    setState((prev) => ({
      ...prev,
      incomeSources: [...prev.incomeSources, newSrc],
    }));
  };

  const deleteIncomeSource = (id: string) => {
    setState((prev) => ({
      ...prev,
      incomeSources: prev.incomeSources.filter((s) => s.id !== id),
    }));
  };

  const addSavingsGoal = (goal: Omit<SavingsGoal, 'id'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `sav_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      savingsGoals: [...prev.savingsGoals, newGoal],
    }));
  };

  const contributeToSavingsGoal = (goalId: string, amountMinor: number) => {
    const clean = Math.max(0, Math.trunc(amountMinor));
    if (clean <= 0) return;
    setState((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((g) =>
        g.id === goalId
          ? { ...g, currentAmountMinor: Math.min(g.targetAmountMinor * 2, g.currentAmountMinor + clean) }
          : g
      ),
    }));
  };

  const addDebtRecord = (debt: Omit<DebtRecord, 'id'>) => {
    const newDebt: DebtRecord = {
      ...debt,
      id: `debt_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      debts: [...prev.debts, newDebt],
    }));
  };

  const payDebtInstallment = (
    debtId: string,
    amountMinor: number,
    accountId: string,
    dateISO: string
  ) => {
    const clean = Math.max(0, Math.trunc(amountMinor));
    if (clean <= 0) return;
    const debt = state.debts.find((d) => d.id === debtId);
    if (!debt) return;

    addTransaction({
      type: debt.direction === 'owed_by_me' ? 'expense' : 'income',
      amountMinor: clean,
      accountId,
      categoryId: null,
      date: dateISO,
      description: `سداد قسط: ${debt.title}`,
      notes: `الجهة: ${debt.counterparty}`,
      isRecurring: false,
    });

    setState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) =>
        d.id === debtId
          ? { ...d, remainingAmountMinor: Math.max(0, d.remainingAmountMinor - clean) }
          : d
      ),
    }));
  };

  const toggleHabitDate = (habitId: string, dateISO: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.completedDates.includes(dateISO);
        return {
          ...h,
          completedDates: exists
            ? h.completedDates.filter((d) => d !== dateISO)
            : [...h.completedDates, dateISO],
        };
      }),
    }));
  };

  const addHabit = (
    title: string,
    category: string,
    color: string,
    frequency: 'daily' | 'weekly' = 'daily'
  ) => {
    const newHabit: HabitItem = {
      id: `hab_${Date.now()}`,
      title,
      category,
      frequency,
      targetPerPeriod: frequency === 'weekly' ? 4 : 1,
      color,
      icon: 'Sparkles',
      completedDates: [],
      isArchived: false,
    };
    setState((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }));
  };

  const updateHabit = (habitId: string, patch: Partial<HabitItem>) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === habitId ? { ...h, ...patch } : h)),
    }));
  };

  const deleteHabit = (habitId: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
  };

  const updateWellnessToday = (patch: Partial<WellnessLog>) => {
    const today = getTodayISO();
    setState((prev) => {
      const existing = prev.wellnessLogs[today] || {
        date: today,
        waterCups: 0,
        waterTargetCups: 8,
        sleepHours: 7,
        exerciseMinutes: 0,
        activityType: '',
        mood: 4 as const,
        moodLabel: 'متوازن',
        notes: '',
      };
      return {
        ...prev,
        wellnessLogs: {
          ...prev.wellnessLogs,
          [today]: { ...existing, ...patch },
        },
      };
    });
  };

  const addGoal = (goal: Omit<GoalItem, 'id' | 'isCompleted'>) => {
    const newGoal: GoalItem = {
      ...goal,
      id: `gol_${Date.now()}`,
      isCompleted: false,
    };
    setState((prev) => ({
      ...prev,
      goals: [newGoal, ...prev.goals],
    }));
  };

  const updateGoal = (goalId: string, patch: Partial<GoalItem>) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
    }));
  };

  const deleteGoal = (goalId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
  };

  const toggleGoalMilestone = (goalId: string, milestoneId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => {
        if (g.id !== goalId) return g;
        const nextMs = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
        );
        const allDone = nextMs.length > 0 && nextMs.every((m) => m.isCompleted);
        return {
          ...g,
          milestones: nextMs,
          isCompleted: allDone,
        };
      }),
    }));
  };

  const saveNote = (noteInput: Omit<NoteItem, 'id' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    setState((prev) => {
      if (noteInput.id) {
        return {
          ...prev,
          notes: prev.notes.map((n) =>
            n.id === noteInput.id ? { ...noteInput, id: n.id, updatedAt: now } : n
          ),
        };
      }
      const created: NoteItem = {
        ...noteInput,
        id: `not_${Date.now()}`,
        updatedAt: now,
      };
      return {
        ...prev,
        notes: [created, ...prev.notes],
      };
    });
  };

  const toggleNotePin = (noteId: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n)),
    }));
  };

  const toggleNoteFavorite = (noteId: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n
      ),
    }));
  };

  const deleteNote = (noteId: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  };

  const updatePrayerSettings = (patch: Partial<PrayerSettings>) => {
    setState((prev) => ({
      ...prev,
      prayerSettings: { ...prev.prayerSettings, ...patch },
    }));
  };

  const togglePrayerCompleted = (dateISO: string, prayer: PrayerName) => {
    setState((prev) => {
      const dayRecord = prev.prayerTracking[dateISO] || {
        Fajr: false,
        Sunrise: false,
        Dhuhr: false,
        Asr: false,
        Maghrib: false,
        Isha: false,
      };
      return {
        ...prev,
        prayerTracking: {
          ...prev.prayerTracking,
          [dateISO]: {
            ...dayRecord,
            [prayer]: !dayRecord[prayer],
          },
        },
      };
    });
  };

  const incrementDhikr = (dhikrId: string, targetCount: number) => {
    const today = getTodayISO();
    setState((prev) => {
      const todayMap = prev.adhkarProgress[today] || {};
      const current = todayMap[dhikrId] || 0;
      const next = current >= targetCount ? 0 : current + 1;
      return {
        ...prev,
        adhkarProgress: {
          ...prev.adhkarProgress,
          [today]: {
            ...todayMap,
            [dhikrId]: next,
          },
        },
      };
    });
  };

  const resetDhikrCategory = (category: 'morning' | 'evening' | 'after_prayer') => {
    const today = getTodayISO();
    const idsInCategory = new Set(
      VERIFIED_ADHKAR_DATASET.filter((d) => d.category === category).map((d) => d.id)
    );
    setState((prev) => {
      const todayMap = { ...(prev.adhkarProgress[today] || {}) };
      for (const id of idsInCategory) {
        delete todayMap[id];
      }
      return {
        ...prev,
        adhkarProgress: {
          ...prev.adhkarProgress,
          [today]: todayMap,
        },
      };
    });
  };

  const saveQuranBookmark = (bm: Omit<QuranBookmark, 'id' | 'createdAt'>) => {
    const created: QuranBookmark = {
      ...bm,
      id: `qbm_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      quranBookmarks: [
        created,
        ...prev.quranBookmarks.map((b) =>
          bm.isLastRead ? { ...b, isLastRead: false } : b
        ),
      ],
      quranGoal: bm.isLastRead
        ? {
            ...prev.quranGoal,
            currentSurah: bm.surahNumber,
            currentAyah: bm.ayahNumber,
            currentPage: bm.pageNumber,
          }
        : prev.quranGoal,
    }));
  };

  const deleteQuranBookmark = (bookmarkId: string) => {
    setState((prev) => ({
      ...prev,
      quranBookmarks: prev.quranBookmarks.filter((b) => b.id !== bookmarkId),
    }));
  };

  const updateQuranGoalProgress = (
    completedDelta: number,
    newDailyTarget?: number,
    unitType?: 'pages' | 'verses' | 'juz' | 'surah'
  ) => {
    setState((prev) => ({
      ...prev,
      quranGoal: {
        ...prev.quranGoal,
        unitType: unitType ?? prev.quranGoal.unitType,
        dailyTarget: newDailyTarget ?? prev.quranGoal.dailyTarget,
        completedToday: Math.max(0, prev.quranGoal.completedToday + completedDelta),
      },
    }));
  };

  const toggleSaveArticle = (article: NewsArticleItem) => {
    setState((prev) => {
      const exists = prev.savedArticles.some((a) => a.url === article.url);
      return {
        ...prev,
        savedArticles: exists
          ? prev.savedArticles.filter((a) => a.url !== article.url)
          : [article, ...prev.savedArticles],
      };
    });
  };

  const recordArticleRead = (url: string) => {
    setState((prev) => ({
      ...prev,
      readArticleUrls: prev.readArticleUrls.includes(url)
        ? prev.readArticleUrls
        : [url, ...prev.readArticleUrls],
    }));
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  };

  const resetToFactoryDemo = () => {
    const fresh = createInitialLifeOSState();
    setState(fresh);
  };

  return (
    <LifeOSContext.Provider
      value={{
        state,
        activeTab,
        setActiveTab,
        prayerSchedule,
        refreshPrayerSchedule,
        currentPeriodSummary,
        previousPeriodSummary,
        prevPeriodKey,
        isPrevMonthClosed,
        setTheme,
        updateProfile,
        updatePreferences,
        updateNotificationSettings,
        addTask,
        updateTask,
        archiveTask,
        toggleTask,
        toggleSubtask,
        addSubtask,
        deleteTask,
        addEvent,
        updateEvent,
        deleteEvent,
        addProject,
        archiveProject,
        toggleProjectMilestone,
        recordFocusSession,
        setActivePeriodKey,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        updateCategoryBudget,
        archiveCategory,
        addAccount,
        updateAccount,
        archiveAccount,
        reconcileAccount,
        confirmMonthlyRollover,
        addIncomeSource,
        deleteIncomeSource,
        addSavingsGoal,
        contributeToSavingsGoal,
        addDebtRecord,
        payDebtInstallment,
        toggleHabitDate,
        addHabit,
        updateHabit,
        deleteHabit,
        updateWellnessToday,
        addGoal,
        updateGoal,
        deleteGoal,
        toggleGoalMilestone,
        saveNote,
        toggleNotePin,
        toggleNoteFavorite,
        deleteNote,
        updatePrayerSettings,
        togglePrayerCompleted,
        incrementDhikr,
        resetDhikrCategory,
        saveQuranBookmark,
        deleteQuranBookmark,
        updateQuranGoalProgress,
        toggleSaveArticle,
        recordArticleRead,
        markNotificationRead,
        resetToFactoryDemo,
      }}
    >
      {children}
    </LifeOSContext.Provider>
  );
}

export function useLifeOS() {
  const ctx = useContext(LifeOSContext);
  if (!ctx) {
    throw new Error('useLifeOS must be used inside LifeOSProvider');
  }
  return ctx;
}
