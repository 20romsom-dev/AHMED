'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeftRight,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Plus,
  Repeat,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatMinorUnits, toMinorUnits } from '@/domain/finance/engine';
import { FinancialTransaction, TransactionType } from '@/domain/types';

export interface TransactionPopupInitial {
  mode: 'create' | 'edit';
  transaction?: FinancialTransaction;
  defaultType?: TransactionType;
  defaultCategoryId?: string | null;
  defaultAccountId?: string;
  defaultAmountMajor?: string;
  defaultDescription?: string;
  defaultDate?: string;
}

interface TransactionPopupModalProps {
  open: boolean;
  initial: TransactionPopupInitial | null;
  onClose: () => void;
}

const PAYMENT_TAGS = [
  'كاش',
  'فيزا / كارت',
  'انستاباي',
  'محفظة إلكترونية',
  'فواتير',
  'أساسي',
  'طوارئ',
];

const INCOME_PRESETS = ['الراتب الشهري', 'بونص / حافز', 'عمل حر', 'عائد / أرباح', 'مرتجع'];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export function TransactionPopupModal({
  open,
  initial,
  onClose,
}: TransactionPopupModalProps) {
  const {
    state,
    currentPeriodSummary,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
  } = useLifeOS();

  const todayISO = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayISO = yesterdayDate.toISOString().slice(0, 10);
  const monthStartISO = `${state.activePeriodKey}-01`;

  const initTx = initial?.mode === 'edit' ? initial.transaction : undefined;
  const initAccount =
    initTx?.accountId ||
    initial?.defaultAccountId ||
    state.accounts.find((a) => !a.isArchived)?.id ||
    'acc_bank_main';
  const initToAccount =
    initTx?.toAccountId ||
    state.accounts.find((a) => a.id !== initAccount && !a.isArchived)?.id ||
    '';

  const [txType, setTxType] = useState<TransactionType>(
    initTx?.type ?? initial?.defaultType ?? 'expense'
  );
  const [amountStr, setAmountStr] = useState(
    initTx ? String(initTx.amountMinor / 100) : initial?.defaultAmountMajor || ''
  );
  const [dateISO, setDateISO] = useState(
    initTx?.date ?? initial?.defaultDate ?? todayISO
  );
  const [accountId, setAccountId] = useState(initAccount);
  const [toAccountId, setToAccountId] = useState(initToAccount);
  const [categoryId, setCategoryId] = useState<string | null>(
    initTx
      ? initTx.categoryId ?? null
      : initial?.defaultCategoryId !== undefined
      ? initial.defaultCategoryId
      : state.categories.find((c) => c.type === 'expense' && !c.isArchived)?.id || null
  );
  const [description, setDescription] = useState(
    initTx?.description ?? initial?.defaultDescription ?? ''
  );
  const [notes, setNotes] = useState(initTx?.notes ?? '');
  const [selectedTag, setSelectedTag] = useState<string>(() =>
    initTx?.notes ? PAYMENT_TAGS.find((tag) => initTx.notes.includes(tag)) || '' : ''
  );
  const [isRecurring, setIsRecurring] = useState(initTx?.isRecurring ?? false);

  // Inline quick category creation inside popup
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('1500');
  const [newCatColor, setNewCatColor] = useState('#35D6E8');

  // 2-step delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => !a.isArchived),
    [state.accounts]
  );

  const expenseCategories = useMemo(
    () => state.categories.filter((c) => c.type === 'expense' && !c.isArchived),
    [state.categories]
  );

  const handleQuickAmountAdd = (val: number) => {
    const current = Number(amountStr) || 0;
    setAmountStr(String(current + val));
  };

  const handleCreateQuickCategory = () => {
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      icon: 'Tag',
      color: newCatColor,
      type: 'expense',
      defaultMonthlyBudgetMinor: toMinorUnits(newCatBudget || '0'),
    });
    setNewCatName('');
    setShowNewCat(false);
  };

  const buildNotesWithTag = () => {
    const cleanNotes = notes.trim();
    if (!selectedTag) return cleanNotes;
    if (cleanNotes.includes(selectedTag)) return cleanNotes;
    return cleanNotes ? `${selectedTag} • ${cleanNotes}` : selectedTag;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minor = toMinorUnits(amountStr);
    if (minor <= 0) return;

    const finalDesc =
      description.trim() ||
      (txType === 'transfer'
        ? 'تحويل بين الحسابات'
        : txType === 'income'
        ? 'دخل / راتب وارد'
        : expenseCategories.find((c) => c.id === categoryId)?.name || 'مصروف مسجل');

    const finalNotes = buildNotesWithTag();

    if (initial?.mode === 'edit' && initial.transaction) {
      updateTransaction(initial.transaction.id, {
        type: txType,
        amountMinor: minor,
        accountId,
        toAccountId: txType === 'transfer' ? toAccountId : null,
        categoryId: txType === 'expense' ? categoryId : null,
        date: dateISO,
        description: finalDesc,
        notes: finalNotes,
        isRecurring,
      });
    } else {
      addTransaction({
        type: txType,
        amountMinor: minor,
        accountId,
        toAccountId: txType === 'transfer' ? toAccountId : null,
        categoryId: txType === 'expense' ? categoryId : null,
        date: dateISO,
        description: finalDesc,
        notes: finalNotes,
        isRecurring,
        idempotencyKey: `modal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      });
    }

    onClose();
  };

  const handleDuplicate = () => {
    const minor = toMinorUnits(amountStr);
    if (minor <= 0) return;
    addTransaction({
      type: txType,
      amountMinor: minor,
      accountId,
      toAccountId: txType === 'transfer' ? toAccountId : null,
      categoryId: txType === 'expense' ? categoryId : null,
      date: todayISO,
      description: description.trim() || 'نسخة معاملة',
      notes: buildNotesWithTag(),
      isRecurring,
      idempotencyKey: `dup_${Date.now()}`,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!initial?.transaction) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteTransaction(initial.transaction.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={initial?.mode === 'edit' ? 'تعديل العملية المالية' : 'تسجيل عملية مالية جديدة'}
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
            className="relative z-10 w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface-primary border border-white/15 shadow-2xl p-5 space-y-4"
          >
            {/* Mobile drag handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  {initial?.mode === 'edit' ? 'تعديل العملية المالية' : 'إضافة عملية مالية'}
                </h2>
                <p className="text-xs text-text-muted">
                  ربط مرن بالفئة وتاريخ العملية مع تحديث فوري للأرصدة والميزانية
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق النافذة"
                className="p-2.5 rounded-full bg-bg-secondary text-text-secondary hover:text-text-primary min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Selector: Expense / Income / Transfer */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-bg-secondary border border-white/10">
              {(
                [
                  {
                    id: 'expense',
                    label: 'صادر (مصروف)',
                    icon: TrendingDown,
                    activeClass: 'bg-danger-coral text-white shadow-md',
                  },
                  {
                    id: 'income',
                    label: 'وارد (دخل/راتب)',
                    icon: TrendingUp,
                    activeClass: 'bg-emerald-success text-bg-primary shadow-md',
                  },
                  {
                    id: 'transfer',
                    label: 'تحويل داخلي',
                    icon: ArrowLeftRight,
                    activeClass: 'bg-cyan-accent text-bg-primary shadow-md',
                  },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const active = txType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTxType(t.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[42px] ${
                      active ? t.activeClass : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount + Quick Amount Chips */}
              <div className="p-4 rounded-2xl bg-bg-secondary border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>المبلغ ({state.profile.currency})</span>
                  {amountStr && (
                    <button
                      type="button"
                      onClick={() => setAmountStr('')}
                      className="text-danger-coral hover:underline"
                    >
                      مسح
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-3xl font-extrabold text-text-primary tabular-nums focus:outline-none"
                  required
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmountAdd(val)}
                      className="px-3 py-1.5 rounded-full bg-surface-primary hover:bg-primary-violet/25 border border-white/10 text-xs font-semibold text-text-secondary hover:text-text-primary tabular-nums transition-all"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry Date + Quick Date Chips */}
              <div className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                    <Calendar className="w-3.5 h-3.5 text-cyan-accent" />
                    <span>تاريخ إدخال العملية (يرتبط بالشهر تلقائياً)</span>
                  </label>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-violet/20 text-primary-violet-light tabular-nums">
                    شهر: {dateISO.slice(0, 7)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                    className="lifeos-input flex-1 text-sm tabular-nums min-h-[42px]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setDateISO(todayISO)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      dateISO === todayISO
                        ? 'bg-primary-violet text-white border-primary-violet'
                        : 'bg-surface-primary text-text-secondary border-white/10'
                    }`}
                  >
                    اليوم
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateISO(yesterdayISO)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      dateISO === yesterdayISO
                        ? 'bg-primary-violet text-white border-primary-violet'
                        : 'bg-surface-primary text-text-secondary border-white/10'
                    }`}
                  >
                    أمس
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateISO(monthStartISO)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      dateISO === monthStartISO
                        ? 'bg-primary-violet text-white border-primary-violet'
                        : 'bg-surface-primary text-text-secondary border-white/10'
                    }`}
                  >
                    أول الشهر
                  </button>
                </div>
              </div>

              {/* Multi-Option Category Picker (for Expense) */}
              {txType === 'expense' && (
                <div className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                      <Tag className="w-3.5 h-3.5 text-primary-violet-light" />
                      <span>ربط المصروف بالفئة (خيارات متعددة)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewCat((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs text-cyan-accent hover:underline font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>فئة جديدة</span>
                    </button>
                  </div>

                  {showNewCat && (
                    <div className="p-3 rounded-xl bg-surface-primary border border-cyan-accent/30 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="اسم الفئة الجديدة"
                        className="lifeos-input flex-1 min-w-[130px] text-xs py-2"
                      />
                      <input
                        type="number"
                        value={newCatBudget}
                        onChange={(e) => setNewCatBudget(e.target.value)}
                        placeholder="الميزانية"
                        className="lifeos-input w-24 text-xs py-2 tabular-nums"
                      />
                      <input
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={handleCreateQuickCategory}
                        className="px-3 py-2 rounded-xl bg-cyan-accent text-bg-primary text-xs font-bold"
                      >
                        إضافة
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-0.5">
                    {expenseCategories.map((cat) => {
                      const status = currentPeriodSummary.categoryStatuses.find(
                        (s) => s.categoryId === cat.id
                      );
                      const selected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id)}
                          className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 min-h-[54px] ${
                            selected
                              ? 'bg-primary-violet/20 border-primary-violet shadow-sm'
                              : 'bg-surface-primary/80 border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-xs font-bold text-text-primary truncate">
                                {cat.name}
                              </span>
                            </div>
                            {selected && <Check className="w-3.5 h-3.5 text-primary-violet-light shrink-0" />}
                          </div>
                          {status && (
                            <span
                              className={`text-[10px] tabular-nums ${
                                status.remainingMinor < 0
                                  ? 'text-danger-coral'
                                  : 'text-emerald-success'
                              }`}
                            >
                              متبقي: {formatMinorUnits(status.remainingMinor, state.profile.currency)}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCategoryId(null)}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-center gap-0.5 min-h-[54px] ${
                        categoryId === null
                          ? 'bg-cyan-accent/20 border-cyan-accent'
                          : 'bg-surface-primary/80 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <span className="text-xs font-bold text-text-primary">بدون فئة (حر)</span>
                      <span className="text-[10px] text-text-muted">يخصم من الحساب فقط</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Income Presets */}
              {txType === 'income' && (
                <div className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 space-y-2">
                  <span className="text-xs font-semibold text-text-secondary block">
                    تصنيف الدخل الوارد (اختيار سريع)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {INCOME_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDescription(preset)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          description === preset
                            ? 'bg-emerald-success text-bg-primary border-emerald-success'
                            : 'bg-surface-primary text-text-secondary border-white/10 hover:text-text-primary'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Accounts Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="inline-flex items-center gap-1 text-xs text-text-secondary mb-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-success" />
                    <span>{txType === 'transfer' ? 'من الحساب' : 'الحساب / المحفظة'}</span>
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="lifeos-input w-full text-xs min-h-[42px]"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (
                        {formatMinorUnits(
                          currentPeriodSummary.accountBalancesMinor[acc.id] ?? 0,
                          acc.currency
                        )}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                {txType === 'transfer' && (
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">
                      إلى الحساب المستلم
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="lifeos-input w-full text-xs min-h-[42px]"
                    >
                      {activeAccounts
                        .filter((a) => a.id !== accountId)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Payment Method / Context Tags */}
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-accent" />
                  <span>وسيلة الدفع / وسم العملية</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                        selectedTag === tag
                          ? 'bg-cyan-accent text-bg-primary border-cyan-accent'
                          : 'bg-bg-secondary text-text-muted border-white/10 hover:text-text-primary'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">الوصف</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="مثال: مشتريات السوبرماركت"
                    className="lifeos-input w-full text-sm min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">ملاحظات إضافية</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تفاصيل اختيارية..."
                    className="lifeos-input w-full text-sm min-h-[42px]"
                  />
                </div>
              </div>

              {/* Recurring Toggle */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-bg-secondary border border-white/10 cursor-pointer">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <Repeat className="w-4 h-4 text-primary-violet-light" />
                  <span>عملية شهرية متكررة (راتب / اشتراك / قسط)</span>
                </span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 accent-primary-violet"
                />
              </label>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-5 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-bold shadow-lg transition-all min-h-[46px]"
                >
                  {initial?.mode === 'edit' ? 'حفظ التعديلات' : 'تسجيل العملية الآن'}
                </button>

                {initial?.mode === 'edit' && (
                  <>
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      title="تكرار العملية بتاريخ اليوم"
                      className="p-3 rounded-full bg-bg-secondary border border-white/10 text-text-secondary hover:text-cyan-accent min-h-[46px] min-w-[46px] flex items-center justify-center"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className={`px-4 py-3 rounded-full text-xs font-bold border transition-all min-h-[46px] inline-flex items-center gap-1.5 ${
                        confirmDelete
                          ? 'bg-danger-coral text-white border-danger-coral'
                          : 'bg-bg-secondary text-danger-coral border-danger-coral/30 hover:bg-danger-coral/15'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{confirmDelete ? 'تأكيد الحذف؟' : 'حذف'}</span>
                    </button>
                  </>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
