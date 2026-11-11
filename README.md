# LifeOS — حياتك كلها... بتنظيم أذكى

**Your life, beautifully orchestrated.**

LifeOS is an Arabic-first (`dir="rtl"`), mobile-first Progressive Web Application built under the **Midnight Aurora** visual direction and **Cinematic Dynamic** motion system.

---

## 1. Quick Start & Setup Instructions

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure environment variables
cp .env.example .env.local

# 3. Run automated unit & domain test suite
npm test

# 4. Start development server
npm run dev

# 5. Build production bundle
npm run build && npm start
```

---

## 2. Database Setup (Supabase PostgreSQL)

Apply the normalized database migration and Row Level Security (RLS) policies in `supabase/migrations/0001_lifeos_schema.sql`:

```bash
supabase db push
# Or paste supabase/migrations/0001_lifeos_schema.sql into the Supabase SQL Editor
```

---

## 3. Feature Status Checklist (Deliverable #18)

| Module / Feature | Status | Notes & Verification |
| :--- | :--- | :--- |
| **Midnight Aurora Token System + 4 Themes** | **Implemented and tested** | `Midnight Aurora` (default), `Pearl Studio`, `Emerald Noir`, `Solar Pulse` in `src/app/globals.css`. |
| **Floating Bottom Navigation & Contextual FAB** | **Implemented and tested** | 5 primary destinations (`الرئيسية`, `التخطيط`, `المالية`, `العادات والصحة`, `حياتي`) + quick actions. |
| **Adaptive Home Command Center** | **Implemented and tested** | Time-aware Morning, Afternoon, and Evening modes + widget visibility customizer. |
| **Planner, Tasks, Subtasks, Projects & Focus** | **Implemented and tested** | Daily/Weekly/Agenda views, Pomodoro Focus timer, prayer time-blocking layer, and conflict alerts. |
| **Finance Engine (Integer Minor Currency Units)** | **Implemented and tested** | Strict separation between Account Ledger Cash and Category Budget Availability (`src/domain/finance/engine.ts`). |
| **Mandatory Manual Monthly Closing & Carryover** | **Implemented and tested** | Full, Custom, or Zero carryover per category; explicit confirmation gate; idempotency protection; zero cash fabrication. |
| **Wellbeing, Habits & 7-Day Streak Matrix** | **Implemented and tested** | Daily/weekly habits, 7-day interactive streak matrix, water, sleep, exercise, and mood logs. |
| **Deen Hub (AlAdhan + AlQuran Cloud + Adhkar)** | **Implemented and tested** | Live `/api/prayer` and `/api/quran` route handlers with verified Uthmani & authentic Adhkar datasets. |
| **News Hub (`/api/news`)** | **Implemented and tested** | Server-side GNews integration with deduplication, source attribution, and distinct publication vs. retrieval timestamps. |
| **AI Personal Assistant (`/api/ai`)** | **Implemented and tested** | Natural language Arabic parsing (`نظملي بكرة...`, `سجل إني صرفت 350 جنيه...`) with mandatory confirmation before ledger changes. |
| **Offline-First PWA & Local Persistence** | **Implemented and tested** | Web App Manifest (`manifest.ts`), Service Worker (`public/sw.js`), IndexedDB (`idb-keyval`) + LocalStorage sync. |
| **Cloud Real-Time Multi-Device Sync & Push** | **Implemented but not fully tested** | Supabase schema (`0001_lifeos_schema.sql`) and client adapter (`src/lib/supabase/client.ts`) are ready; requires user's `NEXT_PUBLIC_SUPABASE_URL` & `GNEWS_API_KEY` in `.env.local` for live cloud sync. |

---

## 4. Known Limitations (Deliverable #19)

1. **External API Keys**:
   - **AlAdhan API** and **AlQuran Cloud API** work live out-of-the-box without API keys.
   - **GNews API** (`/api/news`) requires `GNEWS_API_KEY` in `.env.local` for live external fetching; when unset, it transparently serves a verified cached snapshot labeled `cached_verified_snapshot`.
2. **PWA Background Notifications & Device Sensors**:
   - Web Push delivery when the browser is closed depends on OS/browser support (iOS Safari requires Home Screen installation).
   - Qibla compass displays the exact astronomical bearing in degrees from North (`136.2°` for Cairo) and notes when magnetometers are unavailable.
