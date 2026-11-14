'use client';

import React, { useMemo } from 'react';
import { PeriodFinancialSummary, formatMinorUnits } from '@/domain/finance/engine';
import { Flame, ShieldCheck, Sparkles } from 'lucide-react';

interface FinanceAnalyticsBarProps {
  summary: PeriodFinancialSummary;
  currency: string;
}

export function FinanceAnalyticsBar({ summary, currency }: FinanceAnalyticsBarProps) {
  const { totalIncomeMinor, totalExpenseMinor, categoryStatuses } = summary;

  const savingsRate = useMemo(() => {
    if (totalIncomeMinor <= 0) return 0;
    const net = totalIncomeMinor - totalExpenseMinor;
    return Math.round((net / totalIncomeMinor) * 100);
  }, [totalIncomeMinor, totalExpenseMinor]);

  const dailySafeToSpendMinor = useMemo(() => {
    const [y, m] = summary.periodKey.split('-').map((n) => parseInt(n, 10));
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const daysInMonth = new Date(y, m, 0).getDate();
    const remainingDays = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : daysInMonth;
    return Math.max(0, Math.floor(summary.totalRemainingCategoryBudgetMinor / remainingDays));
  }, [summary.periodKey, summary.totalRemainingCategoryBudgetMinor]);

  // Build SVG Donut segments for top spending categories
  const donutSegments = useMemo(() => {
    const spentCats = categoryStatuses
      .filter((c) => c.spentMinor > 0)
      .sort((a, b) => b.spentMinor - a.spentMinor);
    const total = spentCats.reduce((s, c) => s + c.spentMinor, 0);
    if (total <= 0) return [];

    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return spentCats.slice(0, 6).map((c) => {
      const ratio = c.spentMinor / total;
      const length = ratio * circumference;
      const seg = {
        id: c.categoryId,
        name: c.categoryName,
        color: c.color,
        percent: Math.round(ratio * 100),
        spentMinor: c.spentMinor,
        strokeDasharray: `${length} ${circumference - length}`,
        strokeDashoffset: -offset,
      };
      offset += length;
      return seg;
    });
  }, [categoryStatuses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Category Donut Breakdown */}
      <div className="md:col-span-7 lifeos-card p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
            />
            {donutSegments.map((seg) => (
              <circle
                key={seg.id}
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] text-text-muted">إجمالي الصرف</span>
            <span className="text-xs font-extrabold text-text-primary tabular-nums">
              {formatMinorUnits(totalExpenseMinor, currency)}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2">
          <div className="text-xs font-bold text-text-primary">توزيع المصروفات حسب الفئة</div>
          {donutSegments.length === 0 ? (
            <p className="text-xs text-text-muted">
              لا توجد مصروفات مصنفة في هذا الشهر لعرض الرسم البياني بعد.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {donutSegments.map((seg) => (
                <div key={seg.id} className="flex items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-text-secondary truncate">{seg.name}</span>
                  </div>
                  <span className="font-bold text-text-primary tabular-nums shrink-0">
                    {seg.percent}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Safe-to-Spend & Savings Health */}
      <div className="md:col-span-5 lifeos-card p-4 sm:p-5 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-text-muted inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-warning-amber" />
              <span>المسموح إنفاقه يومياً بأمان</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-success tabular-nums mt-1">
              {formatMinorUnits(dailySafeToSpendMinor, currency)}
              <span className="text-xs font-normal text-text-muted"> / يوم</span>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${
              savingsRate >= 20
                ? 'bg-emerald-success/20 text-emerald-success'
                : savingsRate >= 0
                ? 'bg-warning-amber/20 text-warning-amber'
                : 'bg-danger-coral/20 text-danger-coral'
            }`}
          >
            ادخار {savingsRate}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-text-muted tabular-nums">
            <span>نسبة الصرف من الدخل</span>
            <span>
              {totalIncomeMinor > 0
                ? Math.min(100, Math.round((totalExpenseMinor / totalIncomeMinor) * 100))
                : 0}
              %
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  totalIncomeMinor > 0
                    ? Math.min(100, Math.round((totalExpenseMinor / totalIncomeMinor) * 100))
                    : 0
                }%`,
                backgroundColor:
                  totalExpenseMinor > totalIncomeMinor
                    ? 'var(--danger-coral)'
                    : 'var(--emerald-success)',
              }}
            />
          </div>
        </div>

        <div className="text-[11px] text-text-muted flex items-center gap-1.5">
          {savingsRate >= 20 ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-success shrink-0" />
              <span>معدل ادخار ممتاز! يمكنك ترحيل الفائض أو تعزيز أهداف الادخار.</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-cyan-accent shrink-0" />
              <span>اضغط على أي فئة لتسجيل مصروف أو مراجعة تفاصيلها بمرونة.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
