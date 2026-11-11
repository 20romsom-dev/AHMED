'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import { HomeCommandCenter } from '@/components/modules/HomeCommandCenter';
import { PlannerStudio } from '@/components/modules/PlannerStudio';
import { FinanceMoneyStudio } from '@/components/modules/FinanceMoneyStudio';
import { WellbeingStudio } from '@/components/modules/WellbeingStudio';
import { LifeHubStudio } from '@/components/modules/LifeHubStudio';
import { AppShellOverlays } from '@/components/shell/AppShellOverlays';
import { OnboardingModal } from '@/components/shell/OnboardingModal';

export default function LifeOSMasterPage() {
  const { activeTab, setActiveTab } = useLifeOS();
  const [quickCapturePreset, setQuickCapturePreset] = useState<string | null>(null);
  const [openClosingWizard, setOpenClosingWizard] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Register Offline-First Service Worker on client mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const handleOpenMonthlyClosing = () => {
    setOpenClosingWizard(true);
    setActiveTab('finance');
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      <AppShellOverlays
        quickCapturePreset={quickCapturePreset}
        onCloseQuickCapture={() => setQuickCapturePreset(null)}
        onOpenMonthlyClosing={handleOpenMonthlyClosing}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* Top Utility Strip for Onboarding Tour */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[11px] sm:text-xs text-text-muted text-right">
          <span>نظام التشغيل الشخصي الذكي • الهوية المعتمدة: Midnight Aurora</span>
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="inline-flex items-center gap-1 text-primary-violet-light hover:underline font-semibold shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>جولة التهيئة السريعة</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <HomeCommandCenter
                onOpenQuickCapture={(preset) => setQuickCapturePreset(preset ?? '')}
                onOpenMonthlyClosing={handleOpenMonthlyClosing}
              />
            </motion.div>
          )}

          {activeTab === 'planner' && (
            <motion.div
              key="tab-planner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <PlannerStudio />
            </motion.div>
          )}

          {activeTab === 'finance' && (
            <motion.div
              key="tab-finance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <FinanceMoneyStudio
                externalWizardOpen={openClosingWizard}
                onCloseExternalWizard={() => setOpenClosingWizard(false)}
              />
            </motion.div>
          )}

          {activeTab === 'wellbeing' && (
            <motion.div
              key="tab-wellbeing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <WellbeingStudio />
            </motion.div>
          )}

          {activeTab === 'lifehub' && (
            <motion.div
              key="tab-lifehub"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <LifeHubStudio />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
}
