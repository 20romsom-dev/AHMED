'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  Edit3,
  Plus,
  Receipt,
  SlidersHorizontal,
  TrendingDown,
  X,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import { CategoryBudgetStatus, formatMinorUnits, toMinorUnits } from '@/domain/finance/engine';
import { FinancialTransaction } from '@/domain/types';

interface CategoryDetailModalProps {
  open: boolean;
  categoryStatus: CategoryBudgetStatus | null;
  onClose: () => void;
  onOpenNewTxInCategory: (categoryId: string) => void;
  onEditTransaction: (tx: FinancialTransaction) => void;
}

export function CategoryDetailModal({
  open,
  categoryStatus,
  onClose,
  onOpenNewTxInCategory,
  onEditTransaction,
}: CategoryDetailModalProps) {
  const { state, addTransaction, updateCategoryBudget } = useLifeOS();
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetMajor, setBudgetMajor] = useState('');

  const todayISO = new Date().toISOString().slice(0, 10);

  const categoryTransactions = useMemo(() => {
    if (!categoryStatus) return [];
    return state.transactions
      .filter(
        (t) =>
          t.periodKey === state.activePeriodKey &&
          t.type === 'expense' &&
          t.categoryId === categoryStatus.categoryId
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, state.activePeriodKey, categoryStatus]);

  const dailySafeMinor = useMemo(() => {
    if (!categoryStatus || categoryStatus.remainingMinor <= 0) return 0;
    const [y, m] = state.activePeriodKey.split('-').map((n) => parseInt(n, 10));
    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === y && now.getMonth() + 1 === m;
    const daysInMonth = new Date(y, m, 0).getDate();
    const remainingDays = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : daysInMonth;
    return Math.floor(categoryStatus.remainingMinor / remainingDays);
  }, [categoryStatus, state.activePeriodKey]);

  if (!categoryStatus) return null;

  const handleQuickSpend = (e: React.FormEvent) => {
    e.preventDefault();
    const minor = toMinorUnits(quickAmount);
    if (minor <= 0) return;

    const defaultDate =
      todayISO.slice(0, 7) === state.activePeriodKey
        ? todayISO
        : `${state.activePeriodKey}-15`;

    addTransaction({
      type: 'expense',
      amountMinor: minor,
      accountId: state.accounts.find((a) => !a.isArchived)?.id || 'acc_bank_main',
      categoryId: categoryStatus.categoryId,
      date: defaultDate,
      description: quickDesc.trim() || `مصروف ${categoryStatus.categoryName}`,
      notes: 'إدخال سريع من داخل الفئة',
      isRecurring: false,
      idempotencyKey: `cat_quick_${categoryStatus.categoryId}_${Date.now()}`,
    });
    setQuickAmount('');
    setQuickDesc('');
  };

  const handleSaveBudget = () => {
    updateCategoryBudget(
      categoryStatus.categoryId,
      state.activePeriodKey,
      toMinorUnits(budgetMajor || '0')
    );
    setEditingBudget(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل فئة ${categoryStatus.categoryName}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface-primary border border-white/15 shadow-2xl p-5 space-y-4"
          >
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full shrink-0 ring-4 ring-white/10"
                  style={{ backgroundColor: categoryStatus.color }}
                />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {categoryStatus.categoryName}
                  </h2>
                  <p className="text-xs text-text-muted tabular-nums">
                    شهر {state.activePeriodKey} • {categoryTransactions.length} عملية مسجلة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="p-2.5 rounded-full bg-bg-secondary text-text-secondary hover:text-text-primary min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Budget Summary & Progress */}
            <div className="p-4 rounded-2xl bg-bg-secondary border border-white/10 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                <div>
                  <div className="text-text-muted">المخصص</div>
                  <div className="font-bold text-text-primary mt-0.5">
                    {formatMinorUnits(categoryStatus.allocatedMinor, state.profile.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted">المرحل</div>
                  <div className="font-bold text-cyan-accent mt-0.5">
                    +{formatMinorUnits(categoryStatus.carryoverMinor, state.profile.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted">المنفق</div>
                  <div className="font-bold text-danger-coral mt-0.5">
                    {formatMinorUnits(categoryStatus.spentMinor, state.profile.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted">المتبقي</div>
                  <div
                    className={`font-bold mt-0.5 ${
                      categoryStatus.remainingMinor < 0
                        ? 'text-danger-coral'
                        : 'text-emerald-success'
                    }`}
                  >
                    {formatMinorUnits(categoryStatus.remainingMinor, state.profile.currency)}
                  </div>
                </div>
              </div>

              <div className="h-3 rounded-full bg-surface-primary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, categoryStatus.utilizationPercent)}%`,
                    backgroundColor:
                      categoryStatus.overspentMinor > 0
                        ? 'var(--danger-coral)'
                        : categoryStatus.color,
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
                <span>
                  المسموح يومياً:{' '}
                  <strong className="text-emerald-success tabular-nums">
                    {formatMinorUnits(dailySafeMinor, state.profile.currency)} / يوم
                  </strong>
                </span>

                {editingBudget ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={budgetMajor}
                      onChange={(e) => setBudgetMajor(e.target.value)}
                      className="lifeos-input w-24 py-1 px-2 text-xs tabular-nums"
                      placeholder="المبلغ"
                    />
                    <button
                      type="button"
                      onClick={handleSaveBudget}
                      className="px-2.5 py-1 rounded-lg bg-emerald-success text-bg-primary font-bold text-xs"
                    >
                      حفظ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetMajor(String(Math.floor(categoryStatus.allocatedMinor / 100)));
                      setEditingBudget(true);
                    }}
                    className="inline-flex items-center gap-1 text-primary-violet-light hover:underline font-semibold"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>تعديل مخصص الفئة</span>
                  </button>
                )}
              </div>
            </div>

            {/* Smooth Quick-Spend Bar inside Category */}
            <form
              onSubmit={handleQuickSpend}
              className="p-3.5 rounded-2xl bg-primary-violet/10 border border-primary-violet/30 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary inline-flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-danger-coral" />
                  <span>صرف سريع داخل «{categoryStatus.categoryName}»</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewTxInCategory(categoryStatus.categoryId);
                  }}
                  className="text-[11px] text-cyan-accent hover:underline font-semibold"
                >
                  خيارات متقدمة (بوب أب كامل) ↗
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="المبلغ"
                  className="lifeos-input w-28 text-sm font-bold tabular-nums min-h-[42px]"
                  required
                />
                <input
                  type="text"
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                  placeholder="البيان (مثلاً: غداء، طلبات...)"
                  className="lifeos-input flex-1 min-w-[140px] text-sm min-h-[42px]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-xs font-bold inline-flex items-center gap-1 min-h-[42px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>صرف</span>
                </button>
              </div>
            </form>

            {/* Category Transactions List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-secondary inline-flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>سجل عمليات الفئة (اضغط على أي عملية للتعديل)</span>
                </h3>
              </div>

              {categoryTransactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-bg-secondary/60 border border-white/5 text-center text-xs text-text-muted">
                  لا توجد مصروفات مسجلة في هذه الفئة خلال شهر {state.activePeriodKey} حتى الآن.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                  {categoryTransactions.map((tx) => {
                    const acc = state.accounts.find((a) => a.id === tx.accountId);
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditTransaction(tx);
                        }}
                        className="w-full text-right p-3 rounded-2xl bg-bg-secondary hover:bg-surface-highlight/60 border border-white/10 flex items-center justify-between gap-3 transition-all group"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-text-primary truncate">
                            {tx.description}
                          </div>
                          <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {tx.date}
                            </span>
                            <span>• {acc?.name || tx.accountId}</span>
                            {tx.notes && <span className="truncate">• {tx.notes}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-danger-coral tabular-nums">
                            -{formatMinorUnits(tx.amountMinor, state.profile.currency)}
                          </span>
                          <Edit3 className="w-3.5 h-3.5 text-text-muted group-hover:text-cyan-accent" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
