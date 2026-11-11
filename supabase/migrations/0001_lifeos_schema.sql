-- =============================================================================
-- LIFEOS — COMPLETE NORMALIZED POSTGRESQL SCHEMA & SECURITY POLICIES (SUPABASE)
-- Migration: 0001_lifeos_schema.sql
-- =============================================================================
-- Principles:
-- 1. All monetary values use BIGINT minor currency units (piasters/cents).
-- 2. Strict separation between Account Ledgers and Budget Allocations.
-- 3. Idempotent Monthly Closing & Carryover with explicit user approval.
-- 4. Row Level Security (RLS) enforced on every user table.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS, PROFILES & PREFERENCES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'أحمد',
  email TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar', 'en')),
  currency TEXT NOT NULL DEFAULT 'EGP',
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  week_start SMALLINT NOT NULL DEFAULT 6 CHECK (week_start BETWEEN 0 AND 6), -- 6 = Saturday
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'midnight-aurora' CHECK (theme IN ('midnight-aurora', 'pearl-studio', 'emerald-noir', 'solar-pulse')),
  reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_modules JSONB NOT NULL DEFAULT '{"planner":true,"finance":true,"wellbeing":true,"goals":true,"notes":true,"deen":true,"news":true,"ai":true}'::jsonb,
  dashboard_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  month_closing_reminder_days SMALLINT NOT NULL DEFAULT 3 CHECK (month_closing_reminder_days BETWEEN 1 AND 10),
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tasks_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  appointments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  prayers_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  prayer_lead_minutes SMALLINT NOT NULL DEFAULT 15,
  morning_adhkar_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  morning_adhkar_time TIME NOT NULL DEFAULT '06:30',
  evening_adhkar_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  evening_adhkar_time TIME NOT NULL DEFAULT '17:30',
  quran_wird_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  habits_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  bills_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_closing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  goals_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  news_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME NOT NULL DEFAULT '23:00',
  quiet_hours_end TIME NOT NULL DEFAULT '05:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. PRODUCTIVITY: PROJECTS, TASKS, SUBTASKS, CALENDAR, FOCUS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  deadline DATE,
  progress_percent SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  notes TEXT NOT NULL DEFAULT '',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date DATE,
  due_time TIME,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  category TEXT NOT NULL DEFAULT 'عام',
  recurrence_rule TEXT, -- e.g. 'DAILY', 'WEEKLY', 'MONTHLY', null
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL DEFAULT 'عمل',
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  recurrence_rule TEXT,
  reminder_minutes SMALLINT DEFAULT 15,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes > 0),
  completed_minutes SMALLINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 3. FINANCE: ACCOUNTS, INCOME, CATEGORIES, BUDGETS, TRANSACTIONS, ROLLOVER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'wallet', 'savings', 'custom')),
  currency TEXT NOT NULL DEFAULT 'EGP',
  opening_balance_minor BIGINT NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  icon TEXT NOT NULL DEFAULT 'Wallet',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.income_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expected_amount_minor BIGINT NOT NULL CHECK (expected_amount_minor >= 0),
  payday_of_month SMALLINT NOT NULL DEFAULT 1 CHECK (payday_of_month BETWEEN 1 AND 31),
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  default_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Tag',
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  default_monthly_budget_minor BIGINT NOT NULL DEFAULT 0 CHECK (default_monthly_budget_minor >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'), -- YYYY-MM
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_review', 'closed')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_key)
);

CREATE TABLE IF NOT EXISTS public.budget_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'),
  category_id UUID NOT NULL REFERENCES public.transaction_categories(id) ON DELETE CASCADE,
  allocated_minor BIGINT NOT NULL DEFAULT 0 CHECK (allocated_minor >= 0),
  carryover_minor BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_key, category_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  to_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  income_source_id UUID REFERENCES public.income_sources(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  period_key TEXT NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'),
  description TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_transfer_accounts CHECK (
    (type = 'transfer' AND to_account_id IS NOT NULL AND to_account_id <> account_id AND category_id IS NULL)
    OR (type <> 'transfer' AND to_account_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.monthly_closing_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_period_key TEXT NOT NULL CHECK (from_period_key ~ '^\d{4}-\d{2}$'),
  to_period_key TEXT NOT NULL CHECK (to_period_key ~ '^\d{4}-\d{2}$'),
  idempotency_key TEXT NOT NULL UNIQUE,
  total_income_minor BIGINT NOT NULL,
  total_expense_minor BIGINT NOT NULL,
  total_carryover_minor BIGINT NOT NULL,
  account_balances_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, from_period_key)
);

CREATE TABLE IF NOT EXISTS public.carryover_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.monthly_closing_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.transaction_categories(id) ON DELETE CASCADE,
  original_allocated_minor BIGINT NOT NULL,
  prior_carryover_minor BIGINT NOT NULL DEFAULT 0,
  actual_spent_minor BIGINT NOT NULL,
  remaining_minor BIGINT NOT NULL,
  decision_mode TEXT NOT NULL CHECK (decision_mode IN ('full', 'custom', 'none')),
  carried_over_minor BIGINT NOT NULL CHECK (carried_over_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount_minor BIGINT NOT NULL CHECK (target_amount_minor > 0),
  current_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_minor >= 0),
  target_date DATE,
  linked_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#36D6A1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debt_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('owed_by_me', 'owed_to_me')),
  total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor > 0),
  remaining_amount_minor BIGINT NOT NULL CHECK (remaining_amount_minor >= 0),
  monthly_installment_minor BIGINT NOT NULL DEFAULT 0,
  due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  next_due_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. WELLBEING, GOALS & NOTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'صحة',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  target_per_period SMALLINT NOT NULL DEFAULT 1 CHECK (target_per_period > 0),
  reminder_time TIME,
  color TEXT NOT NULL DEFAULT '#36D6A1',
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  value SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.wellness_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  water_cups SMALLINT NOT NULL DEFAULT 0 CHECK (water_cups >= 0),
  water_target_cups SMALLINT NOT NULL DEFAULT 8,
  sleep_hours NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  exercise_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (exercise_minutes >= 0),
  activity_type TEXT NOT NULL DEFAULT '',
  mood SMALLINT CHECK (mood BETWEEN 1 AND 5),
  mood_label TEXT NOT NULL DEFAULT 'متوازن',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('short_term', 'long_term', 'financial', 'learning', 'personal', 'custom')),
  target_date DATE,
  progress_percent SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  linked_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_habit_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'أفكار',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  is_journal BOOLEAN NOT NULL DEFAULT FALSE,
  journal_date DATE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. DEEN HUB (PRAYER, QURAN, WIRD, ADHKAR)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prayer_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL DEFAULT 'Cairo',
  country TEXT NOT NULL DEFAULT 'Egypt',
  latitude NUMERIC(9,6) DEFAULT 30.044420,
  longitude NUMERIC(9,6) DEFAULT 31.235712,
  calculation_method SMALLINT NOT NULL DEFAULT 5, -- 5 = Egyptian General Authority of Survey
  asr_school SMALLINT NOT NULL DEFAULT 0 CHECK (asr_school IN (0, 1)), -- 0 = Shafi/Maliki/Hanbali, 1 = Hanafi
  hijri_adjustment SMALLINT NOT NULL DEFAULT 0 CHECK (hijri_adjustment BETWEEN -2 AND 2),
  show_in_planner BOOLEAN NOT NULL DEFAULT TRUE,
  reserve_minutes_around SMALLINT NOT NULL DEFAULT 20 CHECK (reserve_minutes_around BETWEEN 5 AND 60),
  manual_adjustments JSONB NOT NULL DEFAULT '{"Fajr":0,"Sunrise":0,"Dhuhr":0,"Asr":0,"Maghrib":0,"Isha":0}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prayer_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prayer_date DATE NOT NULL,
  prayer_name TEXT NOT NULL CHECK (prayer_name IN ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'jamaah', 'late', 'missed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, prayer_date, prayer_name)
);

CREATE TABLE IF NOT EXISTS public.quran_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  surah_number SMALLINT NOT NULL CHECK (surah_number BETWEEN 1 AND 114),
  surah_name_ar TEXT NOT NULL,
  ayah_number SMALLINT NOT NULL CHECK (ayah_number >= 1),
  page_number SMALLINT CHECK (page_number BETWEEN 1 AND 604),
  juz_number SMALLINT CHECK (juz_number BETWEEN 1 AND 30),
  note TEXT NOT NULL DEFAULT '',
  is_last_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_quran_goals (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL DEFAULT 'pages' CHECK (unit_type IN ('pages', 'verses', 'juz', 'surah')),
  daily_target SMALLINT NOT NULL DEFAULT 4 CHECK (daily_target > 0),
  completed_today SMALLINT NOT NULL DEFAULT 0 CHECK (completed_today >= 0),
  current_surah SMALLINT NOT NULL DEFAULT 18,
  current_ayah SMALLINT NOT NULL DEFAULT 1,
  current_page SMALLINT NOT NULL DEFAULT 293,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.adhkar_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('morning', 'evening', 'after_prayer', 'sleep')),
  dhikr_id TEXT NOT NULL,
  current_count SMALLINT NOT NULL DEFAULT 0,
  target_count SMALLINT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, completion_date, dhikr_id)
);

-- -----------------------------------------------------------------------------
-- 6. NEWS HUB & SYSTEM TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT 'eg',
  language TEXT NOT NULL DEFAULT 'ar',
  favorite_categories JSONB NOT NULL DEFAULT '["top","technology","business","science"]'::jsonb,
  show_on_home BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_url TEXT NOT NULL,
  title TEXT NOT NULL,
  source_name TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL,
  image_url TEXT,
  summary TEXT,
  UNIQUE(user_id, article_url)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_href TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. INDEXES & ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON public.calendar_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_period ON public.transactions(user_id, period_key, date DESC);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_user_period ON public.budget_allocations(user_id, period_key);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END
$$;

CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Generic user_id policy helper applied to all user-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_preferences','notification_settings','projects','project_milestones',
    'tasks','subtasks','calendar_events','focus_sessions','financial_accounts',
    'income_sources','transaction_categories','budget_periods','budget_allocations',
    'transactions','monthly_closing_reviews','carryover_decisions','savings_goals',
    'debt_records','habits','habit_logs','wellness_logs','goals','goal_milestones',
    'notes','prayer_settings','prayer_tracking','quran_bookmarks','daily_quran_goals',
    'adhkar_completions','news_preferences','saved_articles','notifications','audit_logs'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "User owns %1$s" ON public.%1$I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
      tbl
    );
  END LOOP;
END
$$;
