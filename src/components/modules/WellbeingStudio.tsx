'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Droplets,
  Edit3,
  Flame,
  HeartPulse,
  Moon,
  Smile,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';

export function WellbeingStudio() {
  const {
    state,
    toggleHabitDate,
    addHabit,
    updateHabit,
    deleteHabit,
    updateWellnessToday,
  } = useLifeOS();

  const todayISO = new Date().toISOString().slice(0, 10);
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const todayWellness = state.wellnessLogs[todayISO] || {
    date: todayISO,
    waterCups: 6,
    waterTargetCups: 8,
    sleepHours: 7.5,
    exerciseMinutes: 35,
    activityType: 'مشي سريع وتمارين إطالة',
    mood: 4 as const,
    moodLabel: 'صافٍ ومتوازن',
    notes: '',
  };

  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('صحة');
  const [newHabitFrequency, setNewHabitFrequency] = useState<'daily' | 'weekly'>('daily');
  const [newHabitColor, setNewHabitColor] = useState('#36D6A1');
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editHabitTitle, setEditHabitTitle] = useState('');

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    addHabit(newHabitTitle.trim(), newHabitCategory, newHabitColor, newHabitFrequency);
    setNewHabitTitle('');
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="lifeos-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-cyan-accent font-semibold">
            <HeartPulse className="w-4 h-4" />
            <span>متابعة متوازنة للعادات اليومية والأسبوعية والنمط الصحي</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mt-1">العادات والصحة وجودة الحياة</h1>
        </div>
      </div>

      {/* Daily Health & Lifestyle Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Water Intake */}
        <div className="lifeos-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-accent flex items-center gap-1.5">
              <Droplets className="w-4 h-4" />
              شرب الماء اليومي
            </span>
            <span className="text-xs text-text-muted tabular-nums">
              {todayWellness.waterCups} / {todayWellness.waterTargetCups} أكواب
            </span>
          </div>
          <div className="text-2xl font-bold text-text-primary tabular-nums">
            {Math.round((todayWellness.waterCups / todayWellness.waterTargetCups) * 100)}%
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateWellnessToday({
                  waterCups: Math.max(0, todayWellness.waterCups - 1),
                })
              }
              className="px-3 py-1.5 rounded-xl bg-bg-secondary border border-white/10 text-xs min-h-[38px]"
            >
              -
            </button>
            <button
              type="button"
              onClick={() =>
                updateWellnessToday({
                  waterCups: todayWellness.waterCups + 1,
                })
              }
              className="flex-1 py-2 rounded-xl bg-cyan-accent text-bg-primary text-xs font-bold min-h-[38px]"
            >
              + كوب ماء
            </button>
          </div>
        </div>

        {/* Sleep Duration */}
        <div className="lifeos-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-violet-light flex items-center gap-1.5">
              <Moon className="w-4 h-4" />
              ساعات النوم والراحة
            </span>
            <span className="text-xs text-text-muted">الهدف: 8 ساعات</span>
          </div>
          <div className="text-2xl font-bold text-text-primary tabular-nums">
            {todayWellness.sleepHours} ساعة
          </div>
          <input
            type="range"
            min="3"
            max="11"
            step="0.5"
            value={todayWellness.sleepHours}
            onChange={(e) =>
              updateWellnessToday({ sleepHours: parseFloat(e.target.value) })
            }
            aria-label="ساعات النوم"
            className="w-full accent-primary-violet"
          />
        </div>

        {/* Exercise & Activity */}
        <div className="lifeos-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-success flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              النشاط البدني والتمرين
            </span>
            <span className="text-xs text-text-muted tabular-nums">دقائق اليوم</span>
          </div>
          <div className="text-2xl font-bold text-text-primary tabular-nums">
            {todayWellness.exerciseMinutes} دقيقة
          </div>
          <div className="flex items-center gap-2">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateWellnessToday({ exerciseMinutes: m })}
                className={`flex-1 py-1.5 rounded-xl text-xs tabular-nums min-h-[36px] ${
                  todayWellness.exerciseMinutes === m
                    ? 'bg-emerald-success text-bg-primary font-bold'
                    : 'bg-bg-secondary text-text-secondary border border-white/10'
                }`}
              >
                {m}د
              </button>
            ))}
          </div>
        </div>

        {/* Mood & Energy */}
        <div className="lifeos-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-religious-gold flex items-center gap-1.5">
              <Smile className="w-4 h-4" />
              الحالة الذهنية والمزاج
            </span>
            <span className="text-xs text-text-muted">{todayWellness.moodLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-1 pt-2">
            {(
              [
                { val: 1, label: 'مرهق' },
                { val: 2, label: 'هادئ' },
                { val: 3, label: 'متوازن' },
                { val: 4, label: 'نشط' },
                { val: 5, label: 'متألق' },
              ] as const
            ).map((m) => (
              <button
                key={m.val}
                type="button"
                onClick={() =>
                  updateWellnessToday({ mood: m.val, moodLabel: m.label })
                }
                className={`px-2.5 py-2 rounded-xl text-xs transition-all min-h-[36px] ${
                  todayWellness.mood === m.val
                    ? 'bg-religious-gold text-bg-primary font-bold'
                    : 'bg-bg-secondary text-text-secondary border border-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Habits & 7-Day Streak Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 lifeos-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-warning-amber" />
              <h2 className="text-base font-bold text-text-primary">
                مصفوفة الالتزام الأسبوعي وسجل العادات ({state.habits.length})
              </h2>
            </div>
            <span className="text-xs text-text-muted">آخر 7 أيام</span>
          </div>

          <div className="space-y-3">
            {state.habits.map((habit) => {
              const completedCount = habit.completedDates.length;
              return (
                <motion.div
                  key={habit.id}
                  layout
                  className="p-4 rounded-2xl bg-bg-secondary/90 border border-white/10 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: habit.color }}
                      />
                      {editingHabitId === habit.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editHabitTitle}
                            onChange={(e) => setEditHabitTitle(e.target.value)}
                            className="lifeos-input text-xs py-1 px-2 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editHabitTitle.trim()) {
                                updateHabit(habit.id, { title: editHabitTitle.trim() });
                              }
                              setEditingHabitId(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-success text-bg-primary text-xs font-bold"
                          >
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-text-primary">
                            {habit.title}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface-highlight text-text-secondary">
                            {habit.category} • {habit.frequency === 'weekly' ? 'أسبوعي' : 'يومي'}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-success tabular-nums">
                        {completedCount} أيام
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHabitId(habit.id);
                          setEditHabitTitle(habit.title);
                        }}
                        aria-label={`تعديل العادة ${habit.title}`}
                        className="p-1.5 rounded-lg text-text-muted hover:text-cyan-accent"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteHabit(habit.id)}
                        aria-label={`حذف العادة ${habit.title}`}
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger-coral"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 7-Day Interactive Heatmap Row */}
                  <div className="grid grid-cols-7 gap-2">
                    {last7Days.map((dateStr) => {
                      const isDone = habit.completedDates.includes(dateStr);
                      const isToday = dateStr === todayISO;
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => toggleHabitDate(habit.id, dateStr)}
                          className={`p-2 rounded-xl border text-center transition-all min-h-[48px] flex flex-col items-center justify-center ${
                            isDone
                              ? 'bg-emerald-success/20 border-emerald-success text-emerald-success font-bold'
                              : isToday
                              ? 'bg-surface-highlight/70 border-primary-violet/50 text-text-primary'
                              : 'bg-surface-primary border-white/5 text-text-muted'
                          }`}
                        >
                          <span className="text-[10px] tabular-nums">{dateStr.slice(8, 10)}</span>
                          <span className="text-xs mt-0.5">{isDone ? '✓' : '·'}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Add New Habit Form */}
        <div className="lg:col-span-4 lifeos-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-violet-light" />
            <h3 className="text-base font-bold text-text-primary">إضافة عادة جديدة</h3>
          </div>
          <form onSubmit={handleCreateHabit} className="space-y-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">اسم العادة</label>
              <input
                type="text"
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                placeholder="مثال: المشي 30 دقيقة بعد العصر"
                className="lifeos-input w-full text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-text-secondary mb-1">التصنيف</label>
                <select
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value)}
                  className="lifeos-input w-full text-sm"
                >
                  <option value="صحة">صحة ولياقة</option>
                  <option value="روحانيات">روحانيات وذكر</option>
                  <option value="تعلم">قراءة وتعلم</option>
                  <option value="مالية">انضباط مالي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">الدورية</label>
                <select
                  value={newHabitFrequency}
                  onChange={(e) => setNewHabitFrequency(e.target.value as 'daily' | 'weekly')}
                  className="lifeos-input w-full text-sm"
                >
                  <option value="daily">يومية</option>
                  <option value="weekly">أسبوعية</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">اللون</label>
              <input
                type="color"
                value={newHabitColor}
                onChange={(e) => setNewHabitColor(e.target.value)}
                className="h-10 w-full rounded-xl bg-bg-secondary border border-white/10 p-1 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-semibold min-h-[44px]"
            >
              + إضافة العادة للمتابعة
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
