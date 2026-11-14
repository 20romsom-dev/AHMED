'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Landmark,
  Layers,
  PiggyBank,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  CategoryBudgetStatus,
  computePeriodSummary,
  formatMinorUnits,
  toMinorUnits,
} from '@/domain/finance/engine';
import {
  CarryoverDecisionMode,
  CategoryCarryoverInput,
  FinancialTransaction,
  TransactionType,
} from '@/domain/types';
import {
  TransactionPopupInitial,
  TransactionPopupModal,
} from './finance/TransactionPopupModal';
import { CategoryDetailModal } from './finance/CategoryDetailModal';
import { FinanceAnalyticsBar } from './finance/FinanceAnalyticsBar';

interface FinanceMoneyStudioProps {
  externalWizardOpen?: boolean;
  onCloseExternalWizard?: () => void;
}

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

function shiftPeriodKey(periodKey: string, deltaMonths: number): string {
  const [yStr, mStr] = periodKey.split('-');
  const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodLabel(periodKey: string): string {
  const [y, m] = periodKey.split('-');
  return `${ARABIC_MONTHS[m] || m} ${y}`;
}

export function FinanceMoneyStudio({
  externalWizardOpen = false,
  onCloseExternalWizard,
}: FinanceMoneyStudioProps) {
  const {
    state,
    currentPeriodSummary,
    setActivePeriodKey,
    addCategory,
    updateCategory,
    updateCategoryBudget,
    archiveCategory,
    addAccount,
    archiveAccount,
    reconcileAccount,
    confirmMonthlyRollover,
    addIncomeSource,
    deleteIncomeSource,
    addSavingsGoal,
    contributeToSavingsGoal,
    addDebtRecord,
    payDebtInstallment,
  } = useLifeOS();

  const [subView, setSubView] = useState<
    'overview' | 'budgets' | 'transactions' | 'accounts' | 'closing'
  >(externalWizardOpen ? 'closing' : 'overview');

  // Dynamic period keys: active -> next, and list of surrounding 12 months
  const nextPeriodKey = useMemo(
    () => shiftPeriodKey(state.activePeriodKey, 1),
    [state.activePeriodKey]
  );

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    for (let i = -4; i <= 4; i++) {
      set.add(shiftPeriodKey(state.activePeriodKey, i));
    }
    for (const tx of state.transactions) {
      set.add(tx.periodKey);
    }
    return Array.from(set).sort().reverse();
  }, [state.activePeriodKey, state.transactions]);

  // Rollover target direction: export activePeriodKey -> nextPeriodKey by default!
  const [customRolloverFromKey, setCustomRolloverFromKey] = useState<string | null>(null);
  const rolloverFromKey = customRolloverFromKey ?? state.activePeriodKey;

  const rolloverToKey = useMemo(
    () => shiftPeriodKey(rolloverFromKey, 1),
    [rolloverFromKey]
  );

  const rolloverSourceSummary = useMemo(
    () =>
      computePeriodSummary({
        periodKey: rolloverFromKey,
        accounts: state.accounts,
        categories: state.categories,
        allocations: state.allocations,
        transactions: state.transactions,
      }),
    [rolloverFromKey, state.accounts, state.categories, state.allocations, state.transactions]
  );

  const isRolloverDone = useMemo(
    () => state.closingReviews.some((r) => r.fromPeriodKey === rolloverFromKey),
    [state.closingReviews, rolloverFromKey]
  );

  // Popup Modal State (Create / Edit Transaction)
  const [txPopupOpen, setTxPopupOpen] = useState(false);
  const [txPopupInitial, setTxPopupInitial] = useState<TransactionPopupInitial | null>(null);

  // Category Detail Modal State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const selectedCategoryStatus: CategoryBudgetStatus | null = useMemo(() => {
    if (!selectedCategoryId) return null;
    return (
      currentPeriodSummary.categoryStatuses.find((c) => c.categoryId === selectedCategoryId) ||
      null
    );
  }, [selectedCategoryId, currentPeriodSummary.categoryStatuses]);

  const openCreateTxPopup = (opts?: Partial<TransactionPopupInitial>) => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const defaultDate =
      todayISO.slice(0, 7) === state.activePeriodKey
        ? todayISO
        : `${state.activePeriodKey}-01`;

    setTxPopupInitial({
      mode: 'create',
      defaultType: opts?.defaultType ?? 'expense',
      defaultCategoryId: opts?.defaultCategoryId,
      defaultAccountId: opts?.defaultAccountId,
      defaultAmountMajor: opts?.defaultAmountMajor,
      defaultDescription: opts?.defaultDescription,
      defaultDate: opts?.defaultDate ?? defaultDate,
    });
    setTxPopupOpen(true);
  };

  const openEditTxPopup = (tx: FinancialTransaction) => {
    setTxPopupInitial({
      mode: 'edit',
      transaction: tx,
    });
    setTxPopupOpen(true);
  };

  // Transaction ledger search & filter
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | TransactionType>('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');

  // Category creation & rename state
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('2000');
  const [newCatColor, setNewCatColor] = useState('#8B5CF6');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Income source creation
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newIncName, setNewIncName] = useState('');
  const [newIncAmount, setNewIncAmount] = useState('');
  const [newIncDay, setNewIncDay] = useState('1');

  // Account creation & reconciliation
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('5000');
  const [reconcileAccId, setReconcileAccId] = useState(state.accounts[0]?.id || 'acc_bank_main');
  const [reconcileCounted, setReconcileCounted] = useState('');

  // Savings goal & debt creation
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newDebtTitle, setNewDebtTitle] = useState('');
  const [newDebtCounterparty, setNewDebtCounterparty] = useState('');
  const [newDebtTotal, setNewDebtTotal] = useState('');
  const [newDebtInstallment, setNewDebtInstallment] = useState('');

  // Monthly Closing & Carryover Wizard state
  const [decisionsMap, setDecisionsMap] = useState<
    Record<string, { mode: CarryoverDecisionMode; customMajor: string }>
  >({});

  const getCategoryDecision = (cat: CategoryBudgetStatus) =>
    decisionsMap[cat.categoryId] ?? {
      mode: (cat.remainingMinor > 0 ? 'full' : 'none') as CarryoverDecisionMode,
      customMajor: String(Math.max(0, Math.floor(cat.remainingMinor / 100))),
    };

  const [explicitApproveChecked, setExplicitApproveChecked] = useState(false);
  const [closingFeedback, setClosingFeedback] = useState<string | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      icon: 'Tag',
      color: newCatColor,
      type: 'expense',
      defaultMonthlyBudgetMinor: toMinorUnits(newCatBudget || '0'),
    });
    setNewCatName('');
  };

  const handleAddIncomeSource = (e: React.FormEvent) => {
    e.preventDefault();
    const minor = toMinorUnits(newIncAmount);
    if (!newIncName.trim() || minor <= 0) return;
    addIncomeSource({
      name: newIncName.trim(),
      expectedAmountMinor: minor,
      paydayOfMonth: Math.min(31, Math.max(1, parseInt(newIncDay, 10) || 1)),
      isRecurring: true,
      defaultAccountId: state.accounts[0]?.id || 'acc_bank_main',
    });
    setNewIncName('');
    setNewIncAmount('');
    setShowAddIncome(false);
  };

  const handleDistributeSalaryToCategories = () => {
    const totalSalaryMinor = state.incomeSources.reduce(
      (sum, s) => sum + s.expectedAmountMinor,
      0
    );
    const activeCats = currentPeriodSummary.categoryStatuses;
    if (totalSalaryMinor <= 0 || activeCats.length === 0) return;

    const currentTotal = activeCats.reduce((s, c) => s + c.allocatedMinor, 0);
    for (const cat of activeCats) {
      const share =
        currentTotal > 0
          ? Math.round((cat.allocatedMinor / currentTotal) * totalSalaryMinor)
          : Math.round(totalSalaryMinor / activeCats.length);
      updateCategoryBudget(cat.categoryId, state.activePeriodKey, share);
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    addAccount({
      name: newAccName.trim(),
      type: 'bank',
      currency: state.profile.currency,
      openingBalanceMinor: toMinorUnits(newAccBalance || '0'),
      color: '#35D6E8',
      icon: 'Wallet',
    });
    setNewAccName('');
  };

  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileCounted) return;
    reconcileAccount(reconcileAccId, toMinorUnits(reconcileCounted));
    setReconcileCounted('');
  };

  const handleAddSavingsGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMinor = toMinorUnits(newGoalTarget);
    if (!newGoalTitle.trim() || targetMinor <= 0) return;
    addSavingsGoal({
      title: newGoalTitle.trim(),
      targetAmountMinor: targetMinor,
      currentAmountMinor: 0,
      color: '#36D6A1',
    });
    setNewGoalTitle('');
    setNewGoalTarget('');
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const totalMinor = toMinorUnits(newDebtTotal);
    const instMinor = toMinorUnits(newDebtInstallment);
    if (!newDebtTitle.trim() || totalMinor <= 0) return;
    addDebtRecord({
      title: newDebtTitle.trim(),
      counterparty: newDebtCounterparty.trim() || 'جهة خارجية',
      direction: 'owed_by_me',
      totalAmountMinor: totalMinor,
      remainingAmountMinor: totalMinor,
      monthlyInstallmentMinor: instMinor > 0 ? instMinor : Math.round(totalMinor / 6),
      dueDay: 1,
      nextDueDate: `${nextPeriodKey}-01`,
      notes: '',
    });
    setNewDebtTitle('');
    setNewDebtCounterparty('');
    setNewDebtTotal('');
    setNewDebtInstallment('');
  };

  const handleExecuteClosing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!explicitApproveChecked) {
      setClosingFeedback('يرجى التأشير على مربع التأكيد الصريح قبل تنفيذ ترحيل الرصيد للشهر التالي.');
      return;
    }

    try {
      const inputs: CategoryCarryoverInput[] = rolloverSourceSummary.categoryStatuses.map(
        (cat) => {
          const entry = getCategoryDecision(cat);
          return {
            categoryId: cat.categoryId,
            mode: entry.mode,
            customAmountMinor:
              entry.mode === 'custom' ? toMinorUnits(entry.customMajor || '0') : undefined,
          };
        }
      );

      const review = confirmMonthlyRollover(rolloverFromKey, rolloverToKey, inputs);
      setClosingFeedback(
        `تم إغلاق شهر ${formatPeriodLabel(rolloverFromKey)} وتصدير ${formatMinorUnits(
          review.totalCarryoverMinor,
          state.profile.currency
        )} إلى ميزانيات شهر ${formatPeriodLabel(rolloverToKey)} بنجاح.`
      );
      setActivePeriodKey(rolloverToKey);
      setExplicitApproveChecked(false);
      if (onCloseExternalWizard) onCloseExternalWizard();
    } catch (err) {
      setClosingFeedback(err instanceof Error ? err.message : 'تعذر إتمام الإغلاق الشهري');
    }
  };

  const exportTransactionsCSV = () => {
    const headers = ['Date,Period,Type,Description,Amount,Account,Category,Notes'];
    const rows = state.transactions
      .filter((t) => t.periodKey === state.activePeriodKey)
      .map((t) => {
        const amtMajor = (t.amountMinor / 100).toFixed(2);
        const accName = state.accounts.find((a) => a.id === t.accountId)?.name || t.accountId;
        const catName = t.categoryId
          ? state.categories.find((c) => c.id === t.categoryId)?.name || t.categoryId
          : 'غير مصنف';
        return `${t.date},${t.periodKey},${t.type},"${t.description}",${amtMajor},"${accName}","${catName}","${t.notes || ''}"`;
      });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `lifeos-finance-${state.activePeriodKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return state.transactions
      .filter((t) => {
        if (t.periodKey !== state.activePeriodKey) return false;
        if (txTypeFilter !== 'all' && t.type !== txTypeFilter) return false;
        if (txCategoryFilter !== 'all') {
          if (txCategoryFilter === 'uncategorized' && t.categoryId !== null) return false;
          if (txCategoryFilter !== 'uncategorized' && t.categoryId !== txCategoryFilter)
            return false;
        }
        if (!q) return true;
        return (
          t.description.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, state.activePeriodKey, txSearch, txTypeFilter, txCategoryFilter]);

  return (
    <div className="space-y-5 pb-32">
      {/* Header & Dynamic Month Stepper */}
      <div className="lifeos-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-emerald-success font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>منظم المصاريف والراتب الشهري • دقة محاسبية كاملة</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">
            استوديو المالية والميزانيات الشهرية
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Stepper */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-bg-secondary border border-white/10">
            <button
              type="button"
              onClick={() => setActivePeriodKey(shiftPeriodKey(state.activePeriodKey, -1))}
              aria-label="الشهر السابق"
              className="p-2 rounded-full hover:bg-surface-highlight text-text-secondary hover:text-text-primary min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <select
              value={state.activePeriodKey}
              onChange={(e) => setActivePeriodKey(e.target.value)}
              aria-label="اختيار الشهر المالي"
              className="bg-transparent text-xs font-bold text-text-primary px-2 py-1 focus:outline-none cursor-pointer"
            >
              {availablePeriods.map((pk) => (
                <option key={pk} value={pk} className="bg-surface-primary text-text-primary">
                  {formatPeriodLabel(pk)} ({pk})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setActivePeriodKey(shiftPeriodKey(state.activePeriodKey, 1))}
              aria-label="الشهر التالي"
              className="p-2 rounded-full hover:bg-surface-highlight text-text-secondary hover:text-text-primary min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateTxPopup({ defaultType: 'expense' })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary-violet hover:bg-primary-violet-light text-xs font-bold text-white shadow-md transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>عملية جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCustomRolloverFromKey(state.activePeriodKey);
              setSubView('closing');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-emerald-success/15 hover:bg-emerald-success/25 border border-emerald-success/40 text-xs font-bold text-emerald-success transition-all min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ترحيل للشهر التالي</span>
          </button>

          <button
            type="button"
            onClick={exportTransactionsCSV}
            title="تصدير معاملات الشهر CSV"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-surface-highlight hover:bg-primary-violet/40 text-xs text-text-primary transition-all min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(
          [
            { id: 'overview', label: 'اللوحة والراتب والفئات', icon: Wallet },
            { id: 'budgets', label: 'إدارة الفئات والميزانيات', icon: Layers },
            { id: 'transactions', label: 'سجل الصادر والوارد', icon: Receipt },
            { id: 'accounts', label: 'الحسابات والادخار والأقساط', icon: Landmark },
            {
              id: 'closing',
              label: isRolloverDone
                ? `ترحيل ${formatPeriodLabel(rolloverFromKey)} ✓`
                : `تصدير الرصيد لـ ${formatPeriodLabel(rolloverToKey)}`,
              icon: RefreshCw,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all min-h-[44px] shrink-0 ${
                subView === tab.id
                  ? 'bg-primary-violet text-white shadow-md'
                  : 'bg-surface-primary text-text-secondary hover:text-text-primary border border-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lifeos-card p-4 border-emerald-success/30">
          <div className="text-xs text-text-muted">السيولة النقدية الفعلية</div>
          <div className="text-lg sm:text-xl font-bold text-emerald-success tabular-nums mt-1">
            {formatMinorUnits(
              currentPeriodSummary.totalAvailableCashMinor,
              state.profile.currency
            )}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">إجمالي أرصدة الحسابات</div>
        </div>

        <div className="lifeos-card p-4">
          <div className="text-xs text-text-muted">الوارد ({formatPeriodLabel(state.activePeriodKey)})</div>
          <div className="text-lg sm:text-xl font-bold text-text-primary tabular-nums mt-1">
            {formatMinorUnits(currentPeriodSummary.totalIncomeMinor, state.profile.currency)}
          </div>
          <button
            type="button"
            onClick={() => openCreateTxPopup({ defaultType: 'income' })}
            className="text-[11px] text-emerald-success mt-0.5 inline-flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3 h-3" />
            <span>إضافة راتب / دخل وارد</span>
          </button>
        </div>

        <div className="lifeos-card p-4">
          <div className="text-xs text-text-muted">الصادر (المصروفات)</div>
          <div className="text-lg sm:text-xl font-bold text-danger-coral tabular-nums mt-1">
            {formatMinorUnits(currentPeriodSummary.totalExpenseMinor, state.profile.currency)}
          </div>
          <button
            type="button"
            onClick={() => openCreateTxPopup({ defaultType: 'expense' })}
            className="text-[11px] text-danger-coral mt-0.5 inline-flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3 h-3" />
            <span>تسجيل مصروف سريع</span>
          </button>
        </div>

        <div className="lifeos-card p-4">
          <div className="text-xs text-text-muted">الميزانية المخصصة (+المرحل)</div>
          <div className="text-lg sm:text-xl font-bold text-primary-violet-light tabular-nums mt-1">
            {formatMinorUnits(
              currentPeriodSummary.totalEffectiveBudgetMinor,
              state.profile.currency
            )}
          </div>
          <div className="text-[11px] text-text-muted tabular-nums mt-0.5">
            مرحل من السابق:{' '}
            {formatMinorUnits(
              currentPeriodSummary.totalCarryoverBudgetMinor,
              state.profile.currency
            )}
          </div>
        </div>

        <div className="lifeos-card p-4 border-cyan-accent/30 col-span-2 lg:col-span-1">
          <div className="text-xs text-text-muted">المتبقي القابل للترحيل</div>
          <div className="text-lg sm:text-xl font-bold text-cyan-accent tabular-nums mt-1">
            {formatMinorUnits(
              currentPeriodSummary.totalRemainingCategoryBudgetMinor,
              state.profile.currency
            )}
          </div>
          <div className="text-[11px] text-text-muted tabular-nums mt-0.5">
            دخل غير مخصص:{' '}
            {formatMinorUnits(
              currentPeriodSummary.unallocatedIncomeMinor,
              state.profile.currency
            )}
          </div>
        </div>
      </div>

      {/* 1. OVERVIEW: INTERACTIVE CATEGORIES + ANALYTICS + SALARY */}
      {subView === 'overview' && (
        <div className="space-y-5">
          <FinanceAnalyticsBar
            summary={currentPeriodSummary}
            currency={state.profile.currency}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Interactive Category Cards */}
            <div className="lg:col-span-7 lifeos-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    فئات الصرف لشهر {formatPeriodLabel(state.activePeriodKey)}
                  </h2>
                  <p className="text-xs text-text-muted">
                    اضغط على أي فئة لعرض عملياتها والصرف بداخلها، أو استخدم زر «+ صرف» السريع
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubView('budgets')}
                  className="text-xs text-primary-violet-light hover:underline font-semibold"
                >
                  إدارة الفئات
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentPeriodSummary.categoryStatuses.map((cat) => (
                  <div
                    key={cat.categoryId}
                    onClick={() => setSelectedCategoryId(cat.categoryId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCategoryId(cat.categoryId);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-bg-secondary/90 hover:bg-surface-highlight/50 border border-white/10 hover:border-primary-violet/40 space-y-2.5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-bold text-text-primary truncate">
                          {cat.categoryName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateTxPopup({
                            defaultType: 'expense',
                            defaultCategoryId: cat.categoryId,
                          });
                        }}
                        className="px-2.5 py-1 rounded-full bg-primary-violet/20 hover:bg-primary-violet text-primary-violet-light hover:text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>صرف</span>
                      </button>
                    </div>

                    {cat.carryoverMinor > 0 && (
                      <div className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-success/15 text-emerald-success tabular-nums">
                        + مرحل من الشهر السابق:{' '}
                        {formatMinorUnits(cat.carryoverMinor, state.profile.currency)}
                      </div>
                    )}

                    <div className="h-2 rounded-full bg-surface-primary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, cat.utilizationPercent)}%`,
                          backgroundColor:
                            cat.overspentMinor > 0 ? 'var(--danger-coral)' : cat.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] tabular-nums">
                      <span className="text-text-muted">
                        منفق: {formatMinorUnits(cat.spentMinor, state.profile.currency)}
                      </span>
                      <span
                        className={`font-bold ${
                          cat.remainingMinor < 0 ? 'text-danger-coral' : 'text-emerald-success'
                        }`}
                      >
                        متبقي: {formatMinorUnits(cat.remainingMinor, state.profile.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Salary & Income Sources + Quick Recent Transactions */}
            <div className="lg:col-span-5 space-y-5">
              {/* Salary & Income Sources */}
              <div className="lifeos-card p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-text-primary">
                    الراتب ومصادر الدخل الشهري
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddIncome((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs text-cyan-accent hover:underline font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>مصدر دخل</span>
                  </button>
                </div>

                {showAddIncome && (
                  <form
                    onSubmit={handleAddIncomeSource}
                    className="p-3 rounded-2xl bg-bg-secondary border border-cyan-accent/30 space-y-2"
                  >
                    <input
                      type="text"
                      value={newIncName}
                      onChange={(e) => setNewIncName(e.target.value)}
                      placeholder="اسم مصدر الدخل (مثلاً: راتب الشركة)"
                      className="lifeos-input w-full text-xs"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={newIncAmount}
                        onChange={(e) => setNewIncAmount(e.target.value)}
                        placeholder="القيمة المتوقعة"
                        className="lifeos-input w-full text-xs tabular-nums"
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newIncDay}
                        onChange={(e) => setNewIncDay(e.target.value)}
                        placeholder="يوم الصرف (1-31)"
                        className="lifeos-input w-full text-xs tabular-nums"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-full bg-cyan-accent text-bg-primary text-xs font-bold"
                    >
                      حفظ مصدر الدخل
                    </button>
                  </form>
                )}

                <div className="space-y-2.5">
                  {state.incomeSources.map((src) => (
                    <div
                      key={src.id}
                      className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-text-primary truncate">
                          {src.name}
                        </div>
                        <div className="text-sm font-extrabold text-emerald-success tabular-nums">
                          {formatMinorUnits(src.expectedAmountMinor, state.profile.currency)}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          يوم {src.paydayOfMonth} من كل شهر
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openCreateTxPopup({
                              defaultType: 'income',
                              defaultAmountMajor: String(src.expectedAmountMinor / 100),
                              defaultDescription: src.name,
                              defaultAccountId: src.defaultAccountId,
                            })
                          }
                          className="px-3 py-2 rounded-full bg-emerald-success/20 hover:bg-emerald-success text-emerald-success hover:text-bg-primary text-xs font-bold transition-all"
                        >
                          استلام الآن
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteIncomeSource(src.id)}
                          aria-label={`حذف ${src.name}`}
                          className="p-2 rounded-full text-text-muted hover:text-danger-coral"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleDistributeSalaryToCategories}
                  className="w-full py-2.5 rounded-full bg-surface-highlight hover:bg-primary-violet/30 border border-white/10 text-xs font-semibold text-text-primary inline-flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary-violet-light" />
                  <span>توزيع إجمالي الراتب تلقائياً على ميزانيات الفئات</span>
                </button>
              </div>

              {/* Recent Transactions Quick List (Tap to Edit in Popup!) */}
              <div className="lifeos-card p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-primary">آخر العمليات المسجلة</h3>
                  <button
                    type="button"
                    onClick={() => setSubView('transactions')}
                    className="text-xs text-primary-violet-light hover:underline"
                  >
                    عرض الكل ({periodTransactions.length})
                  </button>
                </div>

                {periodTransactions.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">
                    لا توجد معاملات في شهر {formatPeriodLabel(state.activePeriodKey)} بعد.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {periodTransactions.slice(0, 5).map((tx) => {
                      const cat = tx.categoryId
                        ? state.categories.find((c) => c.id === tx.categoryId)
                        : null;
                      return (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => openEditTxPopup(tx)}
                          className="w-full text-right p-3 rounded-2xl bg-bg-secondary hover:bg-surface-highlight/50 border border-white/10 flex items-center justify-between gap-2 transition-all group"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-text-primary truncate">
                              {tx.description}
                            </div>
                            <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5 tabular-nums">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span>
                                {tx.type === 'income'
                                  ? 'دخل وارد'
                                  : tx.type === 'transfer'
                                  ? 'تحويل'
                                  : cat?.name || 'غير مصنف'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                tx.type === 'income'
                                  ? 'text-emerald-success'
                                  : tx.type === 'transfer'
                                  ? 'text-cyan-accent'
                                  : 'text-danger-coral'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '⇄'}{' '}
                              {formatMinorUnits(tx.amountMinor, state.profile.currency)}
                            </span>
                            <Edit3 className="w-3.5 h-3.5 text-text-muted group-hover:text-cyan-accent" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BUDGETS & CATEGORIES MANAGEMENT */}
      {subView === 'budgets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 lifeos-card p-5 space-y-4">
            <h2 className="text-base font-bold text-text-primary">
              تخصيص ميزانيات الفئات لشهر {formatPeriodLabel(state.activePeriodKey)}
            </h2>
            <p className="text-xs text-text-secondary">
              يمكنك تعديل اسم الفئة، مخصصها الشهري، أو الضغط على الفئة للصرف بداخلها.
            </p>
            <div className="space-y-3">
              {currentPeriodSummary.categoryStatuses.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="p-4 rounded-2xl bg-bg-secondary border border-white/10 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    {editingCatId === cat.categoryId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="lifeos-input text-xs py-1 px-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editCatName.trim()) {
                              updateCategory(cat.categoryId, { name: editCatName.trim() });
                            }
                            setEditingCatId(null);
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-success text-bg-primary text-xs font-bold"
                        >
                          حفظ
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.categoryId)}
                          className="text-sm font-bold text-text-primary hover:text-primary-violet-light"
                        >
                          {cat.categoryName}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.categoryId);
                            setEditCatName(cat.categoryName);
                          }}
                          aria-label={`إعادة تسمية فئة ${cat.categoryName}`}
                          className="text-text-muted hover:text-cyan-accent"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-text-muted tabular-nums mt-1">
                      المنفق: {formatMinorUnits(cat.spentMinor, state.profile.currency)} • المرحل:{' '}
                      {formatMinorUnits(cat.carryoverMinor, state.profile.currency)} • المتبقي:{' '}
                      {formatMinorUnits(cat.remainingMinor, state.profile.currency)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted">المخصص:</label>
                    <input
                      type="number"
                      defaultValue={Math.floor(cat.allocatedMinor / 100)}
                      onBlur={(e) =>
                        updateCategoryBudget(
                          cat.categoryId,
                          state.activePeriodKey,
                          toMinorUnits(e.target.value || '0')
                        )
                      }
                      className="lifeos-input w-28 text-xs font-bold tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => archiveCategory(cat.categoryId)}
                      title="أرشفة الفئة بأمان"
                      className="p-2 rounded-xl text-text-muted hover:text-danger-coral"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 lifeos-card p-5 space-y-4">
            <h3 className="text-base font-bold text-text-primary">إضافة فئة ميزانية جديدة</h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">اسم الفئة</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="مثال: ترفيه وسفر"
                  className="lifeos-input w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  الميزانية الشهرية الافتراضية
                </label>
                <input
                  type="number"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  className="lifeos-input w-full text-sm tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">اللون المميز</label>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-10 w-full rounded-xl bg-bg-secondary border border-white/10 p-1 cursor-pointer"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-semibold min-h-[44px]"
              >
                + إنشاء الفئة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. TRANSACTIONS LEDGER (WITH FULL POPUP EDITING) */}
      {subView === 'transactions' && (
        <div className="lifeos-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text-primary">
                دفتر الصادر والوارد لشهر {formatPeriodLabel(state.activePeriodKey)} (
                {periodTransactions.length})
              </h2>
              <p className="text-xs text-text-muted">
                اضغط على أي معاملة لتعديل تاريخها أو ربطها بفئة أخرى أو تعديل تفاصيلها في البوب أب
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute right-3 top-3" />
                <input
                  type="search"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="بحث في المعاملات..."
                  className="lifeos-input pr-8 text-xs py-2"
                />
              </div>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value as 'all' | TransactionType)}
                className="lifeos-input text-xs py-2"
              >
                <option value="all">كل الأنواع</option>
                <option value="expense">صادر (مصروفات)</option>
                <option value="income">وارد (إيرادات)</option>
                <option value="transfer">تحويلات</option>
              </select>
              <select
                value={txCategoryFilter}
                onChange={(e) => setTxCategoryFilter(e.target.value)}
                className="lifeos-input text-xs py-2"
              >
                <option value="all">كل الفئات</option>
                {state.categories
                  .filter((c) => !c.isArchived && c.type === 'expense')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                <option value="uncategorized">غير مصنف</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            {periodTransactions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-bg-secondary/60 text-center text-xs text-text-muted">
                لا توجد معاملات مطابقة للبحث في هذا الشهر.
              </div>
            ) : (
              periodTransactions.map((tx) => {
                const acc = state.accounts.find((a) => a.id === tx.accountId);
                const toAcc = tx.toAccountId
                  ? state.accounts.find((a) => a.id === tx.toAccountId)
                  : null;
                const cat = tx.categoryId
                  ? state.categories.find((c) => c.id === tx.categoryId)
                  : null;

                return (
                  <div
                    key={tx.id}
                    onClick={() => openEditTxPopup(tx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEditTxPopup(tx);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-bg-secondary/90 hover:bg-surface-highlight/50 border border-white/10 hover:border-primary-violet/40 flex flex-wrap items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">
                          {tx.description}
                        </span>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                            tx.type === 'income'
                              ? 'bg-emerald-success/20 text-emerald-success'
                              : tx.type === 'transfer'
                              ? 'bg-cyan-accent/20 text-cyan-accent'
                              : 'bg-danger-coral/20 text-danger-coral'
                          }`}
                        >
                          {tx.type === 'income'
                            ? 'وارد'
                            : tx.type === 'transfer'
                            ? `تحويل إلى ${toAcc?.name || ''}`
                            : cat
                            ? cat.name
                            : 'غير مصنف'}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted tabular-nums mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {tx.date}
                        </span>
                        <span>• {acc?.name || tx.accountId}</span>
                        {tx.notes && <span>• {tx.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          tx.type === 'income'
                            ? 'text-emerald-success'
                            : tx.type === 'transfer'
                            ? 'text-cyan-accent'
                            : 'text-danger-coral'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '⇄'}{' '}
                        {formatMinorUnits(tx.amountMinor, state.profile.currency)}
                      </span>
                      <span className="p-2 rounded-xl text-text-muted group-hover:text-cyan-accent">
                        <Edit3 className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. ACCOUNTS, SAVINGS GOALS, DEBTS & RECONCILIATION */}
      {subView === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            <div className="lifeos-card p-5 space-y-3">
              <h2 className="text-base font-bold text-text-primary">أرصدة الحسابات المالية</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.accounts
                  .filter((a) => !a.isArchived)
                  .map((acc) => (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl bg-bg-secondary border border-white/10 space-y-1 flex items-start justify-between"
                    >
                      <div>
                        <div className="text-xs text-text-muted">{acc.type.toUpperCase()}</div>
                        <div className="text-sm font-bold text-text-primary">{acc.name}</div>
                        <div className="text-lg font-bold text-emerald-success tabular-nums">
                          {formatMinorUnits(
                            currentPeriodSummary.accountBalancesMinor[acc.id] ?? 0,
                            acc.currency
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => archiveAccount(acc.id)}
                        title="أرشفة الحساب"
                        className="text-text-muted hover:text-danger-coral p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Savings Goals */}
            <div className="lifeos-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-religious-gold" />
                <h3 className="text-base font-bold text-text-primary">أهداف الادخار</h3>
              </div>
              <div className="space-y-3">
                {state.savingsGoals.map((g) => {
                  const pct = Math.min(
                    100,
                    Math.round((g.currentAmountMinor / g.targetAmountMinor) * 100)
                  );
                  return (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-text-primary">{g.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-emerald-success">
                            {formatMinorUnits(g.currentAmountMinor, state.profile.currency)} /{' '}
                            {formatMinorUnits(g.targetAmountMinor, state.profile.currency)} ({pct}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => contributeToSavingsGoal(g.id, toMinorUnits('500'))}
                            className="px-2.5 py-1 rounded-full bg-emerald-success/20 hover:bg-emerald-success text-emerald-success hover:text-bg-primary text-[11px] font-bold"
                          >
                            +500
                          </button>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-surface-primary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-success transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleAddSavingsGoal} className="flex flex-wrap gap-2 pt-1">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="هدف ادخار جديد (مثلاً: شراء لابتوب)"
                  className="lifeos-input flex-1 min-w-[150px] text-xs"
                />
                <input
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="المبلغ المستهدف"
                  className="lifeos-input w-32 text-xs tabular-nums"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-primary-violet text-white text-xs font-bold"
                >
                  + إضافة هدف
                </button>
              </form>
            </div>

            {/* Debts & Installments */}
            <div className="lifeos-card p-5 space-y-4">
              <h3 className="text-base font-bold text-text-primary">الأقساط والالتزامات</h3>
              <div className="space-y-2.5">
                {state.debts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-2xl bg-bg-secondary border border-warning-amber/30 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-text-primary">{d.title}</div>
                      <div className="text-[11px] text-text-muted tabular-nums">
                        الجهة: {d.counterparty} • القسط:{' '}
                        {formatMinorUnits(d.monthlyInstallmentMinor, state.profile.currency)} • متبقي:{' '}
                        <strong className="text-warning-amber">
                          {formatMinorUnits(d.remainingAmountMinor, state.profile.currency)}
                        </strong>
                      </div>
                    </div>
                    {d.remainingAmountMinor > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          payDebtInstallment(
                            d.id,
                            Math.min(d.monthlyInstallmentMinor, d.remainingAmountMinor),
                            state.accounts[0]?.id || 'acc_bank_main',
                            new Date().toISOString().slice(0, 10)
                          )
                        }
                        className="px-3 py-1.5 rounded-full bg-warning-amber/20 hover:bg-warning-amber text-warning-amber hover:text-bg-primary text-xs font-bold transition-all"
                      >
                        سداد قسط
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddDebt} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newDebtTitle}
                  onChange={(e) => setNewDebtTitle(e.target.value)}
                  placeholder="اسم القسط / الالتزام"
                  className="lifeos-input text-xs col-span-2 sm:col-span-1"
                />
                <input
                  type="text"
                  value={newDebtCounterparty}
                  onChange={(e) => setNewDebtCounterparty(e.target.value)}
                  placeholder="الجهة"
                  className="lifeos-input text-xs"
                />
                <input
                  type="number"
                  value={newDebtTotal}
                  onChange={(e) => setNewDebtTotal(e.target.value)}
                  placeholder="الإجمالي"
                  className="lifeos-input text-xs tabular-nums"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-full bg-warning-amber text-bg-primary text-xs font-bold"
                >
                  + إضافة التزام
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            {/* Balance Reconciliation Tool */}
            <div className="lifeos-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-accent" />
                <h3 className="text-base font-bold text-text-primary">
                  أداة مطابقة وتسوية الرصيد الفعلي
                </h3>
              </div>
              <p className="text-xs text-text-secondary">
                أدخل الرصيد الفعلي الموجود في حسابك أو محفظتك ليقوم النظام بحساب الفرق وقيد تسوية
                دقيقة تلقائياً.
              </p>
              <form onSubmit={handleReconcile} className="space-y-3">
                <select
                  value={reconcileAccId}
                  onChange={(e) => setReconcileAccId(e.target.value)}
                  className="lifeos-input w-full text-sm"
                >
                  {state.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={reconcileCounted}
                  onChange={(e) => setReconcileCounted(e.target.value)}
                  placeholder="الرصيد الفعلي الحالي"
                  className="lifeos-input w-full text-sm tabular-nums"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-cyan-accent text-bg-primary text-xs font-bold min-h-[44px]"
                >
                  تطبيق التسوية والمطابقة
                </button>
              </form>
            </div>

            {/* Add New Account */}
            <div className="lifeos-card p-5 space-y-3">
              <h3 className="text-base font-bold text-text-primary">إضافة حساب مالي جديد</h3>
              <form onSubmit={handleAddAccount} className="space-y-3">
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="اسم الحساب أو المحفظة"
                  className="lifeos-input w-full text-sm"
                  required
                />
                <input
                  type="number"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  placeholder="الرصيد الافتتاحي"
                  className="lifeos-input w-full text-sm tabular-nums"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-primary-violet text-white text-xs font-semibold min-h-[44px]"
                >
                  + إنشاء الحساب
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. MONTHLY CLOSING & CARRYOVER TO NEXT MONTH */}
      {subView === 'closing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lifeos-card-elevated p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-primary-violet/20 text-primary-violet-light text-xs font-semibold">
                تصدير وترحيل الرصيد للشهر التالي ({formatPeriodLabel(rolloverFromKey)} ←{' '}
                {formatPeriodLabel(rolloverToKey)})
              </span>
              <h2 className="text-xl font-bold text-text-primary mt-2">
                مراجعة وترحيل فوائض الميزانيات والرصيد
              </h2>
              <p className="text-xs text-text-secondary mt-1 max-w-2xl">
                اختر الشهر المراد إغلاقه وتصدير فوائض فئاته إلى الشهر التالي، مع الحفاظ التام على
                الأرصدة النقدية الفعلية في حساباتك.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <label className="text-xs text-text-muted">الشهر المراد ترحيله:</label>
                <select
                  value={rolloverFromKey}
                  onChange={(e) => setCustomRolloverFromKey(e.target.value)}
                  className="lifeos-input text-xs py-1.5"
                >
                  {availablePeriods.map((pk) => (
                    <option key={pk} value={pk}>
                      {formatPeriodLabel(pk)} ({pk})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 text-xs space-y-1 tabular-nums">
              <div>
                الوارد في {formatPeriodLabel(rolloverFromKey)}:{' '}
                <strong className="text-emerald-success">
                  {formatMinorUnits(rolloverSourceSummary.totalIncomeMinor, state.profile.currency)}
                </strong>
              </div>
              <div>
                الصادر في {formatPeriodLabel(rolloverFromKey)}:{' '}
                <strong className="text-danger-coral">
                  {formatMinorUnits(rolloverSourceSummary.totalExpenseMinor, state.profile.currency)}
                </strong>
              </div>
              <div>
                إجمالي الفوائض القابلة للتصدير:{' '}
                <strong className="text-cyan-accent">
                  {formatMinorUnits(
                    rolloverSourceSummary.totalRemainingCategoryBudgetMinor,
                    state.profile.currency
                  )}
                </strong>
              </div>
            </div>
          </div>

          {closingFeedback && (
            <div className="p-4 rounded-2xl bg-emerald-success/15 border border-emerald-success/40 text-xs text-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-success shrink-0" />
              <span>{closingFeedback}</span>
            </div>
          )}

          {isRolloverDone ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-bg-secondary border border-emerald-success/30 text-sm text-emerald-success font-semibold">
                تم اعتماد إغلاق {formatPeriodLabel(rolloverFromKey)} وتصدير الأرصدة إلى{' '}
                {formatPeriodLabel(rolloverToKey)} بنجاح.
              </div>
              {state.closingReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-bg-secondary border border-white/10 space-y-2 text-xs"
                >
                  <div className="font-bold text-text-primary">
                    مراجعة {rev.fromPeriodKey} ← {rev.toPeriodKey} (إجمالي المرحل:{' '}
                    {formatMinorUnits(rev.totalCarryoverMinor, state.profile.currency)})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {rev.decisions.map((d) => (
                      <div
                        key={d.categoryId}
                        className="p-2.5 rounded-xl bg-surface-primary border border-white/5"
                      >
                        <div className="font-semibold text-text-primary">{d.categoryName}</div>
                        <div className="text-text-muted tabular-nums">
                          المرحل: {formatMinorUnits(d.carriedOverMinor, state.profile.currency)} (
                          {d.decisionMode})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleExecuteClosing} className="space-y-4">
              <div className="space-y-3">
                {rolloverSourceSummary.categoryStatuses.map((cat) => {
                  const decision = decisionsMap[cat.categoryId] || {
                    mode: 'none',
                    customMajor: '0',
                  };
                  const maxMajor = Math.max(0, Math.floor(cat.remainingMinor / 100));

                  return (
                    <div
                      key={cat.categoryId}
                      className="p-4 rounded-2xl bg-bg-secondary/90 border border-white/10 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-text-primary">
                            {cat.categoryName}
                          </div>
                          <div className="text-xs text-text-muted tabular-nums mt-0.5">
                            المخصص:{' '}
                            {formatMinorUnits(cat.allocatedMinor, state.profile.currency)} •
                            المنفق: {formatMinorUnits(cat.spentMinor, state.profile.currency)}
                          </div>
                        </div>

                        <div className="text-xs font-bold tabular-nums">
                          الفائض المتبقي:{' '}
                          <span className="text-emerald-success">
                            {formatMinorUnits(cat.remainingMinor, state.profile.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {(
                          [
                            { id: 'full', label: `ترحيل كامل الفائض (${maxMajor})` },
                            { id: 'custom', label: 'ترحيل مبلغ مخصص' },
                            { id: 'none', label: 'تصفير الفائض' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={cat.remainingMinor <= 0 && opt.id !== 'none'}
                            onClick={() =>
                              setDecisionsMap((prev) => ({
                                ...prev,
                                [cat.categoryId]: {
                                  ...decision,
                                  mode: opt.id,
                                },
                              }))
                            }
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all min-h-[40px] ${
                              decision.mode === opt.id
                                ? 'bg-primary-violet text-white border-primary-violet'
                                : 'bg-surface-primary text-text-secondary border-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}

                        {decision.mode === 'custom' && (
                          <input
                            type="number"
                            min={0}
                            max={maxMajor}
                            value={decision.customMajor}
                            onChange={(e) =>
                              setDecisionsMap((prev) => ({
                                ...prev,
                                [cat.categoryId]: {
                                  ...decision,
                                  customMajor: e.target.value,
                                },
                              }))
                            }
                            className="lifeos-input w-28 text-xs font-bold tabular-nums"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="p-4 rounded-2xl bg-surface-primary border border-primary-violet/40 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={explicitApproveChecked}
                  onChange={(e) => setExplicitApproveChecked(e.target.checked)}
                  className="w-5 h-5 accent-primary-violet"
                />
                <span className="text-xs font-medium text-text-primary">
                  أؤكد مراجعتي لأرصدة شهر {formatPeriodLabel(rolloverFromKey)} وأوافق على تصدير
                  وترحيل المبالغ المحددة أعلاه إلى شهر {formatPeriodLabel(rolloverToKey)}.
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-emerald-success hover:opacity-95 text-bg-primary text-sm font-bold shadow-lg transition-all min-h-[48px]"
              >
                اعتماد وتصدير الرصيد إلى {formatPeriodLabel(rolloverToKey)}
              </button>
            </form>
          )}
        </motion.div>
      )}

      {/* Popup Modals */}
      <TransactionPopupModal
        key={
          txPopupOpen
            ? `${txPopupInitial?.mode}_${txPopupInitial?.transaction?.id || txPopupInitial?.defaultCategoryId || txPopupInitial?.defaultType || 'new'}`
            : 'closed'
        }
        open={txPopupOpen}
        initial={txPopupInitial}
        onClose={() => setTxPopupOpen(false)}
      />

      <CategoryDetailModal
        open={selectedCategoryId !== null}
        categoryStatus={selectedCategoryStatus}
        onClose={() => setSelectedCategoryId(null)}
        onOpenNewTxInCategory={(catId) =>
          openCreateTxPopup({ defaultType: 'expense', defaultCategoryId: catId })
        }
        onEditTransaction={(tx) => openEditTxPopup(tx)}
      />
    </div>
  );
}
