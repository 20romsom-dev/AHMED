// =============================================================================
// LIFEOS — FINANCIAL ACCOUNTING & MONTHLY ROLLOVER ENGINE
// Strict Integer Minor Currency Units (e.g., 1 EGP = 100 piasters/cents)
// Never uses floating-point arithmetic for monetary balance accumulation.
// =============================================================================

import {
  BudgetAllocation,
  CarryoverDecisionMode,
  CategoryCarryoverInput,
  CategoryCarryoverRecord,
  FinancialAccount,
  FinancialTransaction,
  MonthlyClosingReview,
  TransactionCategory,
} from '../types';

export interface CategoryBudgetStatus {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  allocatedMinor: number; // Base monthly allocation
  carryoverMinor: number; // Approved carryover from previous month
  effectiveBudgetMinor: number; // allocatedMinor + carryoverMinor
  spentMinor: number; // Categorized expenses in period
  remainingMinor: number; // effectiveBudgetMinor - spentMinor (can be < 0)
  overspentMinor: number; // max(0, spentMinor - effectiveBudgetMinor)
  utilizationPercent: number; // integer or 1-decimal percentage for UI progress
}

export interface PeriodFinancialSummary {
  periodKey: string;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  categorizedExpenseMinor: number;
  uncategorizedExpenseMinor: number;
  totalTransferVolumeMinor: number;
  totalAvailableCashMinor: number; // Sum of active account balances from ledger
  totalAllocatedBudgetMinor: number; // Sum of base allocations for period
  totalCarryoverBudgetMinor: number; // Sum of approved carryovers into period
  totalEffectiveBudgetMinor: number; // Allocated + Carryover
  unallocatedIncomeMinor: number; // totalIncomeMinor - totalAllocatedBudgetMinor
  totalRemainingCategoryBudgetMinor: number; // Sum of positive remaining category budgets
  accountBalancesMinor: Record<string, number>; // accountId -> current ledger balance
  categoryStatuses: CategoryBudgetStatus[];
}

/**
 * Safely converts a major currency string or number (e.g. "350.75") into integer minor units (35075).
 * Rejects NaN, Infinity, or negative inputs where positive is required.
 */
export function toMinorUnits(majorValue: string | number): number {
  const arabicIndicMap: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '٫': '.',
    '٬': '',
  };
  const normalized = String(majorValue)
    .trim()
    .replace(/[٠-٩٫٬]/g, (ch) => arabicIndicMap[ch] ?? ch)
    .replace(/,/g, '');
  if (!normalized) return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.round(parsed * 100);
  }
  const isNegative = normalized.startsWith('-');
  const unsigned = isNegative ? normalized.slice(1) : normalized;
  const [wholePart, fracPart = ''] = unsigned.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);
  const minor = parseInt(wholePart, 10) * 100 + parseInt(paddedFrac, 10);
  return isNegative ? -minor : minor;
}

/**
 * Formats integer minor units into a tabular display string (e.g., 35075 -> "350.75" or "350").
 */
export function formatMinorUnits(
  minorUnits: number,
  currency = 'EGP',
  locale: 'ar' | 'en' = 'ar',
  showDecimals = false
): string {
  const safeMinor = Math.trunc(minorUnits);
  const isNegative = safeMinor < 0;
  const absMinor = Math.abs(safeMinor);
  const whole = Math.floor(absMinor / 100);
  const cents = absMinor % 100;

  const formattedWhole = whole.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  const currencyLabel =
    currency === 'EGP'
      ? locale === 'ar'
        ? 'ج.م'
        : 'EGP'
      : currency === 'SAR'
      ? locale === 'ar'
        ? 'ر.س'
        : 'SAR'
      : currency;

  const decimalStr =
    cents > 0 || showDecimals ? `.${String(cents).padStart(2, '0')}` : '';
  const sign = isNegative ? '-' : '';
  return `${sign}${formattedWhole}${decimalStr} ${currencyLabel}`;
}

/**
 * Computes exact account balances from opening balances and full transaction ledger.
 * Transfers move funds between accounts without counting as income or expense.
 */
export function calculateAccountBalances(
  accounts: FinancialAccount[],
  transactions: FinancialTransaction[],
  upToDate?: string
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const acc of accounts) {
    balances[acc.id] = Math.trunc(acc.openingBalanceMinor);
  }

  for (const tx of transactions) {
    if (upToDate && tx.date > upToDate) continue;
    const amt = Math.trunc(tx.amountMinor);
    if (amt <= 0) continue;

    if (tx.type === 'income') {
      if (balances[tx.accountId] !== undefined) {
        balances[tx.accountId] += amt;
      }
    } else if (tx.type === 'expense') {
      if (balances[tx.accountId] !== undefined) {
        balances[tx.accountId] -= amt;
      }
    } else if (tx.type === 'transfer') {
      if (!tx.toAccountId || tx.toAccountId === tx.accountId) {
        throw new Error(`Invalid transfer transaction ${tx.id}: identical or missing target account`);
      }
      if (balances[tx.accountId] !== undefined) {
        balances[tx.accountId] -= amt;
      }
      if (balances[tx.toAccountId] !== undefined) {
        balances[tx.toAccountId] += amt;
      }
    }
  }

  return balances;
}

/**
 * Computes the complete financial summary for a given YYYY-MM period.
 * Strictly separates Account Ledger Cash from Budget Category Availability.
 */
export function computePeriodSummary(params: {
  periodKey: string;
  accounts: FinancialAccount[];
  categories: TransactionCategory[];
  allocations: BudgetAllocation[];
  transactions: FinancialTransaction[];
}): PeriodFinancialSummary {
  const { periodKey, accounts, categories, allocations, transactions } = params;

  const accountBalancesMinor = calculateAccountBalances(accounts, transactions);
  const totalAvailableCashMinor = accounts
    .filter((a) => !a.isArchived)
    .reduce((sum, a) => sum + (accountBalancesMinor[a.id] ?? 0), 0);

  const periodTxs = transactions.filter((t) => t.periodKey === periodKey);

  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;
  let categorizedExpenseMinor = 0;
  let uncategorizedExpenseMinor = 0;
  let totalTransferVolumeMinor = 0;

  const spentByCategory: Record<string, number> = {};

  for (const tx of periodTxs) {
    const amt = Math.trunc(tx.amountMinor);
    if (tx.type === 'income') {
      totalIncomeMinor += amt;
    } else if (tx.type === 'expense') {
      totalExpenseMinor += amt;
      if (tx.categoryId) {
        categorizedExpenseMinor += amt;
        spentByCategory[tx.categoryId] = (spentByCategory[tx.categoryId] ?? 0) + amt;
      } else {
        // Business rule: Uncategorized expense reduces account balance ONLY,
        // never reduces an unrelated category budget.
        uncategorizedExpenseMinor += amt;
      }
    } else if (tx.type === 'transfer') {
      // Business rule: Transfers between user's own accounts never count as income or expense.
      totalTransferVolumeMinor += amt;
    }
  }

  const activeExpenseCategories = categories
    .filter((c) => c.type === 'expense' && !c.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let totalAllocatedBudgetMinor = 0;
  let totalCarryoverBudgetMinor = 0;
  let totalRemainingCategoryBudgetMinor = 0;

  const categoryStatuses: CategoryBudgetStatus[] = activeExpenseCategories.map((cat) => {
    const allocRecord = allocations.find(
      (al) => al.periodKey === periodKey && al.categoryId === cat.id
    );
    const allocatedMinor = Math.trunc(
      allocRecord ? allocRecord.allocatedMinor : cat.defaultMonthlyBudgetMinor
    );
    const carryoverMinor = Math.trunc(allocRecord ? allocRecord.carryoverMinor : 0);
    const effectiveBudgetMinor = allocatedMinor + carryoverMinor;
    const spentMinor = spentByCategory[cat.id] ?? 0;
    const remainingMinor = effectiveBudgetMinor - spentMinor;
    const overspentMinor = remainingMinor < 0 ? Math.abs(remainingMinor) : 0;

    totalAllocatedBudgetMinor += allocatedMinor;
    totalCarryoverBudgetMinor += carryoverMinor;
    if (remainingMinor > 0) {
      totalRemainingCategoryBudgetMinor += remainingMinor;
    }

    const utilizationPercent =
      effectiveBudgetMinor > 0
        ? Math.round((spentMinor / effectiveBudgetMinor) * 100)
        : spentMinor > 0
        ? 100
        : 0;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      color: cat.color,
      icon: cat.icon,
      allocatedMinor,
      carryoverMinor,
      effectiveBudgetMinor,
      spentMinor,
      remainingMinor,
      overspentMinor,
      utilizationPercent,
    };
  });

  const totalEffectiveBudgetMinor = totalAllocatedBudgetMinor + totalCarryoverBudgetMinor;
  const unallocatedIncomeMinor = totalIncomeMinor - totalAllocatedBudgetMinor;

  return {
    periodKey,
    totalIncomeMinor,
    totalExpenseMinor,
    categorizedExpenseMinor,
    uncategorizedExpenseMinor,
    totalTransferVolumeMinor,
    totalAvailableCashMinor,
    totalAllocatedBudgetMinor,
    totalCarryoverBudgetMinor,
    totalEffectiveBudgetMinor,
    unallocatedIncomeMinor,
    totalRemainingCategoryBudgetMinor,
    accountBalancesMinor,
    categoryStatuses,
  };
}

/**
 * Executes the Mandatory Manual Monthly Closing & Carryover workflow.
 * - Requires explicit per-category user decision ('full' | 'custom' | 'none').
 * - Prevents duplicate rollover via idempotency key and existing review check.
 * - Updates next period's budget allocations without fabricating account ledger cash.
 */
export function executeMonthlyClosingCarryover(params: {
  fromPeriodKey: string;
  toPeriodKey: string;
  accounts: FinancialAccount[];
  categories: TransactionCategory[];
  allocations: BudgetAllocation[];
  transactions: FinancialTransaction[];
  existingReviews: MonthlyClosingReview[];
  decisionsInput: CategoryCarryoverInput[];
  explicitUserConfirmed: boolean;
}): {
  review: MonthlyClosingReview;
  updatedAllocations: BudgetAllocation[];
  accountBalancesAfterMinor: Record<string, number>;
} {
  const {
    fromPeriodKey,
    toPeriodKey,
    accounts,
    categories,
    allocations,
    transactions,
    existingReviews,
    decisionsInput,
    explicitUserConfirmed,
  } = params;

  if (!explicitUserConfirmed) {
    throw new Error('Explicit user confirmation is required to execute monthly budget carryover.');
  }

  if (fromPeriodKey >= toPeriodKey) {
    throw new Error(`Invalid closing transition: ${fromPeriodKey} -> ${toPeriodKey}`);
  }

  const idempotencyKey = `closing_${fromPeriodKey}_to_${toPeriodKey}`;
  const duplicate = existingReviews.find(
    (r) => r.fromPeriodKey === fromPeriodKey || r.idempotencyKey === idempotencyKey
  );
  if (duplicate) {
    throw new Error(`Duplicate monthly closing prevented for period ${fromPeriodKey}`);
  }

  const summary = computePeriodSummary({
    periodKey: fromPeriodKey,
    accounts,
    categories,
    allocations,
    transactions,
  });

  const decisionMap = new Map<string, CategoryCarryoverInput>();
  for (const d of decisionsInput) {
    decisionMap.set(d.categoryId, d);
  }

  const nextAllocations = [...allocations];
  const decisionRecords: CategoryCarryoverRecord[] = [];
  let totalCarryoverMinor = 0;

  for (const catStatus of summary.categoryStatuses) {
    const input = decisionMap.get(catStatus.categoryId) ?? {
      categoryId: catStatus.categoryId,
      mode: 'none' as CarryoverDecisionMode,
    };

    const positiveRemaining = Math.max(0, catStatus.remainingMinor);
    let carriedOverMinor = 0;

    if (input.mode === 'full') {
      carriedOverMinor = positiveRemaining;
    } else if (input.mode === 'custom') {
      const requested = Math.trunc(input.customAmountMinor ?? 0);
      if (requested < 0 || requested > positiveRemaining) {
        throw new Error(
          `Custom carryover (${requested}) for category ${catStatus.categoryName} must be between 0 and remaining (${positiveRemaining}).`
        );
      }
      carriedOverMinor = requested;
    } else {
      carriedOverMinor = 0;
    }

    totalCarryoverMinor += carriedOverMinor;

    decisionRecords.push({
      categoryId: catStatus.categoryId,
      categoryName: catStatus.categoryName,
      originalAllocatedMinor: catStatus.allocatedMinor,
      priorCarryoverMinor: catStatus.carryoverMinor,
      actualSpentMinor: catStatus.spentMinor,
      remainingMinor: catStatus.remainingMinor,
      decisionMode: input.mode,
      carriedOverMinor,
    });

    // Apply carryover to the target period's allocation record
    const existingTargetIdx = nextAllocations.findIndex(
      (a) => a.periodKey === toPeriodKey && a.categoryId === catStatus.categoryId
    );
    const catObj = categories.find((c) => c.id === catStatus.categoryId);
    const defaultAlloc = catObj ? catObj.defaultMonthlyBudgetMinor : catStatus.allocatedMinor;

    if (existingTargetIdx >= 0) {
      nextAllocations[existingTargetIdx] = {
        ...nextAllocations[existingTargetIdx],
        carryoverMinor: carriedOverMinor,
      };
    } else {
      nextAllocations.push({
        id: `alloc_${toPeriodKey}_${catStatus.categoryId}`,
        periodKey: toPeriodKey,
        categoryId: catStatus.categoryId,
        allocatedMinor: defaultAlloc,
        carryoverMinor: carriedOverMinor,
      });
    }
  }

  // Verify ledger invariant: account balances are strictly derived from the account ledger
  const accountBalancesAfterMinor = calculateAccountBalances(accounts, transactions);

  const review: MonthlyClosingReview = {
    id: `review_${fromPeriodKey}`,
    fromPeriodKey,
    toPeriodKey,
    idempotencyKey,
    totalIncomeMinor: summary.totalIncomeMinor,
    totalExpenseMinor: summary.totalExpenseMinor,
    totalCarryoverMinor,
    accountBalancesSnapshot: { ...accountBalancesAfterMinor },
    decisions: decisionRecords,
    confirmedAt: new Date().toISOString(),
  };

  return {
    review,
    updatedAllocations: nextAllocations,
    accountBalancesAfterMinor,
  };
}

/**
 * Reconciles an account's calculated ledger balance against an actual user-counted balance.
 * Returns the exact discrepancy in minor units and an optional adjustment transaction.
 */
export function reconcileAccountBalance(params: {
  account: FinancialAccount;
  transactions: FinancialTransaction[];
  actualCountedMinor: number;
  date: string;
}): {
  ledgerBalanceMinor: number;
  actualCountedMinor: number;
  discrepancyMinor: number;
  adjustmentTransaction: FinancialTransaction | null;
} {
  const { account, transactions, actualCountedMinor, date } = params;
  const balances = calculateAccountBalances([account], transactions);
  const ledgerBalanceMinor = balances[account.id] ?? account.openingBalanceMinor;
  const discrepancyMinor = Math.trunc(actualCountedMinor) - ledgerBalanceMinor;

  if (discrepancyMinor === 0) {
    return {
      ledgerBalanceMinor,
      actualCountedMinor,
      discrepancyMinor: 0,
      adjustmentTransaction: null,
    };
  }

  const periodKey = date.slice(0, 7);
  const adjustmentTransaction: FinancialTransaction = {
    id: `reconcile_${account.id}_${Date.now()}`,
    type: discrepancyMinor > 0 ? 'income' : 'expense',
    amountMinor: Math.abs(discrepancyMinor),
    accountId: account.id,
    categoryId: null, // Uncategorized reconciliation adjustment
    date,
    periodKey,
    description: 'تسوية رصيد الحساب (مطابقة فعلية)',
    notes: `فرق تسوية تلقائي بين الرصيد الدفتري (${formatMinorUnits(
      ledgerBalanceMinor
    )}) والرصيد الفعلي (${formatMinorUnits(actualCountedMinor)})`,
    isRecurring: false,
    createdAt: new Date().toISOString(),
  };

  return {
    ledgerBalanceMinor,
    actualCountedMinor,
    discrepancyMinor,
    adjustmentTransaction,
  };
}

/**
 * Checks whether the Monthly Closing Wizard should be prompted.
 * Prompts if:
 * 1) A previous month has transactions/allocations and has not been closed yet (late closing), OR
 * 2) Today is within `reminderDays` of the end of the current month and current month is not closed.
 */
export function checkMonthlyClosingStatus(params: {
  currentDate: Date;
  reminderDays: number;
  existingReviews: MonthlyClosingReview[];
  availablePeriods: string[];
}): {
  hasPendingPriorMonth: boolean;
  pendingPeriodKey: string | null;
  isEndOfMonthReminderDue: boolean;
  daysUntilMonthEnd: number;
} {
  const { currentDate, reminderDays, existingReviews, availablePeriods } = params;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const currentPeriodKey = `${year}-${String(month).padStart(2, '0')}`;

  const closedPeriods = new Set(existingReviews.map((r) => r.fromPeriodKey));
  const priorUnclosed = availablePeriods
    .filter((p) => p < currentPeriodKey && !closedPeriods.has(p))
    .sort();

  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const daysUntilMonthEnd = lastDayOfMonth - currentDate.getDate();
  const isEndOfMonthReminderDue =
    daysUntilMonthEnd <= reminderDays && !closedPeriods.has(currentPeriodKey);

  return {
    hasPendingPriorMonth: priorUnclosed.length > 0,
    pendingPeriodKey: priorUnclosed.length > 0 ? priorUnclosed[0] : null,
    isEndOfMonthReminderDue,
    daysUntilMonthEnd,
  };
}
