'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Archive,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  FolderKanban,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Timer,
  Trash2,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  applyPrayerManualAdjustments,
  detectPrayerScheduleConflicts,
  PRAYER_ARABIC_NAMES,
} from '@/domain/deen/verified-data';
import { PrayerName, TaskPriority } from '@/domain/types';

export function PlannerStudio() {
  const {
    state,
    prayerSchedule,
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
    updatePrayerSettings,
  } = useLifeOS();

  const [subView, setSubView] = useState<'schedule' | 'tasks' | 'projects' | 'focus'>('schedule');
  const [calendarMode, setCalendarMode] = useState<
    'daily' | 'weekly' | 'monthly' | 'agenda' | 'timeblocking'
  >('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);

  // Task creation & editing form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('عمل');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('high');
  const [taskTime, setTaskTime] = useState('12:00');
  const [taskRecurrence, setTaskRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>(
    'NONE'
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  // Event creation & editing form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('15:30');
  const [eventEnd, setEventEnd] = useState('16:30');
  const [eventCategory, setEventCategory] = useState('عمل');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');

  // Project creation form state
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('2026-12-15');

  // Focus timer state
  const [focusMinutesConfig, setFocusMinutesConfig] = useState(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusLabel, setFocusLabel] = useState('جلسة تركيز عميق بدون مشتتات');

  useEffect(() => {
    if (!focusRunning) return;
    const interval = setInterval(() => {
      setFocusSecondsLeft((prev) => {
        if (prev <= 1) {
          setFocusRunning(false);
          recordFocusSession(focusLabel, focusMinutesConfig);
          return focusMinutesConfig * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [focusRunning, focusLabel, focusMinutesConfig, recordFocusSession]);

  const todayISO = new Date().toISOString().slice(0, 10);

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

  const scheduleConflicts = useMemo(
    () =>
      detectPrayerScheduleConflicts({
        timings: adjustedTimings,
        settings: state.prayerSettings,
        events: state.events.filter((e) => e.date === todayISO),
      }),
    [adjustedTimings, state.prayerSettings, state.events, todayISO]
  );

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.tasks.filter((t) => {
      if (!showArchivedTasks && t.isArchived) return false;
      if (showArchivedTasks && !t.isArchived) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [state.tasks, searchQuery, showArchivedTasks]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTask({
      title: taskTitle.trim(),
      description: '',
      dueDate: todayISO,
      dueTime: taskTime,
      priority: taskPriority,
      category: taskCategory,
      recurrenceRule: taskRecurrence === 'NONE' ? null : taskRecurrence,
      subtasks: [],
      notes: '',
    });
    setTaskTitle('');
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    addEvent({
      title: eventTitle.trim(),
      description: '',
      date: todayISO,
      startTime: eventStart,
      endTime: eventEnd,
      isAllDay: false,
      category: eventCategory,
      color: '#8B5CF6',
      reminderMinutes: 15,
      notes: '',
    });
    setEventTitle('');
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    addProject({
      title: projectTitle.trim(),
      description: 'مشروع جديد ضمن خطة الإنجاز',
      color: '#35D6E8',
      status: 'active',
      deadline: projectDeadline,
      milestones: [
        { id: `ms_${Date.now()}_1`, title: 'تحديد النطاق والأهداف', isCompleted: false },
        { id: `ms_${Date.now()}_2`, title: 'التنفيذ والمراجعة النهائية', isCompleted: false },
      ],
      notes: '',
    });
    setProjectTitle('');
  };

  // Merge user events and prayer layer into chronological timeline
  const mergedTimeline = useMemo(() => {
    const items: {
      id: string;
      type: 'event' | 'prayer';
      title: string;
      startTime: string;
      endTime: string;
      color: string;
      category: string;
    }[] = state.events
      .filter((e) => e.date === todayISO)
      .map((e) => ({
        id: e.id,
        type: 'event',
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        color: e.color,
        category: e.category,
      }));

    if (state.prayerSettings.showInPlanner) {
      const obligatory: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      for (const p of obligatory) {
        const start = adjustedTimings[p].split(' ')[0];
        const [h, m] = start.split(':').map((n) => parseInt(n, 10));
        const endTotal = h * 60 + m + state.prayerSettings.reserveMinutesAround;
        const endHH = String(Math.floor((endTotal % 1440) / 60)).padStart(2, '0');
        const endMM = String(endTotal % 60).padStart(2, '0');
        items.push({
          id: `prayer_${p}`,
          type: 'prayer',
          title: `صلاة ${PRAYER_ARABIC_NAMES[p]} (وقت محجوز ${state.prayerSettings.reserveMinutesAround} د)`,
          startTime: start,
          endTime: `${endHH}:${endMM}`,
          color: '#D5B978',
          category: 'صلاة مفروضة',
        });
      }
    }

    return items.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [state.events, state.prayerSettings, adjustedTimings, todayISO]);

  // Generate 7-day weekly grid dates
  const weekDays = useMemo(() => {
    const names = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    return names.map((name, idx) => ({
      name,
      dayNum: 7 + idx,
      isToday: idx === 3,
      eventsCount: idx === 3 ? mergedTimeline.length : (idx % 2) + 1,
    }));
  }, [mergedTimeline.length]);

  return (
    <div className="space-y-5 pb-28">
      {/* Header & Sub-Navigation */}
      <div className="lifeos-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">التخطيط المتقدم وإدارة الوقت</h1>
          <p className="text-xs text-text-secondary mt-1">
            التقويم الزمني المتكامل مع أوقات الصلاة، المهام الفرعية، المشاريع، ووضع التركيز العميق.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'schedule', label: 'التقويم والصلوات', icon: CalendarIcon },
              { id: 'tasks', label: 'المهام', icon: CheckCircle2 },
              { id: 'projects', label: 'المشاريع', icon: FolderKanban },
              { id: 'focus', label: 'وضع التركيز', icon: Timer },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubView(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all min-h-[44px] ${
                  subView === tab.id
                    ? 'bg-primary-violet text-white shadow-md'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conflict Alert Banner if an appointment overlaps a prayer block */}
      {scheduleConflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-warning-amber/15 border border-warning-amber/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-warning-amber shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-warning-amber">
                تنبيه تداخل موعد مع وقت الصلاة المحجوز
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                الموعد «{scheduleConflicts[0].eventTitle}» يتقاطع مع وقت صلاة{' '}
                {scheduleConflicts[0].prayerNameAr} ({scheduleConflicts[0].prayerTime}). يمكنك تعديل
                وقت الموعد بنقرة واحدة لتفادي التعارض.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              updateEvent(scheduleConflicts[0].eventId, {
                startTime: '12:30',
                endTime: '13:30',
              })
            }
            className="px-3.5 py-2 rounded-full bg-warning-amber text-bg-primary text-xs font-bold min-h-[38px]"
          >
            إزاحة الموعد إلى ما بعد الصلاة
          </button>
        </div>
      )}

      {/* 1. SCHEDULE & PRAYER TIME-BLOCKING VIEW */}
      {subView === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 lifeos-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">
                  الجدول الزمني وحجز أوقات الصلاة
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-highlight text-xs text-primary-violet-light tabular-nums">
                  {todayISO}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updatePrayerSettings({
                      showInPlanner: !state.prayerSettings.showInPlanner,
                    })
                  }
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all min-h-[38px] flex items-center gap-1.5 ${
                    state.prayerSettings.showInPlanner
                      ? 'bg-religious-gold/20 border-religious-gold text-religious-gold font-semibold'
                      : 'bg-bg-secondary border-white/10 text-text-muted'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>
                    {state.prayerSettings.showInPlanner
                      ? 'طبقة أوقات الصلاة مفعلة'
                      : 'إظهار أوقات الصلاة'}
                  </span>
                </button>

                <div className="inline-flex rounded-full bg-bg-secondary p-1 border border-white/10 text-xs">
                  {(
                    [
                      { id: 'daily', label: 'يومي' },
                      { id: 'weekly', label: 'أسبوعي' },
                      { id: 'monthly', label: 'شهري' },
                      { id: 'agenda', label: 'أجندة' },
                      { id: 'timeblocking', label: 'كتل زمنية' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCalendarMode(m.id)}
                      className={`px-2.5 py-1 rounded-full transition-all ${
                        calendarMode === m.id
                          ? 'bg-primary-violet text-white font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly View Grid */}
            {calendarMode === 'weekly' && (
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-2">
                {weekDays.map((wd) => (
                  <div
                    key={wd.name}
                    className={`p-3 rounded-2xl border text-center space-y-1.5 ${
                      wd.isToday
                        ? 'bg-primary-violet/15 border-primary-violet text-text-primary'
                        : 'bg-bg-secondary/80 border-white/10 text-text-secondary'
                    }`}
                  >
                    <div className="text-xs font-bold">{wd.name}</div>
                    <div className="text-lg font-bold tabular-nums">{wd.dayNum}</div>
                    <div className="text-[10px] px-2 py-0.5 rounded-full bg-surface-highlight text-cyan-accent tabular-nums">
                      {wd.eventsCount} عناصر
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Monthly View Grid (30 Days) */}
            {calendarMode === 'monthly' && (
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-text-muted font-semibold">
                  <span>السبت</span>
                  <span>الأحد</span>
                  <span>الإثنين</span>
                  <span>الثلاثاء</span>
                  <span>الأربعاء</span>
                  <span>الخميس</span>
                  <span>الجمعة</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 30 }, (_, idx) => {
                    const dayNum = idx + 1;
                    const isCurrent = dayNum === 10 || dayNum === 11;
                    return (
                      <div
                        key={dayNum}
                        className={`p-2 rounded-xl border text-center min-h-[54px] flex flex-col items-center justify-between ${
                          isCurrent
                            ? 'bg-primary-violet/20 border-primary-violet text-text-primary font-bold'
                            : 'bg-bg-secondary/60 border-white/5 text-text-secondary'
                        }`}
                      >
                        <span className="text-xs tabular-nums">{dayNum}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-religious-gold" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Time-Blocking Visual Grid */}
            {calendarMode === 'timeblocking' && (
              <div className="space-y-2 pt-2">
                <div className="text-xs text-text-muted">
                  توزيع ساعات اليوم بين العمل العميق، الصلوات المفروضة، والراحة:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {mergedTimeline.map((block) => (
                    <div
                      key={block.id}
                      className="p-3 rounded-xl bg-bg-secondary border-r-4 flex items-center justify-between"
                      style={{ borderRightColor: block.color }}
                    >
                      <span className="text-xs font-bold text-text-primary">{block.title}</span>
                      <span className="text-xs tabular-nums text-cyan-accent">
                        {block.startTime} → {block.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily & Agenda Timeline List */}
            {(calendarMode === 'daily' ||
              calendarMode === 'agenda' ||
              calendarMode === 'weekly') && (
              <div className="space-y-2.5">
                {mergedTimeline.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      item.type === 'prayer'
                        ? 'bg-religious-gold/10 border-religious-gold/35'
                        : 'bg-bg-secondary/90 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-1.5 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        {editingEventId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editEventTitle}
                              onChange={(e) => setEditEventTitle(e.target.value)}
                              className="lifeos-input text-xs py-1 px-2 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editEventTitle.trim()) {
                                  updateEvent(item.id, { title: editEventTitle.trim() });
                                }
                                setEditingEventId(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-success text-bg-primary text-xs font-bold"
                            >
                              حفظ
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-semibold ${
                                item.type === 'prayer'
                                  ? 'text-religious-gold'
                                  : 'text-text-primary'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-highlight/70 text-text-secondary">
                              {item.category}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-text-muted tabular-nums mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {item.startTime} – {item.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {item.type === 'event' && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(item.id);
                            setEditEventTitle(item.title);
                          }}
                          aria-label={`تعديل الموعد ${item.title}`}
                          className="p-2 rounded-xl text-text-muted hover:text-cyan-accent transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEvent(item.id)}
                          aria-label={`حذف الموعد ${item.title}`}
                          className="p-2 rounded-xl text-text-muted hover:text-danger-coral hover:bg-danger-coral/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Add Event Form */}
          <div className="lg:col-span-4 lifeos-card p-5 space-y-4">
            <h3 className="text-base font-bold text-text-primary">إضافة موعد أو فترة زمنية</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">عنوان الموعد</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="مثال: جلسة مراجعة مع الفريق"
                  className="lifeos-input w-full text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">من الساعة</label>
                  <input
                    type="time"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="lifeos-input w-full text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">إلى الساعة</label>
                  <input
                    type="time"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="lifeos-input w-full text-sm tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">التصنيف</label>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value)}
                  className="lifeos-input w-full text-sm"
                >
                  <option value="عمل">عمل</option>
                  <option value="تركيز">جلسة تركيز</option>
                  <option value="صحة">صحة ورياضة</option>
                  <option value="عائلة">عائلة وشخصي</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-semibold shadow-md transition-all min-h-[44px]"
              >
                + جدولة الموعد في التقويم
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. TASKS & SUBTASKS VIEW */}
      {subView === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 lifeos-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">
                  إدارة المهام والمهام الفرعية ({filteredTasks.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShowArchivedTasks((a) => !a)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    showArchivedTasks
                      ? 'bg-primary-violet/20 border-primary-violet text-primary-violet-light'
                      : 'bg-bg-secondary border-white/10 text-text-muted'
                  }`}
                >
                  {showArchivedTasks ? 'عرض المهام النشطة' : 'الأرشيف'}
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-text-muted absolute right-3 top-3" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في المهام والتصنيفات..."
                  className="lifeos-input w-full pr-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-bg-secondary/90 border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                          task.isCompleted
                            ? 'bg-emerald-success border-emerald-success text-bg-primary'
                            : 'border-text-muted'
                        }`}
                      >
                        {task.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editTaskTitle}
                              onChange={(e) => setEditTaskTitle(e.target.value)}
                              className="lifeos-input text-xs py-1 px-2 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editTaskTitle.trim()) {
                                  updateTask(task.id, { title: editTaskTitle.trim() });
                                }
                                setEditingTaskId(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-success text-bg-primary text-xs font-bold"
                            >
                              حفظ
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`text-sm font-semibold ${
                              task.isCompleted
                                ? 'line-through text-text-muted'
                                : 'text-text-primary'
                            }`}
                          >
                            {task.title}
                          </div>
                        )}
                        {task.description && (
                          <p className="text-xs text-text-secondary mt-0.5">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-highlight text-text-secondary">
                            {task.category}
                          </span>
                          {task.recurrenceRule && (
                            <span className="px-2.5 py-0.5 rounded-full bg-primary-violet/20 text-primary-violet-light">
                              متكررة: {task.recurrenceRule}
                            </span>
                          )}
                          <span className="text-text-muted tabular-nums">
                            الاستحقاق: {task.dueDate} {task.dueTime || ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setEditTaskTitle(task.title);
                        }}
                        aria-label={`تعديل المهمة ${task.title}`}
                        className="p-2 rounded-xl text-text-muted hover:text-cyan-accent"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveTask(task.id)}
                        aria-label={`أرشفة المهمة ${task.title}`}
                        className="p-2 rounded-xl text-text-muted hover:text-warning-amber"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        aria-label={`حذف المهمة ${task.title}`}
                        className="p-2 rounded-xl text-text-muted hover:text-danger-coral"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtasks list + add subtask inline */}
                  <div className="pr-9 space-y-2 border-t border-white/5 pt-2.5">
                    {task.subtasks.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubtask(task.id, sub.id)}
                        className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            sub.isCompleted
                              ? 'bg-primary-violet border-primary-violet text-white'
                              : 'border-text-muted'
                          }`}
                        >
                          {sub.isCompleted ? '✓' : ''}
                        </span>
                        <span className={sub.isCompleted ? 'line-through text-text-muted' : ''}>
                          {sub.title}
                        </span>
                      </button>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newSubtaskInputs[task.id] || ''}
                        onChange={(e) =>
                          setNewSubtaskInputs((prev) => ({
                            ...prev,
                            [task.id]: e.target.value,
                          }))
                        }
                        placeholder="أضف خطوة فرعية..."
                        className="bg-surface-primary border border-white/10 rounded-xl px-2.5 py-1 text-xs text-text-primary flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const txt = newSubtaskInputs[task.id] || '';
                          if (txt.trim()) {
                            addSubtask(task.id, txt);
                            setNewSubtaskInputs((prev) => ({ ...prev, [task.id]: '' }));
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-surface-highlight text-xs text-cyan-accent hover:bg-primary-violet hover:text-white"
                      >
                        + فرعية
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 lifeos-card p-5 space-y-4">
            <h3 className="text-base font-bold text-text-primary">إضافة مهمة جديدة</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">عنوان المهمة</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="مثال: إعداد التقرير المالي الشهري"
                  className="lifeos-input w-full text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">الأولوية</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="lifeos-input w-full text-sm"
                  >
                    <option value="urgent">عاجل</option>
                    <option value="high">مرتفع</option>
                    <option value="medium">متوسط</option>
                    <option value="low">منخفض</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">الوقت</label>
                  <input
                    type="time"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    className="lifeos-input w-full text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">التصنيف</label>
                  <input
                    type="text"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="lifeos-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">التكرار</label>
                  <select
                    value={taskRecurrence}
                    onChange={(e) =>
                      setTaskRecurrence(
                        e.target.value as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
                      )
                    }
                    className="lifeos-input w-full text-sm"
                  >
                    <option value="NONE">مرة واحدة</option>
                    <option value="DAILY">يومياً</option>
                    <option value="WEEKLY">أسبوعياً</option>
                    <option value="MONTHLY">شهرياً</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-semibold shadow-md transition-all min-h-[44px]"
              >
                + حفظ المهمة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. PROJECTS & MILESTONES VIEW */}
      {subView === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            {state.projects
              .filter((p) => !p.isArchived)
              .map((prj) => {
                const doneMs = prj.milestones.filter((m) => m.isCompleted).length;
                const pct =
                  prj.milestones.length > 0
                    ? Math.round((doneMs / prj.milestones.length) * 100)
                    : 0;
                return (
                  <div key={prj.id} className="lifeos-card p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-text-primary">{prj.title}</h3>
                        <p className="text-xs text-text-secondary mt-1">{prj.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-primary-violet/20 text-primary-violet-light text-xs font-bold tabular-nums">
                          {pct}% مكتمل
                        </span>
                        <button
                          type="button"
                          onClick={() => archiveProject(prj.id)}
                          title="أرشفة المشروع"
                          className="p-2 rounded-xl text-text-muted hover:text-warning-amber"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: prj.color }}
                      />
                    </div>
                    <div className="space-y-2">
                      {prj.milestones.map((ms) => (
                        <button
                          key={ms.id}
                          type="button"
                          onClick={() => toggleProjectMilestone(prj.id, ms.id)}
                          className="w-full p-3 rounded-xl bg-bg-secondary/80 border border-white/10 flex items-center justify-between text-right hover:border-primary-violet/40"
                        >
                          <span
                            className={`text-xs font-medium ${
                              ms.isCompleted ? 'line-through text-text-muted' : 'text-text-primary'
                            }`}
                          >
                            {ms.title}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              ms.isCompleted
                                ? 'bg-emerald-success/20 text-emerald-success'
                                : 'bg-surface-highlight text-text-muted'
                            }`}
                          >
                            {ms.isCompleted ? 'مكتمل ✓' : 'قيد التنفيذ'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="lg:col-span-4 lifeos-card p-5 space-y-4">
            <h3 className="text-base font-bold text-text-primary">إنشاء مشروع جديد</h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">اسم المشروع</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="مثال: إطلاق الهوية الرقمية"
                  className="lifeos-input w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">الموعد النهائي</label>
                <input
                  type="date"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                  className="lifeos-input w-full text-sm tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-semibold min-h-[44px]"
              >
                + إضافة المشروع
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. FOCUS MODE (POMODORO & DEEP WORK) */}
      {subView === 'focus' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 lifeos-card-elevated p-6 flex flex-col items-center text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-violet/20 text-primary-violet-light text-xs">
              <Timer className="w-4 h-4" />
              <span>وضع التركيز الخالي من المشتتات</span>
            </div>

            <input
              type="text"
              value={focusLabel}
              onChange={(e) => setFocusLabel(e.target.value)}
              className="lifeos-input text-center text-sm max-w-md w-full"
            />

            <div className="text-5xl sm:text-6xl font-bold text-text-primary tabular-nums tracking-wider py-4">
              {String(Math.floor(focusSecondsLeft / 60)).padStart(2, '0')}:
              {String(focusSecondsLeft % 60).padStart(2, '0')}
            </div>

            <div className="flex items-center gap-2">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setFocusRunning(false);
                    setFocusMinutesConfig(mins);
                    setFocusSecondsLeft(mins * 60);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tabular-nums ${
                    focusMinutesConfig === mins
                      ? 'bg-cyan-accent text-bg-primary'
                      : 'bg-bg-secondary text-text-secondary border border-white/10'
                  }`}
                >
                  {mins} دقيقة
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFocusRunning((r) => !r)}
                className="px-6 py-3 rounded-full bg-primary-violet hover:bg-primary-violet-light text-white text-sm font-semibold flex items-center gap-2 min-h-[48px]"
              >
                {focusRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{focusRunning ? 'إيقاف مؤقت' : 'بدء جلسة التركيز'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusRunning(false);
                  setFocusSecondsLeft(focusMinutesConfig * 60);
                }}
                className="p-3 rounded-full bg-bg-secondary text-text-secondary hover:text-text-primary border border-white/10 min-h-[48px]"
                aria-label="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 lifeos-card p-5 space-y-4">
            <h3 className="text-base font-bold text-text-primary">سجل جلسات التركيز المكتملة</h3>
            <div className="space-y-2.5">
              {state.focusSessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-2xl bg-bg-secondary border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">{s.label}</div>
                    <div className="text-xs text-text-muted tabular-nums">
                      {s.startedAt.slice(0, 10)}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-success/20 text-emerald-success text-xs font-bold tabular-nums">
                    {s.completedMinutes} دقيقة
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
