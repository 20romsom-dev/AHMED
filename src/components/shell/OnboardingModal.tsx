'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Compass,
  HeartPulse,
  Palette,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { useLifeOS } from '@/context/LifeOSContext';
import { ThemeId } from '@/domain/types';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const { state, setTheme, updateProfile, updatePrayerSettings } = useLifeOS();
  const [step, setStep] = useState(1);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="lifeos-card-elevated w-full max-w-lg p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs text-primary-violet-light font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>إعداد تجربة LifeOS الشخصية ({step} / 4)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
          >
            <span>تخطي الإعداد</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">
              مرحباً بك في LifeOS — حياتك كلها... بتنظيم أذكى
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              منصة شخصية متكاملة تجمع التخطيط اليومي، الإدارة المالية الدقيقة، العادات الصحية،
              ركن الدين الموثق، وغرفة الأخبار اليومية بتصميم Midnight Aurora الفاخر.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">اسمك الكريم</label>
                <input
                  type="text"
                  value={state.profile.displayName}
                  onChange={(e) => updateProfile({ displayName: e.target.value })}
                  className="lifeos-input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">العملة الأساسية</label>
                <select
                  value={state.profile.currency}
                  onChange={(e) => updateProfile({ currency: e.target.value })}
                  className="lifeos-input w-full text-sm"
                >
                  <option value="EGP">جنيه مصري (EGP - ج.م)</option>
                  <option value="SAR">ريال سعودي (SAR - ر.س)</option>
                  <option value="AED">درهم إماراتي (AED)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <Palette className="w-4 h-4 text-primary-violet-light" />
              <span>اختر السمة البصرية المفضلة</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'midnight-aurora', label: 'Midnight Aurora (المعتمد)' },
                  { id: 'pearl-studio', label: 'Pearl Studio (نهاري)' },
                  { id: 'emerald-noir', label: 'Emerald Noir (زمردي)' },
                  { id: 'solar-pulse', label: 'Solar Pulse (دافئ)' },
                ] as { id: ThemeId; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-right ${
                    state.preferences.theme === t.id
                      ? 'bg-primary-violet/20 border-primary-violet text-text-primary'
                      : 'bg-bg-secondary border-white/10 text-text-secondary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <Compass className="w-4 h-4 text-religious-gold" />
              <span>إعدادات مواقيت الصلاة والمدينة (اختياري بدون GPS إجباري)</span>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">المدينة</label>
              <select
                value={state.prayerSettings.city}
                onChange={(e) => updatePrayerSettings({ city: e.target.value })}
                className="lifeos-input w-full text-sm"
              >
                <option value="Cairo">القاهرة — مصر</option>
                <option value="Alexandria">الإسكندرية — مصر</option>
                <option value="Makkah">مكة المكرمة — السعودية</option>
                <option value="Riyadh">الرياض — السعودية</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={state.prayerSettings.showInPlanner}
                onChange={(e) =>
                  updatePrayerSettings({ showInPlanner: e.target.checked })
                }
              />
              <span>إظهار أوقات الصلاة وحجز 20 دقيقة حولها في التقويم تلقائياً</span>
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-center py-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-success mx-auto" />
            <h3 className="text-lg font-bold text-text-primary">أصبحت منظومة LifeOS جاهزة!</h3>
            <p className="text-xs text-text-secondary">
              يمكنك الآن التنقل بين الرئيسية المتكيفة، المخطط، المالية ومعالج الإغلاق الشهري،
              العادات، وركن الدين والأخبار.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-full bg-bg-secondary text-xs text-text-secondary"
            >
              السابق
            </button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-6 py-2.5 rounded-full bg-primary-violet text-white text-xs font-bold"
            >
              التالي
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                updateProfile({ onboardingCompleted: true });
                onClose();
              }}
              className="px-6 py-2.5 rounded-full bg-emerald-success text-bg-primary text-xs font-bold"
            >
              الانطلاق إلى LifeOS
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
