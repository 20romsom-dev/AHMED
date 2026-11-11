// =============================================================================
// LIFEOS — CORE DOMAIN TYPES (STRICT TYPESCRIPT)
// =============================================================================

export type ThemeId = 'midnight-aurora' | 'pearl-studio' | 'emerald-noir' | 'solar-pulse';
export type LocaleId = 'ar' | 'en';
export type NavTabId = 'home' | 'planner' | 'finance' | 'wellbeing' | 'lifehub';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  locale: LocaleId;
  currency: string;
  timezone: string;
  weekStart: number; // 6 = Saturday
  onboardingCompleted: boolean;
}

export interface DashboardWidgetConfig {
  id: string;
  labelAr: string;
  labelEn: string;
  visible: boolean;
  compact: boolean;
  order: number;
}

export interface UserPreferences {
  theme: ThemeId;
  reducedMotion: boolean;
  enabledModules: {
    planner: boolean;
    finance: boolean;
    wellbeing: boolean;
    goals: boolean;
    notes: boolean;
    deen: boolean;
    news: boolean;
    ai: boolean;
  };
  dashboardWidgets: DashboardWidgetConfig[];
  monthClosingReminderDays: number;
  aiEnabled: boolean;
}

export interface NotificationSettings {
  tasksEnabled: boolean;
  appointmentsEnabled: boolean;
  prayersEnabled: boolean;
  prayerLeadMinutes: number;
  morningAdhkarEnabled: boolean;
  morningAdhkarTime: string;
  eveningAdhkarEnabled: boolean;
  eveningAdhkarTime: string;
  quranWirdEnabled: boolean;
  habitsEnabled: boolean;
  billsEnabled: boolean;
  monthlyClosingEnabled: boolean;
  goalsEnabled: boolean;
  newsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

// -----------------------------------------------------------------------------
// PLANNER: TASKS, PROJECTS, CALENDAR, FOCUS
// -----------------------------------------------------------------------------
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface SubtaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TaskItem {
  id: string;
  projectId?: string | null;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: TaskPriority;
  category: string;
  recurrenceRule?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
  isCompleted: boolean;
  completedAt?: string | null;
  subtasks: SubtaskItem[];
  notes: string;
  isArchived: boolean;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate?: string;
  isCompleted: boolean;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  color: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  deadline?: string;
  milestones: ProjectMilestone[];
  notes: string;
  isArchived: boolean;
  createdAt: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAllDay: boolean;
  category: string;
  color: string;
  recurrenceRule?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
  reminderMinutes?: number;
  notes: string;
}

export interface FocusSessionRecord {
  id: string;
  taskId?: string | null;
  label: string;
  durationMinutes: number;
  completedMinutes: number;
  status: 'running' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt?: string;
}

// -----------------------------------------------------------------------------
// FINANCE: ACCOUNTS, INCOME, BUDGETS, TRANSACTIONS, ROLLOVER
// All monetary fields ending in `Minor` are integer minor currency units (100 = 1.00)
// -----------------------------------------------------------------------------
export type AccountType = 'cash' | 'bank' | 'wallet' | 'savings' | 'custom';

export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: number; // integer
  color: string;
  icon: string;
  isArchived: boolean;
}

export interface IncomeSource {
  id: string;
  name: string;
  expectedAmountMinor: number;
  paydayOfMonth: number;
  isRecurring: boolean;
  defaultAccountId: string;
  isActive: boolean;
}

export interface TransactionCategory {
  id: string;
  parentId?: string | null;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  defaultMonthlyBudgetMinor: number;
  sortOrder: number;
  isArchived: boolean;
}

export interface BudgetAllocation {
  id: string;
  periodKey: string; // YYYY-MM
  categoryId: string;
  allocatedMinor: number; // integer >= 0
  carryoverMinor: number; // integer >= 0 (from explicit user rollover)
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amountMinor: number; // positive integer > 0
  accountId: string;
  toAccountId?: string | null; // required if type === 'transfer'
  categoryId?: string | null; // optional for expense (uncategorized allowed), null for transfer
  incomeSourceId?: string | null;
  date: string; // YYYY-MM-DD
  periodKey: string; // YYYY-MM
  description: string;
  notes: string;
  isRecurring: boolean;
  recurrenceRule?: 'MONTHLY' | 'WEEKLY' | null;
  idempotencyKey?: string;
  createdAt: string;
}

export type CarryoverDecisionMode = 'full' | 'custom' | 'none';

export interface CategoryCarryoverInput {
  categoryId: string;
  mode: CarryoverDecisionMode;
  customAmountMinor?: number;
}

export interface CategoryCarryoverRecord {
  categoryId: string;
  categoryName: string;
  originalAllocatedMinor: number;
  priorCarryoverMinor: number;
  actualSpentMinor: number;
  remainingMinor: number; // can be negative if overspent
  decisionMode: CarryoverDecisionMode;
  carriedOverMinor: number; // >= 0
}

export interface MonthlyClosingReview {
  id: string;
  fromPeriodKey: string; // YYYY-MM
  toPeriodKey: string; // YYYY-MM
  idempotencyKey: string;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  totalCarryoverMinor: number;
  accountBalancesSnapshot: Record<string, number>;
  decisions: CategoryCarryoverRecord[];
  confirmedAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  targetDate?: string;
  linkedAccountId?: string;
  color: string;
}

export interface DebtRecord {
  id: string;
  title: string;
  counterparty: string;
  direction: 'owed_by_me' | 'owed_to_me';
  totalAmountMinor: number;
  remainingAmountMinor: number;
  monthlyInstallmentMinor: number;
  dueDay: number;
  nextDueDate: string;
  notes: string;
}

// -----------------------------------------------------------------------------
// WELLBEING, GOALS & NOTES
// -----------------------------------------------------------------------------
export interface HabitItem {
  id: string;
  title: string;
  category: string;
  frequency: 'daily' | 'weekly';
  targetPerPeriod: number;
  reminderTime?: string;
  color: string;
  icon: string;
  completedDates: string[]; // array of YYYY-MM-DD
  isArchived: boolean;
}

export interface WellnessLog {
  date: string; // YYYY-MM-DD
  waterCups: number;
  waterTargetCups: number;
  sleepHours: number;
  exerciseMinutes: number;
  activityType: string;
  mood: 1 | 2 | 3 | 4 | 5;
  moodLabel: string;
  notes: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate?: string;
  isCompleted: boolean;
}

export interface GoalItem {
  id: string;
  title: string;
  description: string;
  category: 'short_term' | 'long_term' | 'financial' | 'learning' | 'personal' | 'custom';
  targetDate: string;
  milestones: GoalMilestone[];
  linkedTaskIds: string[];
  linkedHabitIds: string[];
  notes: string;
  isCompleted: boolean;
}

export interface ChecklistEntry {
  id: string;
  text: string;
  checked: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  checklist: ChecklistEntry[];
  isPinned: boolean;
  isFavorite: boolean;
  isJournal: boolean;
  journalDate?: string;
  isArchived: boolean;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// DEEN HUB: PRAYER, QURAN, WIRD, ADHKAR
// -----------------------------------------------------------------------------
export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerSettings {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  calculationMethod: number; // 5 = Egyptian General Authority
  asrSchool: 0 | 1; // 0 = Shafi, 1 = Hanafi
  hijriAdjustment: number;
  showInPlanner: boolean;
  reserveMinutesAround: number;
  manualAdjustments: Record<PrayerName, number>;
}

export interface PrayerScheduleData {
  dateGregorian: string;
  dateHijri: string;
  hijriMonthAr: string;
  hijriYear: string;
  weekdayAr: string;
  timings: Record<PrayerName, string>; // HH:mm
  fetchedAt: string;
  source: 'aladhan_live' | 'cached_schedule';
}

export interface QuranBookmark {
  id: string;
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  pageNumber: number;
  juzNumber: number;
  note: string;
  isLastRead: boolean;
  createdAt: string;
}

export interface DailyQuranGoal {
  unitType: 'pages' | 'verses' | 'juz' | 'surah';
  dailyTarget: number;
  completedToday: number;
  currentSurah: number;
  currentAyah: number;
  currentPage: number;
  weeklyHistory: number[]; // 7 days
}

export interface VerifiedDhikrItem {
  id: string;
  category: 'morning' | 'evening' | 'after_prayer';
  titleAr: string;
  arabicText: string; // Exact verified vocalized Arabic text
  targetCount: number;
  sourceReference: string;
  virtueOrExplanation: string;
  isBookmarked?: boolean;
}

// -----------------------------------------------------------------------------
// NEWS HUB & NOTIFICATIONS
// -----------------------------------------------------------------------------
export type NewsCategory =
  | 'top'
  | 'local'
  | 'world'
  | 'business'
  | 'economy'
  | 'technology'
  | 'sports'
  | 'science'
  | 'health'
  | 'entertainment';

export interface NewsArticleItem {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  sourceName: string;
  sourceUrl?: string;
  publishedAt: string; // ISO
  retrievedAt: string; // ISO
  category: NewsCategory;
}

export interface AppNotification {
  id: string;
  category: 'task' | 'appointment' | 'prayer' | 'adhkar' | 'quran' | 'habit' | 'bill' | 'closing' | 'goal' | 'news';
  priority: 'high' | 'normal' | 'low';
  title: string;
  body: string;
  actionTab?: NavTabId;
  isRead: boolean;
  createdAt: string;
}
