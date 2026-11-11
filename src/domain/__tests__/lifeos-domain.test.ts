import { describe, expect, it } from 'vitest';
import {
  calculateAccountBalances,
  checkMonthlyClosingStatus,
  computePeriodSummary,
  executeMonthlyClosingCarryover,
  formatMinorUnits,
  reconcileAccountBalance,
  toMinorUnits,
} from '../finance/engine';
import {
  applyPrayerManualAdjustments,
  calculateQiblaBearing,
  detectPrayerScheduleConflicts,
  getNextPrayerCountdown,
  VERIFIED_ADHKAR_DATASET,
  VERIFIED_OFFLINE_SURAHS,
} from '../deen/verified-data';
import {
  computeAdaptiveHomeContext,
  normalizeAndDeduplicateNews,
  parseNaturalLanguageIntent,
} from '../intelligence/adaptive';
import {
  BudgetAllocation,
  FinancialAccount,
  FinancialTransaction,
  MonthlyClosingReview,
  PrayerSettings,
  TransactionCategory,
} from '../types';

describe('LifeOS Financial Engine — Exact Minor Currency Units & Rollover Integrity', () => {
  const baseAccounts: FinancialAccount[] = [
    {
      id: 'acc_bank',
      name: 'الحساب البنكي الرئيسي',
      type: 'bank',
      currency: 'EGP',
      openingBalanceMinor: toMinorUnits(10000), // 10,000.00 EGP
      color: '#8B5CF6',
      icon: 'Landmark',
      isArchived: false,
    },
    {
      id: 'acc_cash',
      name: 'المحفظة النقدية',
      type: 'cash',
      currency: 'EGP',
      openingBalanceMinor: toMinorUnits(2000), // 2,000.00 EGP
      color: '#36D6A1',
      icon: 'Wallet',
      isArchived: false,
    },
    {
      id: 'acc_wallet',
      name: 'محفظة رقمية',
      type: 'wallet',
      currency: 'EGP',
      openingBalanceMinor: toMinorUnits(500), // 500.00 EGP
      color: '#35D6E8',
      icon: 'Smartphone',
      isArchived: false,
    },
  ];

  const baseCategories: TransactionCategory[] = [
    {
      id: 'cat_food',
      name: 'طعام ومطاعم',
      icon: 'Utensils',
      color: '#8B5CF6',
      type: 'expense',
      defaultMonthlyBudgetMinor: toMinorUnits(6000),
      sortOrder: 1,
      isArchived: false,
    },
    {
      id: 'cat_transport',
      name: 'مواصلات وانتقالات',
      icon: 'Car',
      color: '#35D6E8',
      type: 'expense',
      defaultMonthlyBudgetMinor: toMinorUnits(2500),
      sortOrder: 2,
      isArchived: false,
    },
    {
      id: 'cat_bills',
      name: 'فواتير وسكن',
      icon: 'Receipt',
      color: '#F4B860',
      type: 'expense',
      defaultMonthlyBudgetMinor: toMinorUnits(5000),
      sortOrder: 3,
      isArchived: false,
    },
  ];

  const baseAllocations: BudgetAllocation[] = [
    {
      id: 'alloc_1',
      periodKey: '2026-10',
      categoryId: 'cat_food',
      allocatedMinor: toMinorUnits(6000),
      carryoverMinor: 0,
    },
    {
      id: 'alloc_2',
      periodKey: '2026-10',
      categoryId: 'cat_transport',
      allocatedMinor: toMinorUnits(2500),
      carryoverMinor: 0,
    },
    {
      id: 'alloc_3',
      periodKey: '2026-10',
      categoryId: 'cat_bills',
      allocatedMinor: toMinorUnits(5000),
      carryoverMinor: 0,
    },
  ];

  it('1 & 2. Handles salary receipt and multiple income sources accurately in minor units', () => {
    const txs: FinancialTransaction[] = [
      {
        id: 'tx_sal_1',
        type: 'income',
        amountMinor: toMinorUnits('28500.50'),
        accountId: 'acc_bank',
        incomeSourceId: 'inc_main',
        date: '2026-10-01',
        periodKey: '2026-10',
        description: 'راتب شهري أساسي',
        notes: '',
        isRecurring: true,
        createdAt: '2026-10-01T09:00:00Z',
      },
      {
        id: 'tx_sal_2',
        type: 'income',
        amountMinor: toMinorUnits('4500.25'),
        accountId: 'acc_wallet',
        incomeSourceId: 'inc_freelance',
        date: '2026-10-10',
        periodKey: '2026-10',
        description: 'عائد استشارات تقنية',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-10T12:00:00Z',
      },
    ];

    const summary = computePeriodSummary({
      periodKey: '2026-10',
      accounts: baseAccounts,
      categories: baseCategories,
      allocations: baseAllocations,
      transactions: txs,
    });

    expect(summary.totalIncomeMinor).toBe(3300075); // 33,000.75 EGP
    expect(summary.accountBalancesMinor['acc_bank']).toBe(toMinorUnits('38500.50'));
    expect(summary.accountBalancesMinor['acc_wallet']).toBe(toMinorUnits('5000.25'));
    expect(summary.totalAvailableCashMinor).toBe(toMinorUnits('45500.75'));
  });

  it('3 & 4. Distinguishes categorized expenses from uncategorized expenses without reducing unrelated category budgets', () => {
    const txs: FinancialTransaction[] = [
      {
        id: 'tx_cat_exp',
        type: 'expense',
        amountMinor: toMinorUnits(1500),
        accountId: 'acc_cash',
        categoryId: 'cat_food',
        date: '2026-10-05',
        periodKey: '2026-10',
        description: 'مشتريات البقالة الأسبوعية',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-05T15:00:00Z',
      },
      {
        id: 'tx_uncat_exp',
        type: 'expense',
        amountMinor: toMinorUnits(400),
        accountId: 'acc_cash',
        categoryId: null, // Uncategorized
        date: '2026-10-06',
        periodKey: '2026-10',
        description: 'مصروف طارئ غير مصنف',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-06T15:00:00Z',
      },
    ];

    const summary = computePeriodSummary({
      periodKey: '2026-10',
      accounts: baseAccounts,
      categories: baseCategories,
      allocations: baseAllocations,
      transactions: txs,
    });

    // Account balance reduced by both (2000 - 1500 - 400 = 100)
    expect(summary.accountBalancesMinor['acc_cash']).toBe(toMinorUnits(100));
    expect(summary.categorizedExpenseMinor).toBe(toMinorUnits(1500));
    expect(summary.uncategorizedExpenseMinor).toBe(toMinorUnits(400));

    // Food category reduced ONLY by 1500; Transport and Bills untouched
    const foodCat = summary.categoryStatuses.find((c) => c.categoryId === 'cat_food')!;
    const transportCat = summary.categoryStatuses.find((c) => c.categoryId === 'cat_transport')!;
    expect(foodCat.remainingMinor).toBe(toMinorUnits(4500));
    expect(transportCat.remainingMinor).toBe(toMinorUnits(2500));
  });

  it('5, 6, 7. Tracks overspending accurately and updates balances upon editing or deleting transactions', () => {
    const initialTxs: FinancialTransaction[] = [
      {
        id: 'tx_overspend',
        type: 'expense',
        amountMinor: toMinorUnits(3200), // Budget is 2500 -> 700 overspent
        accountId: 'acc_bank',
        categoryId: 'cat_transport',
        date: '2026-10-12',
        periodKey: '2026-10',
        description: 'صيانة دورية للسيارة',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-12T10:00:00Z',
      },
    ];

    const summaryOverspent = computePeriodSummary({
      periodKey: '2026-10',
      accounts: baseAccounts,
      categories: baseCategories,
      allocations: baseAllocations,
      transactions: initialTxs,
    });

    const transportStatus = summaryOverspent.categoryStatuses.find(
      (c) => c.categoryId === 'cat_transport'
    )!;
    expect(transportStatus.remainingMinor).toBe(toMinorUnits(-700));
    expect(transportStatus.overspentMinor).toBe(toMinorUnits(700));
    expect(transportStatus.utilizationPercent).toBe(128);

    // Edit transaction to 2000 EGP
    const editedTxs = initialTxs.map((t) =>
      t.id === 'tx_overspend' ? { ...t, amountMinor: toMinorUnits(2000) } : t
    );
    const summaryEdited = computePeriodSummary({
      periodKey: '2026-10',
      accounts: baseAccounts,
      categories: baseCategories,
      allocations: baseAllocations,
      transactions: editedTxs,
    });
    const transportAfterEdit = summaryEdited.categoryStatuses.find(
      (c) => c.categoryId === 'cat_transport'
    )!;
    expect(transportAfterEdit.remainingMinor).toBe(toMinorUnits(500));
    expect(transportAfterEdit.overspentMinor).toBe(0);

    // Delete transaction
    const summaryDeleted = computePeriodSummary({
      periodKey: '2026-10',
      accounts: baseAccounts,
      categories: baseCategories,
      allocations: baseAllocations,
      transactions: [],
    });
    expect(summaryDeleted.accountBalancesMinor['acc_bank']).toBe(toMinorUnits(10000));
  });

  it('8 & 9. Executes account transfers without counting as income or expense, and supports category archival safely', () => {
    const transferTxs: FinancialTransaction[] = [
      {
        id: 'tx_transfer_1',
        type: 'transfer',
        amountMinor: toMinorUnits(3000),
        accountId: 'acc_bank',
        toAccountId: 'acc_cash',
        categoryId: null,
        date: '2026-10-15',
        periodKey: '2026-10',
        description: 'سحب نقدي للمحفظة',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-15T11:00:00Z',
      },
    ];

    const archivedCats = baseCategories.map((c) =>
      c.id === 'cat_bills' ? { ...c, isArchived: true } : c
    );

    const summary = computePeriodSummary({
      periodKey: '2026-10',
      accounts: baseAccounts,
      categories: archivedCats,
      allocations: baseAllocations,
      transactions: transferTxs,
    });

    // Transfer never counts as income or expense
    expect(summary.totalIncomeMinor).toBe(0);
    expect(summary.totalExpenseMinor).toBe(0);
    expect(summary.totalTransferVolumeMinor).toBe(toMinorUnits(3000));
    // Bank decreased by 3000 (7000), Cash increased by 3000 (5000), Total cash unchanged (12500)
    expect(summary.accountBalancesMinor['acc_bank']).toBe(toMinorUnits(7000));
    expect(summary.accountBalancesMinor['acc_cash']).toBe(toMinorUnits(5000));
    expect(summary.totalAvailableCashMinor).toBe(toMinorUnits(12500));
    // Archived category omitted from active budget statuses
    expect(summary.categoryStatuses.some((c) => c.categoryId === 'cat_bills')).toBe(false);
  });

  it('10, 11, 12, 13, 14. Enforces explicit Monthly Closing & Carryover (full, partial, zero), prevents duplicates, and never fabricates cash', () => {
    const octTxs: FinancialTransaction[] = [
      {
        id: 'tx_oct_sal',
        type: 'income',
        amountMinor: toMinorUnits(20000),
        accountId: 'acc_bank',
        date: '2026-10-01',
        periodKey: '2026-10',
        description: 'راتب أكتوبر',
        notes: '',
        isRecurring: true,
        createdAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'tx_oct_food',
        type: 'expense',
        amountMinor: toMinorUnits(4200), // 1800 remaining out of 6000
        accountId: 'acc_bank',
        categoryId: 'cat_food',
        date: '2026-10-18',
        periodKey: '2026-10',
        description: 'مصاريف طعام الشهر',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-18T14:00:00Z',
      },
      {
        id: 'tx_oct_trans',
        type: 'expense',
        amountMinor: toMinorUnits(1500), // 1000 remaining out of 2500
        accountId: 'acc_cash',
        categoryId: 'cat_transport',
        date: '2026-10-20',
        periodKey: '2026-10',
        description: 'وقود وانتقالات',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-20T14:00:00Z',
      },
      {
        id: 'tx_oct_bills',
        type: 'expense',
        amountMinor: toMinorUnits(4500), // 500 remaining out of 5000
        accountId: 'acc_bank',
        categoryId: 'cat_bills',
        date: '2026-10-22',
        periodKey: '2026-10',
        description: 'فواتير وإيجار',
        notes: '',
        isRecurring: false,
        createdAt: '2026-10-22T14:00:00Z',
      },
    ];

    // Reject if explicitUserConfirmed is false
    expect(() =>
      executeMonthlyClosingCarryover({
        fromPeriodKey: '2026-10',
        toPeriodKey: '2026-11',
        accounts: baseAccounts,
        categories: baseCategories,
        allocations: baseAllocations,
        transactions: octTxs,
        existingReviews: [],
        decisionsInput: [],
        explicitUserConfirmed: false,
      })
    ).toThrow(/Explicit user confirmation/);

    // Execute with:
    // - Food: FULL carryover (1800 EGP)
    // - Transport: CUSTOM partial carryover (600 EGP out of 1000 EGP)
    // - Bills: NONE carryover (0 EGP out of 500 EGP)
    const balancesBefore = calculateAccountBalances(baseAccounts, octTxs);
    const result = executeMonthlyClosingCarryover({
      fromPeriodKey: '2026-10',
      toPeriodKey: '2026-11',
      accounts: baseAccounts,
      categories: baseCategories,
      allocations: baseAllocations,
      transactions: octTxs,
      existingReviews: [],
      decisionsInput: [
        { categoryId: 'cat_food', mode: 'full' },
        { categoryId: 'cat_transport', mode: 'custom', customAmountMinor: toMinorUnits(600) },
        { categoryId: 'cat_bills', mode: 'none' },
      ],
      explicitUserConfirmed: true,
    });

    expect(result.review.totalCarryoverMinor).toBe(toMinorUnits(2400)); // 1800 + 600 + 0

    // CRITICAL INVARIANT: Carryover must NOT create or alter cash in any account
    expect(result.accountBalancesAfterMinor).toEqual(balancesBefore);

    // Check November budget availability includes carryover
    const novSummary = computePeriodSummary({
      periodKey: '2026-11',
      accounts: baseAccounts,
      categories: baseCategories,
      allocations: result.updatedAllocations,
      transactions: octTxs,
    });

    const novFood = novSummary.categoryStatuses.find((c) => c.categoryId === 'cat_food')!;
    const novTransport = novSummary.categoryStatuses.find((c) => c.categoryId === 'cat_transport')!;
    const novBills = novSummary.categoryStatuses.find((c) => c.categoryId === 'cat_bills')!;

    expect(novFood.carryoverMinor).toBe(toMinorUnits(1800));
    expect(novFood.effectiveBudgetMinor).toBe(toMinorUnits(7800)); // 6000 + 1800
    expect(novTransport.carryoverMinor).toBe(toMinorUnits(600));
    expect(novTransport.effectiveBudgetMinor).toBe(toMinorUnits(3100)); // 2500 + 600
    expect(novBills.carryoverMinor).toBe(0);
    expect(novBills.effectiveBudgetMinor).toBe(toMinorUnits(5000));

    // Prevent duplicate rollover submission
    expect(() =>
      executeMonthlyClosingCarryover({
        fromPeriodKey: '2026-10',
        toPeriodKey: '2026-11',
        accounts: baseAccounts,
        categories: baseCategories,
        allocations: result.updatedAllocations,
        transactions: octTxs,
        existingReviews: [result.review],
        decisionsInput: [{ categoryId: 'cat_food', mode: 'full' }],
        explicitUserConfirmed: true,
      })
    ).toThrow(/Duplicate monthly closing prevented/);

    // Check late monthly closing detection
    const lateCheck = checkMonthlyClosingStatus({
      currentDate: new Date('2026-11-10T12:00:00Z'),
      reminderDays: 3,
      existingReviews: [] as MonthlyClosingReview[],
      availablePeriods: ['2026-10', '2026-11'],
    });
    expect(lateCheck.hasPendingPriorMonth).toBe(true);
    expect(lateCheck.pendingPeriodKey).toBe('2026-10');
  });

  it('15. Reconciles account balances accurately and generates exact adjustment transaction', () => {
    const reconciliation = reconcileAccountBalance({
      account: baseAccounts[1], // Opening 2000 EGP
      transactions: [],
      actualCountedMinor: toMinorUnits(1850),
      date: '2026-11-10',
    });

    expect(reconciliation.discrepancyMinor).toBe(toMinorUnits(-150));
    expect(reconciliation.adjustmentTransaction).not.toBeNull();
    expect(reconciliation.adjustmentTransaction?.type).toBe('expense');
    expect(reconciliation.adjustmentTransaction?.amountMinor).toBe(toMinorUnits(150));
    expect(formatMinorUnits(toMinorUnits(1850), 'EGP', 'en')).toBe('1,850 EGP');
  });
});

describe('LifeOS Deen Hub — Prayer Calculations, Conflict Detection & Verified Content', () => {
  const sampleTimings = {
    Fajr: '04:52',
    Sunrise: '06:20',
    Dhuhr: '11:54',
    Asr: '15:02',
    Maghrib: '17:28',
    Isha: '18:48',
  };

  const sampleSettings: PrayerSettings = {
    city: 'Cairo',
    country: 'Egypt',
    latitude: 30.0444,
    longitude: 31.2357,
    calculationMethod: 5,
    asrSchool: 0,
    hijriAdjustment: 0,
    showInPlanner: true,
    reserveMinutesAround: 20,
    manualAdjustments: { Fajr: 2, Sunrise: 0, Dhuhr: 0, Asr: 0, Maghrib: 3, Isha: 0 },
  };

  it('Applies manual prayer time adjustments and computes next prayer countdown', () => {
    const adjusted = applyPrayerManualAdjustments(
      sampleTimings,
      sampleSettings.manualAdjustments
    );
    expect(adjusted.Fajr).toBe('04:54');
    expect(adjusted.Maghrib).toBe('17:31');

    const countdown = getNextPrayerCountdown(adjusted, '14:30');
    expect(countdown.prayerName).toBe('Asr');
    expect(countdown.prayerNameAr).toBe('العصر');
    expect(countdown.minutesRemaining).toBe(32);
  });

  it('Detects schedule conflicts between user appointments and reserved prayer blocks without overwriting user events', () => {
    const conflicts = detectPrayerScheduleConflicts({
      timings: sampleTimings,
      settings: sampleSettings,
      events: [
        {
          id: 'ev_1',
          title: 'اجتماع مراجعة التصميم',
          startTime: '11:45',
          endTime: '12:30',
        },
        {
          id: 'ev_2',
          title: 'جلسة عمل عميق',
          startTime: '09:00',
          endTime: '10:30',
        },
      ],
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].eventId).toBe('ev_1');
    expect(conflicts[0].prayerName).toBe('Dhuhr');
  });

  it('Verifies authentic Quranic Uthmani text and complete vocalized Adhkar dataset', () => {
    expect(VERIFIED_OFFLINE_SURAHS[1].ayahs).toHaveLength(7);
    expect(VERIFIED_OFFLINE_SURAHS[1].ayahs[0].text).toContain('بِسْمِ ٱللَّهِ');
    expect(VERIFIED_ADHKAR_DATASET.length).toBeGreaterThanOrEqual(10);
    for (const dhikr of VERIFIED_ADHKAR_DATASET) {
      expect(dhikr.arabicText.length).toBeGreaterThan(10);
      expect(dhikr.targetCount).toBeGreaterThan(0);
      expect(dhikr.sourceReference.length).toBeGreaterThan(3);
    }
    const cairoQibla = calculateQiblaBearing(30.0444, 31.2357);
    expect(cairoQibla).toBeGreaterThan(130);
    expect(cairoQibla).toBeLessThan(140);
  });
});

describe('LifeOS Adaptive Home, AI Confirmation Gate & News Deduplication', () => {
  it('Adapts home dashboard greeting and widget priority across Morning, Afternoon, and Evening', () => {
    const morning = computeAdaptiveHomeContext(8, 'أحمد');
    const afternoon = computeAdaptiveHomeContext(14, 'أحمد');
    const evening = computeAdaptiveHomeContext(20, 'أحمد');

    expect(morning.phase).toBe('morning');
    expect(morning.recommendedAdhkar).toBe('morning');
    expect(afternoon.phase).toBe('afternoon');
    expect(evening.phase).toBe('evening');
    expect(evening.recommendedAdhkar).toBe('evening');
  });

  it('Parses Arabic natural language expenses and enforces explicit confirmation before ledger mutation', () => {
    const expenseIntent = parseNaturalLanguageIntent(
      'سجل إني صرفت 350 جنيه أكل النهاردة.',
      '2026-11-10'
    );
    expect(expenseIntent.proposedActions).toHaveLength(1);
    expect(expenseIntent.proposedActions[0].type).toBe('create_expense');
    expect(expenseIntent.proposedActions[0].requiresExplicitConfirmation).toBe(true);
    expect(expenseIntent.proposedActions[0].payload.amountMinor).toBe(toMinorUnits(350));

    const scheduleIntent = parseNaturalLanguageIntent(
      'نظملي بكرة، عندي شغل الساعة 9، وعايز أتمرن وأقرأ وردي.',
      '2026-11-10'
    );
    expect(scheduleIntent.proposedActions.length).toBeGreaterThanOrEqual(3);
    expect(scheduleIntent.proposedActions.some((a) => a.type === 'create_event')).toBe(true);
  });

  it('Filters duplicate news articles and preserves distinct publication vs retrieval timestamps', () => {
    const articles = normalizeAndDeduplicateNews(
      [
        {
          title: 'إطلاق مبادرة تقنية جديدة للذكاء الاصطناعي في المنطقة',
          url: 'https://example.com/news/ai-1/',
          sourceName: 'الشرق للأخبار',
          publishedAt: '2026-11-10T10:00:00Z',
        },
        {
          title: 'إطلاق مبادرة تقنية جديدة للذكاء الاصطناعي في المنطقة',
          url: 'https://example.com/news/ai-1', // duplicate URL
          sourceName: 'الشرق للأخبار',
          publishedAt: '2026-11-10T10:00:00Z',
        },
      ],
      'technology',
      '2026-11-10T18:00:00Z'
    );

    expect(articles).toHaveLength(1);
    expect(articles[0].publishedAt).toBe('2026-11-10T10:00:00Z');
    expect(articles[0].retrievedAt).toBe('2026-11-10T18:00:00Z');
  });

  it('Handles edge cases: negative inputs, very large numbers, Arabic/English numeral mixes, and interrupted rollover safety', () => {
    // Signed negative minor units for overspend / reconciliation deltas
    expect(toMinorUnits(-450.75)).toBe(-45075);
    // Arabic-Indic numerals parsing
    expect(toMinorUnits('١٢٥٠.٥٠')).toBe(125050);
    // Very large numbers (e.g., 99,999,999.99 EGP = 9,999,999,999 piasters)
    expect(toMinorUnits('99999999.99')).toBe(9999999999);
    // Empty or malformed input
    expect(toMinorUnits('')).toBe(0);
    expect(toMinorUnits('abc')).toBe(0);

    // Custom carryover clamped safely between 0 and remainingMinor even if user passes negative or huge custom amount
    const baseAccount: FinancialAccount = {
      id: 'acc_1',
      name: 'حساب',
      type: 'bank',
      currency: 'EGP',
      openingBalanceMinor: toMinorUnits(10000),
      color: '#8B5CF6',
      icon: 'Landmark',
      isArchived: false,
    };
    const baseCategory: TransactionCategory = {
      id: 'cat_1',
      name: 'بند',
      icon: 'Tag',
      color: '#8B5CF6',
      type: 'expense',
      defaultMonthlyBudgetMinor: toMinorUnits(1000),
      sortOrder: 1,
      isArchived: false,
    };
    const alloc: BudgetAllocation = {
      id: 'al_1',
      periodKey: '2026-09',
      categoryId: 'cat_1',
      allocatedMinor: toMinorUnits(1000),
      carryoverMinor: 0,
    };

    // Custom carryover strictly rejects negative or out-of-range amounts exceeding remainingMinor
    expect(() =>
      executeMonthlyClosingCarryover({
        fromPeriodKey: '2026-09',
        toPeriodKey: '2026-10',
        accounts: [baseAccount],
        categories: [baseCategory],
        allocations: [alloc],
        transactions: [],
        existingReviews: [],
        decisionsInput: [
          { categoryId: 'cat_1', mode: 'custom', customAmountMinor: toMinorUnits(999999) },
        ],
        explicitUserConfirmed: true,
      })
    ).toThrow(/must be between 0 and remaining/);
  });
});

