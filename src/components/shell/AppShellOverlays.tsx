'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  Compass,
  HeartPulse,
  Home,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatMinorUnits } from '@/domain/finance/engine';
import {
  parseNaturalLanguageIntent,
  ProposedAssistantAction,
} from '@/domain/intelligence/adaptive';
import { NavTabId } from '@/domain/types';

interface AppShellOverlaysProps {
  quickCapturePreset: string | null;
  onCloseQuickCapture: () => void;
  onOpenMonthlyClosing: () => void;
}

export function AppShellOverlays({
  quickCapturePreset,
  onCloseQuickCapture,
  onOpenMonthlyClosing,
}: AppShellOverlaysProps) {
  const {
    state,
    activeTab,
    setActiveTab,
    addTask,
    addEvent,
    addTransaction,
    saveNote,
    markNotificationRead,
  } = useLifeOS();

  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [globalQuery, setGlobalQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string>(
    'أهلاً بك في المساعد الذكي لـ LifeOS. جرب مثلاً:\n• «نظملي بكرة، عندي شغل الساعة 9، وعايز أتمرن وأقرأ وردي.»\n• «سجل إني صرفت 350 جنيه أكل النهاردة.»'
  );
  const [proposedActions, setProposedActions] = useState<ProposedAssistantAction[]>([]);
  const [executedIds, setExecutedIds] = useState<string[]>([]);

  // Open AI modal when triggered with a preset from Home
  React.useEffect(() => {
    if (quickCapturePreset !== null) {
      setAiModalOpen(true);
      if (quickCapturePreset) {
        setAiPrompt(quickCapturePreset);
        const todayISO = new Date().toISOString().slice(0, 10);
        const res = parseNaturalLanguageIntent(quickCapturePreset, todayISO);
        setAiReply(res.replyAr);
        setProposedActions(res.proposedActions);
        setExecutedIds([]);
      }
    }
  }, [quickCapturePreset]);

  const unreadNotifCount = state.notifications.filter((n) => !n.isRead).length;

  const handleAnalyzePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    const todayISO = new Date().toISOString().slice(0, 10);
    const res = parseNaturalLanguageIntent(aiPrompt, todayISO);
    setAiReply(res.replyAr);
    setProposedActions(res.proposedActions);
    setExecutedIds([]);
  };

  const executeProposedAction = (act: ProposedAssistantAction) => {
    if (executedIds.includes(act.id)) return;
    const todayISO = new Date().toISOString().slice(0, 10);

    if (act.type === 'create_expense' && act.payload.amountMinor) {
      const matchedCat =
        state.categories.find((c) => c.name.includes(act.payload.categoryGuess || '')) ||
        state.categories[0];
      addTransaction({
        type: 'expense',
        amountMinor: act.payload.amountMinor,
        accountId: state.accounts[0]?.id || 'acc_bank_main',
        categoryId: matchedCat?.id || null,
        date: act.payload.dueDate || todayISO,
        description: act.payload.description || 'مصروف عبر المساعد الذكي',
        notes: 'تم التأكيد الصريح من المستخدم',
        isRecurring: false,
      });
    } else if (act.type === 'create_income' && act.payload.amountMinor) {
      addTransaction({
        type: 'income',
        amountMinor: act.payload.amountMinor,
        accountId: state.accounts[0]?.id || 'acc_bank_main',
        categoryId: null,
        date: act.payload.dueDate || todayISO,
        description: act.payload.description || 'دخل وارد عبر المساعد الذكي',
        notes: 'تم التأكيد الصريح من المستخدم',
        isRecurring: false,
      });
    } else if (act.type === 'create_event') {
      addEvent({
        title: act.payload.eventTitle || 'موعد مجدول',
        description: 'تمت جدولته عبر المساعد الذكي',
        date: act.payload.dueDate || todayISO,
        startTime: act.payload.startTime || '09:00',
        endTime: act.payload.endTime || '11:00',
        isAllDay: false,
        category: 'عمل',
        color: '#8B5CF6',
        reminderMinutes: 15,
        notes: '',
      });
    } else if (act.type === 'create_task') {
      addTask({
        title: act.payload.taskTitle || 'مهمة جديدة',
        description: '',
        dueDate: act.payload.dueDate || todayISO,
        dueTime: act.payload.dueTime || '17:00',
        priority: act.payload.priority || 'high',
        category: 'عام',
        recurrenceRule: null,
        subtasks: [],
        notes: '',
      });
    } else if (act.type === 'navigate_tab' && act.payload.targetTab) {
      setActiveTab(act.payload.targetTab);
      setAiModalOpen(false);
    }

    setExecutedIds((prev) => [...prev, act.id]);
  };

  // Global search results across Tasks, Transactions, Notes, Goals
  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { id: string; title: string; subtitle: string; tab: NavTabId }[] = [];

    for (const t of state.tasks) {
      if (t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) {
        results.push({
          id: `sr_t_${t.id}`,
          title: t.title,
          subtitle: `مهمة • ${t.category}`,
          tab: 'planner',
        });
      }
    }
    for (const tx of state.transactions) {
      if (tx.description.toLowerCase().includes(q)) {
        results.push({
          id: `sr_tx_${tx.id}`,
          title: tx.description,
          subtitle: `معاملة مالية • ${formatMinorUnits(tx.amountMinor, state.profile.currency)}`,
          tab: 'finance',
        });
      }
    }
    for (const n of state.notes) {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        results.push({
          id: `sr_n_${n.id}`,
          title: n.title,
          subtitle: `ملاحظة • ${n.category}`,
          tab: 'lifehub',
        });
      }
    }
    return results.slice(0, 8);
  }, [globalQuery, state.tasks, state.transactions, state.notes, state.profile.currency]);

  // Contextual quick actions depending on active screen
  const contextualQuickActions = useMemo(() => {
    if (activeTab === 'finance') {
      return [
        {
          label: 'تسجيل مصروف بالمساعد الذكي',
          action: () => {
            setFabMenuOpen(false);
            setAiPrompt('سجل إني صرفت 350 جنيه أكل النهاردة.');
            setAiModalOpen(true);
          },
        },
        {
          label: 'فتح معالج الإغلاق الشهري',
          action: () => {
            setFabMenuOpen(false);
            onOpenMonthlyClosing();
          },
        },
      ];
    }
    if (activeTab === 'planner') {
      return [
        {
          label: 'تنظيم جدول الغد بالذكاء الاصطناعي',
          action: () => {
            setFabMenuOpen(false);
            setAiPrompt('نظملي بكرة، عندي شغل الساعة 9، وعايز أتمرن وأقرأ وردي.');
            setAiModalOpen(true);
          },
        },
        {
          label: 'إضافة مهمة سريعة اليوم',
          action: () => {
            setFabMenuOpen(false);
            addTask({
              title: 'مهمة سريعة مضافة من الزر العائم',
              description: '',
              dueDate: new Date().toISOString().slice(0, 10),
              dueTime: '16:00',
              priority: 'high',
              category: 'عام',
              recurrenceRule: null,
              subtasks: [],
              notes: '',
            });
          },
        },
      ];
    }
    return [
      {
        label: 'المساعد الذكي والإدخال الطبيعي (AI)',
        action: () => {
          setFabMenuOpen(false);
          setAiModalOpen(true);
        },
      },
      {
        label: 'تسجيل مصروف سريع (350 ج.م)',
        action: () => {
          setFabMenuOpen(false);
          setAiPrompt('سجل إني صرفت 350 جنيه أكل النهاردة.');
          setAiModalOpen(true);
        },
      },
      {
        label: 'تدوين ملاحظة فورية',
        action: () => {
          setFabMenuOpen(false);
          saveNote({
            title: 'ملاحظة سريعة',
            content: 'تم التدوين السريع من لوحة القيادة.',
            category: 'أفكار',
            tags: ['سريع'],
            checklist: [],
            isPinned: false,
            isFavorite: false,
            isJournal: false,
            isArchived: false,
          });
          setActiveTab('lifehub');
        },
      },
    ];
  }, [activeTab, addTask, onOpenMonthlyClosing, saveNote, setActiveTab]);

  return (
    <>
      {/* Top Sticky App Bar */}
      <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-violet via-cyan-accent to-emerald-success p-0.5 shadow-md">
              <div className="w-full h-full bg-bg-primary rounded-[14px] flex items-center justify-center font-bold text-primary-violet-light">
                L
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-text-primary">
                  LifeOS
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-violet/20 text-primary-violet-light">
                  حياتك كلها... بتنظيم أذكى
                </span>
              </div>
              <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-success inline-block" />
                <span>يعمل دون اتصال (Offline-First PWA) • محفوظ محلياً</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="البحث الشامل"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-primary hover:bg-surface-elevated border border-white/10 text-xs text-text-secondary min-h-[42px]"
            >
              <Search className="w-4 h-4 text-cyan-accent" />
              <span className="hidden sm:inline">بحث شامل وأوامر سريعة...</span>
            </button>

            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              aria-label="المساعد الشخصي الذكي"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary-violet/20 hover:bg-primary-violet/30 border border-primary-violet/50 text-xs text-primary-violet-light font-semibold min-h-[42px]"
            >
              <Bot className="w-4 h-4" />
              <span>مساعد الذكاء</span>
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="مركز الإشعارات"
              className="relative p-2.5 rounded-full bg-surface-primary hover:bg-surface-elevated border border-white/10 text-text-secondary min-h-[42px] min-w-[42px] flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-danger-coral text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Notification Center Popover */}
      <AnimatePresence>
        {notifOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-16 left-4 sm:left-8 z-50 w-80 sm:w-96 lifeos-card-elevated p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">
                مركز الإشعارات الذكي ({unreadNotifCount} غير مقروء)
              </span>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {state.notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markNotificationRead(n.id);
                    if (n.actionTab) setActiveTab(n.actionTab);
                    setNotifOpen(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    n.isRead
                      ? 'bg-bg-secondary/50 border-white/5 opacity-70'
                      : 'bg-bg-secondary border-primary-violet/40'
                  }`}
                >
                  <div className="text-xs font-bold text-text-primary">{n.title}</div>
                  <p className="text-[11px] text-text-secondary mt-1">{n.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search & Command Palette Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
          >
            <div className="lifeos-card-elevated w-full max-w-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-5 h-5 text-cyan-accent" />
                  <input
                    type="search"
                    autoFocus
                    value={globalQuery}
                    onChange={(e) => setGlobalQuery(e.target.value)}
                    placeholder="ابحث في المهام، المعاملات المالية، الملاحظات، أو السور..."
                    className="bg-transparent text-sm text-text-primary w-full focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(r.tab);
                        setSearchOpen(false);
                      }}
                      className="w-full p-3 rounded-xl bg-bg-secondary hover:bg-surface-highlight border border-white/10 text-right flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-text-primary">{r.title}</div>
                        <div className="text-[11px] text-text-muted">{r.subtitle}</div>
                      </div>
                      <span className="text-xs text-primary-violet-light">انتقال ←</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-text-muted py-4 text-center">
                  اكتب أي كلمة للبحث الفوري عبر كافة وحدات LifeOS.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant & Natural Language Capture Modal (With Confirmation Gate) */}
      <AnimatePresence>
        {aiModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="lifeos-card-elevated w-full max-w-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-violet-light" />
                  <h2 className="text-base font-bold text-text-primary">
                    مساعد LifeOS الشخصي الذكي (مع بوابة تأكيد العمليات المالية)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAiModalOpen(false);
                    onCloseQuickCapture();
                  }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAiPrompt('نظملي بكرة، عندي شغل الساعة 9، وعايز أتمرن وأقرأ وردي.')
                  }
                  className="px-3 py-1.5 rounded-full bg-bg-secondary border border-white/10 text-[11px] text-text-secondary hover:text-text-primary"
                >
                  «نظملي بكرة، عندي شغل الساعة 9، وعايز أتمرن وأقرأ وردي»
                </button>
                <button
                  type="button"
                  onClick={() => setAiPrompt('سجل إني صرفت 350 جنيه أكل النهاردة.')}
                  className="px-3 py-1.5 rounded-full bg-bg-secondary border border-white/10 text-[11px] text-text-secondary hover:text-text-primary"
                >
                  «سجل إني صرفت 350 جنيه أكل النهاردة»
                </button>
              </div>

              <form onSubmit={handleAnalyzePrompt} className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="اكتب طلبك باللغة العربية الطبيعية..."
                  className="lifeos-input flex-1 text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-2xl bg-primary-violet hover:bg-primary-violet-light text-white text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span>تحليل</span>
                </button>
              </form>

              <div className="p-4 rounded-2xl bg-bg-secondary/90 border border-white/10 text-xs text-text-primary whitespace-pre-line leading-relaxed">
                {aiReply}
              </div>

              {proposedActions.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-text-secondary">
                    الإجراءات المقترحة (يرجى المراجعة والتأكيد):
                  </div>
                  {proposedActions.map((act) => {
                    const isDone = executedIds.includes(act.id);
                    return (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-2xl bg-surface-primary border border-primary-violet/35 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {act.requiresExplicitConfirmation && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warning-amber/20 text-warning-amber font-bold">
                                <ShieldAlert className="w-3 h-3" />
                                يتطلب تأكيداً مالياً صريحاً
                              </span>
                            )}
                            <span className="text-xs font-bold text-text-primary">
                              {act.titleAr}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary">{act.summaryAr}</p>
                        </div>

                        <button
                          type="button"
                          disabled={isDone}
                          onClick={() => executeProposedAction(act)}
                          className={`px-4 py-2 rounded-full text-xs font-bold min-h-[40px] ${
                            isDone
                              ? 'bg-emerald-success/20 text-emerald-success'
                              : 'bg-emerald-success text-bg-primary hover:opacity-90'
                          }`}
                        >
                          {isDone ? 'تم التنفيذ ✓' : 'تأكيد وتنفيذ'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contextual Floating Action Button (FAB) */}
      <div className="fixed bottom-24 left-5 z-40">
        <AnimatePresence>
          {fabMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              className="mb-3 space-y-2 flex flex-col items-end"
            >
              {contextualQuickActions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={item.action}
                  className="px-4 py-2.5 rounded-full lifeos-glass-dock text-xs font-semibold text-text-primary hover:border-primary-violet whitespace-nowrap shadow-lg"
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setFabMenuOpen((o) => !o)}
          aria-label="إجراءات سريعة سياقية"
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-violet to-cyan-accent text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus
            className={`w-6 h-6 transition-transform duration-200 ${
              fabMenuOpen ? 'rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* Floating Bottom Navigation Dock (5 Approved Primary Destinations) */}
      <nav
        aria-label="التنقل الرئيسي في LifeOS"
        className="fixed bottom-4 inset-x-4 z-40 max-w-xl mx-auto lifeos-glass-dock rounded-full p-1.5"
      >
        <div className="grid grid-cols-5 gap-1">
          {(
            [
              { id: 'home', labelAr: 'الرئيسية', icon: Home },
              { id: 'planner', labelAr: 'التخطيط', icon: Calendar },
              { id: 'finance', labelAr: 'المالية', icon: Wallet },
              { id: 'wellbeing', labelAr: 'العادات والصحة', icon: HeartPulse },
              { id: 'lifehub', labelAr: 'حياتي', icon: Compass },
            ] as { id: NavTabId; labelAr: string; icon: React.ComponentType<{ className?: string }> }[]
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative py-2 px-1 rounded-full flex flex-col items-center justify-center gap-1 transition-all min-h-[52px] ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="lifeos-active-dock-pill"
                    className="absolute inset-0 rounded-full bg-primary-violet/90 -z-10 shadow-md"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4" />
                <span className="text-[11px] leading-none truncate max-w-full px-1">
                  {item.labelAr}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
