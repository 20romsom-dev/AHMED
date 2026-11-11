'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Edit3,
  Landmark,
  Layers,
  PiggyBank,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatMinorUnits, toMinorUnits } from '@/domain/finance/engine';
import {
  CarryoverDecisionMode,
  CategoryCarryoverInput,
  TransactionType,
} from '@/domain/types';

interface FinanceMoneyStudioProps {
  externalWizardOpen?: boolean;
  onCloseExternalWizard?: () => void;
}

export function FinanceMoneyStudio({
  externalWizardOpen = false,
  onCloseExternalWizard,
}: FinanceMoneyStudioProps) {
  const {
    state,
    currentPeriodSummary,
    previousPeriodSummary,
    prevPeriodKey,
    isPrevMonthClosed,
    setActivePeriodKey,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    updateCategoryBudget,
    archiveCategory,
    addAccount,
    archiveAccount,
    reconcileAccount,
    confirmMonthlyRollover,
  } = useLifeOS();

  const [subView, setSubView] = useState<
    'overview' | 'budgets' | 'transactions' | 'accounts' | 'closing'
  >(externalWizardOpen ? 'closing' : 'overview');

  React.useEffect(() => {
    if (externalWizardOpen) {
      setSubView('closing');
    }
  }, [externalWizardOpen]);

  const todayISO = new Date().toISOString().slice(0, 10);

  // Transaction form state
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txAccountId, setTxAccountId] = useState(state.accounts[0]?.id || 'acc_bank_main');
  const [txToAccountId, setTxToAccountId] = useState(
    state.accounts[1]?.id || 'acc_cash_wallet'
  );
  const [txCategoryId, setTxCategoryId] = useState<string>('cat_food');
  const [txUncategorized, setTxUncategorized] = useState(false);
  const [txDesc, setTxDesc] = useState('');
  const [txDate, setTxDate] = useState(todayISO);

  // Transaction ledger search, filter & inline edit state
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | TransactionType>('all');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');

  // Category creation & rename state
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('2000');
  const [newCatColor, setNewCatColor] = useState('#8B5CF6');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Account creation & reconciliation state
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('5000');
  const [reconcileAccId, setReconcileAccId] = useState(state.accounts[0]?.id || 'acc_bank_main');
  const [reconcileCounted, setReconcileCounted] = useState('');

  // Monthly Closing & Carryover Wizard state
  const [decisionsMap, setDecisionsMap] = useState<
    Record<string, { mode: CarryoverDecisionMode; customMajor: string }>
  >(() => {
    const init: Record<string, { mode: CarryoverDecisionMode; customMajor: string }> = {};
    for (const c of previousPeriodSummary.categoryStatuses) {
      init[c.categoryId] = {
        mode: c.remainingMinor > 0 ? 'full' : 'none',
        customMajor: String(Math.max(0, Math.floor(c.remainingMinor / 100))),
      };
    }
    return init;
  });
  const [explicitApproveChecked, setExplicitApproveChecked] = useState(false);
  const [closingFeedback, setClosingFeedback] = useState<string | null>(null);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return;
    const minor = toMinorUnits(txAmount);

    addTransaction({
      type: txType,
      amountMinor: minor,
      accountId: txAccountId,
      toAccountId: txType === 'transfer' ? txToAccountId : null,
      categoryId:
        txType === 'expense' ? (txUncategorized ? null : txCategoryId) : null,
      date: txDate,
      description:
        txDesc.trim() ||
        (txType === 'transfer'
          ? 'تحويل بين الحسابات الشخصية'
          : txType === 'income'
          ? 'دفعة دخل واردة'
          : 'مصروف مسجل'),
      notes: '',
      isRecurring: false,
    });
    setTxAmount('');
    setTxDesc('');
  };

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

  const handleExecuteClosing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!explicitApproveChecked) {
      setClosingFeedback('يرجى التأشير على مربع التأكيد الصريح قبل تنفيذ الترحيل الشهري.');
      return;
    }

    try {
      const inputs: CategoryCarryoverInput[] = previousPeriodSummary.categoryStatuses.map(
        (cat) => {
          const entry = decisionsMap[cat.categoryId] || {
            mode: 'none' as CarryoverDecisionMode,
            customMajor: '0',
          };
          return {
            categoryId: cat.categoryId,
            mode: entry.mode,
            customAmountMinor:
              entry.mode === 'custom' ? toMinorUnits(entry.customMajor || '0') : undefined,
          };
        }
      );

      const review = confirmMonthlyRollover(prevPeriodKey, state.activePeriodKey, inputs);
      setClosingFeedback(
        `تم إغلاق شهر ${prevPeriodKey} بنجاح وترحيل ${formatMinorUnits(
          review.totalCarryoverMinor,
          state.profile.currency
        )} إلى ميزانيات شهر ${state.activePeriodKey} دون المساس بأرصدة الحسابات الفعلية.`
      );
      if (onCloseExternalWizard) onCloseExternalWizard();
    } catch (err) {
      setClosingFeedback(err instanceof Error ? err.message : 'تعذر إتمام الإغلاق الشهري');
    }
  };

  const exportTransactionsCSV = () => {
    const headers = ['Date,Period,Type,Description,Amount_EGP,Account,Category'];
    const rows = state.transactions.map((t) => {
      const amtMajor = (t.amountMinor / 100).toFixed(2);
      const accName = state.accounts.find((a) => a.id === t.accountId)?.name || t.accountId;
      const catName = t.categoryId
        ? state.categories.find((c) => c.id === t.categoryId)?.name || t.categoryId
        : 'غير مصنف';
      return `${t.date},${t.periodKey},${t.type},"${t.description}",${amtMajor},"${accName}","${catName}"`;
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
    return state.transactions.filter((t) => {
      if (t.periodKey !== state.activePeriodKey) return false;
      if (txTypeFilter !== 'all' && t.type !== txTypeFilter) return false;
      if (!q) return true;
      return t.description.toLowerCase().includes(q);
    });
  }, [state.transactions, state.activePeriodKey, txSearch, txTypeFilter]);

  return (
    <div className="space-y-5 pb-28">
      {/* Header & Period Switcher */}
      <div className="lifeos-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-emerald-success font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>محرك محاسبة دقيق بوحدات العملة الصغرى (بدون أخطاء الفاصلة العائمة)</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mt-1">
            استوديو المالية والميزانيات الشهرية
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={state.activePeriodKey}
            onChange={(e) => setActivePeriodKey(e.target.value)}
            aria-label="اختيار الشهر المالي"
            className="lifeos-input text-xs font-bold tabular-nums"
          >
            <option value="2026-11">نوفمبر 2026 (2026-11)</option>
            <option value="2026-10">أكتوبر 2026 (2026-10)</option>
          </select>

          <button
            type="button"
            onClick={exportTransactionsCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-surface-highlight hover:bg-primary-violet text-xs text-text-primary transition-all min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'overview', label: 'اللوحة المالية والراتب', icon: Wallet },
            { id: 'budgets', label: 'ميزانيات الفئات', icon: Layers },
            { id: 'transactions', label: 'سجل المعاملات والتحويلات', icon: Receipt },
            { id: 'accounts', label: 'الحسابات والادخار والمطابقة', icon: Landmark },
            {
              id: 'closing',
              label: isPrevMonthClosed
                ? 'سجل الإغلاق الشهري ✓'
                : `معالج إغلاق الشهر (${prevPeriodKey}) • معلق`,
              icon: RefreshCw,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isClosingAlert = tab.id === 'closing' && !isPrevMonthClosed;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all min-h-[44px] ${
                subView === tab.id
                  ? 'bg-primary-violet text-white shadow-md'
                  : isClosingAlert
                  ? 'bg-warning-amber/20 text-warning-amber border border-warning-amber/50'
                  : 'bg-surface-primary text-text-secondary hover:text-text-primary border border-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Strict Separation KPI Cards: Cash Balance vs Budget Availability */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lifeos-card p-4 border-emerald-success/30">
          <div className="text-xs text-text-muted">السيولة النقدية الفعلية بالحسابات</div>
          <div className="text-lg sm:text-xl font-bold text-emerald-success tabular-nums mt-1">
            {formatMinorUnits(
              currentPeriodSummary.totalAvailableCashMinor,
              state.profile.currency
            )}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            تُحسب من دفتر الأستاذ للحسابات فقط
          </div>
        </div>

        <div className="lifeos-card p-4">
          <div className="text-xs text-text-muted">إجمالي الدخل ({state.activePeriodKey})</div>
          <div className="text-lg sm:text-xl font-bold text-text-primary tabular-nums mt-1">
            {formatMinorUnits(currentPeriodSummary.totalIncomeMinor, state.profile.currency)}
          </div>
          <div className="text-[11px] text-emerald-success mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>شامل الراتب والدخل الإضافي</span>
          </div>
        </div>

        <div className="lifeos-card p-4">
          <div className="text-xs text-text-muted">إجمالي المصروفات الفعلية</div>
          <div className="text-lg sm:text-xl font-bold text-danger-coral tabular-nums mt-1">
            {formatMinorUnits(currentPeriodSummary.totalExpenseMinor, state.profile.currency)}
          </div>
          <div className="text-[11px] text-text-muted tabular-nums mt-0.5">
            منها غير مصنف:{' '}
            {formatMinorUnits(
              currentPeriodSummary.uncategorizedExpenseMinor,
              state.profile.currency
            )}
          </div>
        </div>

        <div className="lifeos-card p-4">
          <div className="text-xs text-text-muted">إجمالي الميزانيات المخصصة (+المرحل)</div>
          <div className="text-lg sm:text-xl font-bold text-primary-violet-light tabular-nums mt-1">
            {formatMinorUnits(
              currentPeriodSummary.totalEffectiveBudgetMinor,
              state.profile.currency
            )}
          </div>
          <div className="text-[11px] text-text-muted tabular-nums mt-0.5">
            مرحل معتمد:{' '}
            {formatMinorUnits(
              currentPeriodSummary.totalCarryoverBudgetMinor,
              state.profile.currency
            )}
          </div>
        </div>

        <div className="lifeos-card p-4 border-cyan-accent/30 col-span-2 lg:col-span-1">
          <div className="text-xs text-text-muted">المتبقي في ميزانيات الفئات</div>
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

      {/* 1. OVERVIEW & QUICK TRANSACTION STUDIO */}
      {subView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            {/* Category Utilization Progress Bars */}
            <div className="lifeos-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-text-primary">
                  حالة ميزانيات الفئات لشهر {state.activePeriodKey}
                </h2>
                <button
                  type="button"
                  onClick={() => setSubView('budgets')}
                  className="text-xs text-primary-violet-light hover:underline"
                >
                  تعديل الميزانيات والفئات
                </button>
              </div>

              <div className="space-y-3.5">
                {currentPeriodSummary.categoryStatuses.map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="p-3.5 rounded-2xl bg-bg-secondary/90 border border-white/10 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-bold text-text-primary">
                          {cat.categoryName}
                        </span>
                        {cat.carryoverMinor > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-success/15 text-emerald-success tabular-nums">
                            + مرحل {formatMinorUnits(cat.carryoverMinor, state.profile.currency)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-text-secondary">
                        المتبقي:{' '}
                        <strong
                          className={
                            cat.remainingMinor < 0 ? 'text-danger-coral' : 'text-emerald-success'
                          }
                        >
                          {formatMinorUnits(cat.remainingMinor, state.profile.currency)}
                        </strong>
                      </span>
                    </div>

                    <div className="h-2.5 rounded-full bg-surface-primary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, cat.utilizationPercent)}%`,
                          backgroundColor:
                            cat.overspentMinor > 0 ? 'var(--danger-coral)' : cat.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted tabular-nums">
                      <span>
                        المخصص الأصلي: {formatMinorUnits(cat.allocatedMinor, state.profile.currency)}
                      </span>
                      <span>
                        المنفق الفعلي: {formatMinorUnits(cat.spentMinor, state.profile.currency)} (
                        {cat.utilizationPercent}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Salary & Income Sources */}
            <div className="lifeos-card p-5 space-y-3">
              <h3 className="text-base font-bold text-text-primary">
                مصادر الدخل والراتب الشهري
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.incomeSources.map((src) => (
                  <div
                    key={src.id}
                    className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 space-y-1"
                  >
                    <div className="text-sm font-semibold text-text-primary">{src.name}</div>
                    <div className="text-base font-bold text-emerald-success tabular-nums">
                      {formatMinorUnits(src.expectedAmountMinor, state.profile.currency)}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      يوم الصرف: {src.paydayOfMonth} من كل شهر •{' '}
                      {src.isRecurring ? 'دوري' : 'مرن'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Record Transaction Form */}
          <div className="lg:col-span-5 lifeos-card p-5 space-y-4">
            <h2 className="text-base font-bold text-text-primary">
              تسجيل معاملة جديدة (مصروف / دخل / تحويل)
            </h2>

            <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-bg-secondary border border-white/10 text-xs">
              {(
                [
                  { id: 'expense', label: 'مصروف صادر', icon: TrendingDown },
                  { id: 'income', label: 'دخل وارد', icon: TrendingUp },
                  { id: 'transfer', label: 'تحويل بين حساباتي', icon: ArrowLeftRight },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTxType(t.id)}
                    className={`py-2.5 px-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
                      txType === t.id
                        ? 'bg-primary-violet text-white shadow'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">
                    المبلغ ({state.profile.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="350.00"
                    className="lifeos-input w-full text-sm font-bold tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="lifeos-input w-full text-sm tabular-nums"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  {txType === 'transfer' ? 'من الحساب' : 'الحساب المالي'}
                </label>
                <select
                  value={txAccountId}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="lifeos-input w-full text-sm"
                >
                  {state.accounts
                    .filter((a) => !a.isArchived)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (
                        {formatMinorUnits(
                          currentPeriodSummary.accountBalancesMinor[acc.id] ?? 0,
                          state.profile.currency
                        )}
                        )
                      </option>
                    ))}
                </select>
              </div>

              {txType === 'transfer' && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">
                    إلى الحساب المستلم (لا يُحتسب مصروفاً أو دخلاً)
                  </label>
                  <select
                    value={txToAccountId}
                    onChange={(e) => setTxToAccountId(e.target.value)}
                    className="lifeos-input w-full text-sm"
                  >
                    {state.accounts
                      .filter((a) => !a.isArchived && a.id !== txAccountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {txType === 'expense' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-secondary">فئة الميزانية</label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-cyan-accent cursor-pointer">
                      <input
                        type="checkbox"
                        checked={txUncategorized}
                        onChange={(e) => setTxUncategorized(e.target.checked)}
                      />
                      <span>مصروف غير مصنف (يخصم من الحساب فقط)</span>
                    </label>
                  </div>
                  {!txUncategorized && (
                    <select
                      value={txCategoryId}
                      onChange={(e) => setTxCategoryId(e.target.value)}
                      className="lifeos-input w-full text-sm"
                    >
                      {state.categories
                        .filter((c) => !c.isArchived && c.type === 'expense')
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-text-secondary mb-1">الوصف والبيان</label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="مثال: مشتريات البقالة أو فاتورة الكهرباء"
                  className="lifeos-input w-full text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-semibold shadow-md transition-all min-h-[44px]"
              >
                تسجيل المعاملة في الدفتر
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. BUDGETS & CATEGORIES MANAGEMENT */}
      {subView === 'budgets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 lifeos-card p-5 space-y-4">
            <h2 className="text-base font-bold text-text-primary">
              تخصيص ميزانيات الفئات لشهر {state.activePeriodKey}
            </h2>
            <p className="text-xs text-text-secondary">
              تخصيص الميزانية يوزع خطتك الشهرية ولا يُعد إنفاقاً فعلياً من رصيدك النقدي.
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
                        <span className="text-sm font-bold text-text-primary">
                          {cat.categoryName}
                        </span>
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
                    <label className="text-xs text-text-muted">المخصص الشهري:</label>
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

      {/* 3. TRANSACTIONS LEDGER (SEARCH, FILTER, INLINE EDIT, DELETE) */}
      {subView === 'transactions' && (
        <div className="lifeos-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-text-primary">
              دفتر المعاملات الكامل لشهر {state.activePeriodKey} ({periodTransactions.length})
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute right-3 top-3" />
                <input
                  type="search"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="بحث في المعاملات..."
                  className="lifeos-input pr-8 text-xs py-1.5"
                />
              </div>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value as 'all' | TransactionType)}
                className="lifeos-input text-xs py-1.5"
              >
                <option value="all">كل الأنواع</option>
                <option value="expense">مصروفات</option>
                <option value="income">إيرادات</option>
                <option value="transfer">تحويلات</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            {periodTransactions.map((tx) => {
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
                  className="p-3.5 rounded-2xl bg-bg-secondary/90 border border-white/10 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    {editingTxId === tx.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editTxDesc}
                          onChange={(e) => setEditTxDesc(e.target.value)}
                          className="lifeos-input text-xs py-1 px-2"
                        />
                        <input
                          type="number"
                          value={editTxAmount}
                          onChange={(e) => setEditTxAmount(e.target.value)}
                          className="lifeos-input text-xs py-1 px-2 w-24 tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editTxDesc.trim() && Number(editTxAmount) > 0) {
                              updateTransaction(tx.id, {
                                description: editTxDesc.trim(),
                                amountMinor: toMinorUnits(editTxAmount),
                              });
                            }
                            setEditingTxId(null);
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-success text-bg-primary text-xs font-bold"
                        >
                          حفظ التعديل
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
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
                            ? 'دخل وارد'
                            : tx.type === 'transfer'
                            ? `تحويل إلى ${toAcc?.name || ''}`
                            : cat
                            ? cat.name
                            : 'غير مصنف'}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-text-muted tabular-nums mt-1">
                      {tx.date} • الحساب: {acc?.name || tx.accountId}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTxId(tx.id);
                        setEditTxDesc(tx.description);
                        setEditTxAmount(String(tx.amountMinor / 100));
                      }}
                      aria-label={`تعديل المعاملة ${tx.description}`}
                      className="p-2 rounded-xl text-text-muted hover:text-cyan-accent"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      aria-label={`حذف المعاملة ${tx.description}`}
                      className="p-2 rounded-xl text-text-muted hover:text-danger-coral"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
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

            {/* Savings Goals & Debt Tracking */}
            <div className="lifeos-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-religious-gold" />
                <h3 className="text-base font-bold text-text-primary">
                  أهداف الادخار ومتابعة الأقساط والالتزامات
                </h3>
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
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-text-primary">{g.title}</span>
                        <span className="tabular-nums text-emerald-success">
                          {formatMinorUnits(g.currentAmountMinor, state.profile.currency)} /{' '}
                          {formatMinorUnits(g.targetAmountMinor, state.profile.currency)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-primary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-success"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {state.debts.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-2xl bg-bg-secondary border border-warning-amber/30 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-text-primary">{d.title}</div>
                      <div className="text-[11px] text-text-muted">
                        الجهة: {d.counterparty} • القسط الشهري:{' '}
                        {formatMinorUnits(d.monthlyInstallmentMinor, state.profile.currency)}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-warning-amber tabular-nums">
                      متبقي {formatMinorUnits(d.remainingAmountMinor, state.profile.currency)}
                    </span>
                  </div>
                ))}
              </div>
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
                  placeholder="الرصيد الفعلي الحالي بالجنيه"
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

      {/* 5. MANDATORY MONTHLY CLOSING & CARRYOVER WIZARD */}
      {subView === 'closing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lifeos-card-elevated p-6 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-primary-violet/20 text-primary-violet-light text-xs font-semibold">
                معالج الإغلاق الشهري وترحيل الميزانيات ({prevPeriodKey} ← {state.activePeriodKey})
              </span>
              <h2 className="text-xl font-bold text-text-primary mt-2">
                مراجعة أرصدة وفوائض ميزانيات الشهر السابق
              </h2>
              <p className="text-xs text-text-secondary mt-1 max-w-2xl">
                قاعدة محرك LifeOS المحاسبية: ترحيل الفائض يزيد من مخصص الفئة في الشهر الجديد فقط ولا
                يخلق نقداً وهمياً في حساباتك البنكية أو النقدية.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 text-xs space-y-1 tabular-nums">
              <div>
                دخل شهر {prevPeriodKey}:{' '}
                <strong className="text-emerald-success">
                  {formatMinorUnits(previousPeriodSummary.totalIncomeMinor, state.profile.currency)}
                </strong>
              </div>
              <div>
                مصروفات شهر {prevPeriodKey}:{' '}
                <strong className="text-danger-coral">
                  {formatMinorUnits(previousPeriodSummary.totalExpenseMinor, state.profile.currency)}
                </strong>
              </div>
              <div>
                إجمالي الفوائض القابلة للترحيل:{' '}
                <strong className="text-cyan-accent">
                  {formatMinorUnits(
                    previousPeriodSummary.totalRemainingCategoryBudgetMinor,
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

          {isPrevMonthClosed ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-bg-secondary border border-emerald-success/30 text-sm text-emerald-success font-semibold">
                تم اعتماد وإغلاق شهر {prevPeriodKey} رسمياً (محمي ضد التكرار Idempotent).
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
                {previousPeriodSummary.categoryStatuses.map((cat) => {
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
                            { id: 'full', label: `ترحيل كامل الفائض (${maxMajor} ج.م)` },
                            { id: 'custom', label: 'ترحيل مبلغ مخصص' },
                            { id: 'none', label: 'عدم ترحيل (تصفير الفائض)' },
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
                  أؤكد مراجعتي لأرصدة شهر {prevPeriodKey} وأوافق صراحةً على قرارات ترحيل الميزانية
                  المحددة أعلاه إلى شهر {state.activePeriodKey}.
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-emerald-success hover:opacity-95 text-bg-primary text-sm font-bold shadow-lg transition-all min-h-[48px]"
              >
                اعتماد الإغلاق الشهري وتطبيق الترحيل الآن
              </button>
            </form>
          )}
        </motion.div>
      )}
    </div>
  );
}
