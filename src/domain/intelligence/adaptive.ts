// =============================================================================
// LIFEOS — ADAPTIVE INTELLIGENCE, AI INTENT PARSER & NEWS DEDUPLICATION ENGINE
// - Time-of-day adaptive Home context (Morning / Afternoon / Evening)
// - Natural Language Arabic/English intent parser with mandatory confirmation
//   before financial or destructive actions
// - News duplicate filtering & timestamp verification
// =============================================================================

import { toMinorUnits } from '../finance/engine';
import { NavTabId, NewsArticleItem, NewsCategory, TaskPriority } from '../types';

export type DayPhase = 'morning' | 'afternoon' | 'evening';

export interface AdaptiveHomeContext {
  phase: DayPhase;
  greetingAr: string;
  greetingEn: string;
  subGreetingAr: string;
  subGreetingEn: string;
  recommendedAdhkar: 'morning' | 'evening';
  ambientGradientClass: string;
  priorityWidgetOrder: string[];
}

/**
 * Determines the time-aware adaptive Home experience (Morning 04:00-11:59, Afternoon 12:00-16:59, Evening 17:00-03:59).
 */
export function computeAdaptiveHomeContext(
  hour24: number,
  displayName: string
): AdaptiveHomeContext {
  const safeName = displayName.trim() || '';
  const nameSuffixAr = safeName ? ` يا ${safeName}` : '';
  const nameSuffixEn = safeName ? `, ${safeName}` : '';

  if (hour24 >= 4 && hour24 < 12) {
    return {
      phase: 'morning',
      greetingAr: `صباح النور والبركة${nameSuffixAr}`,
      greetingEn: `Good Morning${nameSuffixEn}`,
      subGreetingAr: 'بداية هادئة ليومك — إليك أولوياتك، الصلاة القادمة، ووردك اليومي.',
      subGreetingEn: 'A calm start to your day — your priorities, next prayer, and daily Wird.',
      recommendedAdhkar: 'morning',
      ambientGradientClass: 'aurora-ambient-morning',
      priorityWidgetOrder: [
        'priorities',
        'prayer_adhkar',
        'quran_wird',
        'calendar',
        'tasks',
        'finance',
        'habits',
        'news',
      ],
    };
  }

  if (hour24 >= 12 && hour24 < 17) {
    return {
      phase: 'afternoon',
      greetingAr: `طاب يومك بالتركيز والإنجاز${nameSuffixAr}`,
      greetingEn: `Focused Afternoon${nameSuffixEn}`,
      subGreetingAr: 'استكمل مهامك الأهم وجلسات التركيز مع متابعة عاداتك وميزانيتك.',
      subGreetingEn: 'Keep momentum on key tasks, focus blocks, and daily habits.',
      recommendedAdhkar: 'morning',
      ambientGradientClass: 'aurora-ambient-afternoon',
      priorityWidgetOrder: [
        'tasks',
        'focus',
        'calendar',
        'prayer_adhkar',
        'habits',
        'finance',
        'goals',
        'news',
      ],
    };
  }

  return {
    phase: 'evening',
    greetingAr: `مساء السكينة والامتنان${nameSuffixAr}`,
    greetingEn: `Peaceful Evening${nameSuffixEn}`,
    subGreetingAr: 'ملخص إنجازاتك اليوم، أذكار المساء، مراجعة المصروفات، وتهيئة الغد.',
    subGreetingEn: 'Your daily achievements, evening Adhkar, financial review, and tomorrow prep.',
    recommendedAdhkar: 'evening',
    ambientGradientClass: 'aurora-ambient-evening',
    priorityWidgetOrder: [
      'prayer_adhkar',
      'quran_wird',
      'finance',
      'habits',
      'tasks',
      'goals',
      'news',
    ],
  };
}

// -----------------------------------------------------------------------------
// AI NATURAL LANGUAGE INTENT PARSER WITH MANDATORY CONFIRMATION GATE
// -----------------------------------------------------------------------------
export type ProposedActionType =
  | 'create_expense'
  | 'create_income'
  | 'transfer_money'
  | 'create_task'
  | 'create_event'
  | 'log_habit'
  | 'navigate_tab';

export interface ProposedAssistantAction {
  id: string;
  type: ProposedActionType;
  titleAr: string;
  summaryAr: string;
  requiresExplicitConfirmation: boolean; // Mandatory true for finance/destructive actions
  payload: {
    amountMinor?: number;
    categoryGuess?: string;
    description?: string;
    taskTitle?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: TaskPriority;
    eventTitle?: string;
    startTime?: string;
    endTime?: string;
    habitTitle?: string;
    targetTab?: NavTabId;
  };
}

export interface AssistantParseResult {
  replyAr: string;
  proposedActions: ProposedAssistantAction[];
  safetyNoticeAr?: string;
}

/**
 * Parses Arabic and English natural language prompts into structured, confirmable LifeOS actions.
 * Examples supported:
 * - "سجل إني صرفت 350 جنيه أكل النهاردة."
 * - "نظملي بكرة، عندي شغل الساعة 9، وعايز أتمرن وأقرأ وردي."
 * Never fabricates Quran verses or executes financial transactions without confirmation.
 */
export function parseNaturalLanguageIntent(
  rawPrompt: string,
  todayISO: string
): AssistantParseResult {
  const text = rawPrompt.trim();
  if (!text) {
    return {
      replyAr: 'أهلاً بك في مساعد LifeOS الذكي. اكتب ما تود تنظيمه أو تسجيله وسأقترح الإجراءات المناسبة لتأكيدها.',
      proposedActions: [],
    };
  }

  // Guard against generating Quran or religious rulings
  if (/(القرآن|آية من عندك|ألف آية|فتوى شرعية)/i.test(text) && !/(اقرأ|أقرأ|وردي|ورد)/i.test(text)) {
    return {
      replyAr:
        'حرصاً على سلامة النصوص الشرعية، لا يقوم المساعد الذكي بتوليد آيات قرآنية أو أذكار. يمكنك قراءة النص العثماني الموثق مباشرة من قسم «حياتي ← المصحف الشريف».',
      proposedActions: [
        {
          id: `act_nav_deen_${Date.now()}`,
          type: 'navigate_tab',
          titleAr: 'فتح المصحف الشريف والأذكار الموثقة',
          summaryAr: 'الانتقال المباشر إلى ركن الدين لقراءة القرآن الكريم أو الأذكار المعتمدة.',
          requiresExplicitConfirmation: false,
          payload: { targetTab: 'lifehub' },
        },
      ],
      safetyNoticeAr: 'النصوص الدينية في LifeOS تؤخذ فقط من مصادر موثقة ومحققة.',
    };
  }

  const actions: ProposedAssistantAction[] = [];

  // 1. Detect financial expense: e.g. "سجل إني صرفت 350 جنيه أكل النهاردة" or "دفعت 120 مواصلات"
  const expenseMatch = text.match(
    /(?:صرفت|دفعت|اشترت|اشتريت|مصروف|سجل\s+مصروف|spent|paid)\s*(?:إني\s*صرفت\s*)?(\d+(?:\.\d{1,2})?)\s*(?:جنيه|ج\.م|ريال|درهم|دولار|EGP|SAR)?\s*(.*)/i
  );
  const altExpenseMatch: RegExpMatchArray | null =
    !expenseMatch && /(?:صرفت|دفعت|مصروف)/i.test(text)
      ? text.match(/(\d+(?:\.\d{1,2})?)/)
      : null;

  if (expenseMatch || altExpenseMatch) {
    const numStr = expenseMatch ? expenseMatch[1] : altExpenseMatch![1];
    const amountMinor = toMinorUnits(numStr);
    const tail = expenseMatch ? expenseMatch[2].trim() : text;

    let categoryGuess = 'طعام ومطاعم';
    if (/(مواصلات|بنزين|أوبر|تاكسي|طريق)/i.test(tail)) categoryGuess = 'مواصلات وانتقالات';
    else if (/(فاتورة|كهرباء|نت|إنترنت|غاز|مياه|إيجار)/i.test(tail)) categoryGuess = 'فواتير وسكن';
    else if (/(تسوق|ملابس|لبس|شراء)/i.test(tail)) categoryGuess = 'تسوق ومشتريات';
    else if (/(دواء|طبيب|صيدلية|علاج)/i.test(tail)) categoryGuess = 'صحة وعلاج';
    else if (/(أكل|غداء|عشاء|فطار|قهوة|مطعم)/i.test(tail)) categoryGuess = 'طعام ومطاعم';

    const cleanDescription =
      tail.replace(/(النهاردة|اليوم|أمس|امبارح|جنيه)/gi, '').trim() || categoryGuess;

    actions.push({
      id: `act_exp_${Date.now()}`,
      type: 'create_expense',
      titleAr: `تسجيل مصروف بقيمة ${numStr} ج.م (${categoryGuess})`,
      summaryAr: `سيتم خصم ${numStr} ج.م من الحساب المختار ومن ميزانية فئة «${categoryGuess}» بتاريخ ${todayISO}. يتطلب تأكيدك الصريح.`,
      requiresExplicitConfirmation: true,
      payload: {
        amountMinor,
        categoryGuess,
        description: cleanDescription,
        dueDate: todayISO,
      },
    });
  }

  // 2. Detect income: e.g. "استلمت راتب 25000" or "دخل إضافي 1500"
  const incomeMatch = text.match(/(?:استلمت|قبضت|راتب|دخل)\s*(\d+(?:\.\d{1,2})?)/i);
  if (incomeMatch && !expenseMatch) {
    const numStr = incomeMatch[1];
    const amountMinor = toMinorUnits(numStr);
    actions.push({
      id: `act_inc_${Date.now()}`,
      type: 'create_income',
      titleAr: `تسجيل دخل وارد بقيمة ${numStr} ج.م`,
      summaryAr: `إضافة ${numStr} ج.م إلى رصيد الحساب بتاريخ ${todayISO}. يتطلب تأكيدك الصريح.`,
      requiresExplicitConfirmation: true,
      payload: {
        amountMinor,
        description: 'دفعة دخل / راتب',
        dueDate: todayISO,
      },
    });
  }

  // 3. Detect schedule / appointments: e.g. "نظملي بكرة، عندي شغل الساعة 9"
  const isTomorrow = /(بكرة|غداً|غدا|tomorrow)/i.test(text);
  const baseDateObj = new Date(`${todayISO}T12:00:00`);
  if (isTomorrow) {
    baseDateObj.setDate(baseDateObj.getDate() + 1);
  }
  const targetDateISO = baseDateObj.toISOString().slice(0, 10);

  const timeMatch = text.match(/(?:الساعة|ساعة|at)\s*(\d{1,2})(?::(\d{2}))?/i);
  if (timeMatch || /(شغل|اجتماع|موعد|محاضرة)/i.test(text)) {
    const rawHour = timeMatch ? parseInt(timeMatch[1], 10) : 9;
    const normHour = rawHour < 7 ? rawHour + 12 : rawHour;
    const startHH = `${String(normHour).padStart(2, '0')}:${timeMatch?.[2] ?? '00'}`;
    const endHH = `${String(Math.min(23, normHour + 2)).padStart(2, '0')}:00`;

    const eventTitle = /(شغل|عمل)/i.test(text)
      ? 'فترة العمل الأساسية'
      : /(اجتماع)/i.test(text)
      ? 'اجتماع عمل'
      : 'موعد مجدول';

    actions.push({
      id: `act_evt_${Date.now()}`,
      type: 'create_event',
      titleAr: `إضافة موعد «${eventTitle}» الساعة ${startHH}`,
      summaryAr: `جدولة في التقويم بتاريخ ${targetDateISO} من ${startHH} إلى ${endHH} مع مراعاة أوقات الصلاة.`,
      requiresExplicitConfirmation: false,
      payload: {
        eventTitle,
        dueDate: targetDateISO,
        startTime: startHH,
        endTime: endHH,
      },
    });
  }

  // 4. Detect workout / habit intent: e.g. "وعايز أتمرن"
  if (/(أتمرن|تمرين|رياضة|جيم|مشي|workout)/i.test(text)) {
    actions.push({
      id: `act_hab_${Date.now()}`,
      type: 'create_task',
      titleAr: 'جدولة جلسة تمرين رياضي (45 دقيقة)',
      summaryAr: `إضافة مهمة رياضية عالية الأولوية بتاريخ ${targetDateISO} وربطها بمتتبع العادات الصحية.`,
      requiresExplicitConfirmation: false,
      payload: {
        taskTitle: 'جلسة تمرين رياضي ونشاط بدني',
        dueDate: targetDateISO,
        dueTime: '17:00',
        priority: 'high',
      },
    });
  }

  // 5. Detect Quran Wird intent: e.g. "وأقرأ وردي"
  if (/(أقرأ وردي|ورد القرآن|وردي|قراءة القرآن)/i.test(text)) {
    actions.push({
      id: `act_wird_${Date.now()}`,
      type: 'create_task',
      titleAr: 'تخصيص وقت قراءة الورد القرآني اليومي',
      summaryAr: `إضافة تذكير ومهمة لقراءة الورد القرآني بتاريخ ${targetDateISO} بعد الصلاة.`,
      requiresExplicitConfirmation: false,
      payload: {
        taskTitle: 'قراءة الورد القرآني اليومي',
        dueDate: targetDateISO,
        dueTime: '20:30',
        priority: 'high',
      },
    });
  }

  // Fallback generic task if none of the specific patterns matched
  if (actions.length === 0) {
    actions.push({
      id: `act_tsk_${Date.now()}`,
      type: 'create_task',
      titleAr: `إضافة مهمة: «${text.slice(0, 60)}»`,
      summaryAr: `حفظ كمهمة في مخططك اليومي بتاريخ ${targetDateISO}.`,
      requiresExplicitConfirmation: false,
      payload: {
        taskTitle: text.slice(0, 80),
        dueDate: targetDateISO,
        priority: 'medium',
      },
    });
  }

  const hasFinancial = actions.some((a) => a.requiresExplicitConfirmation);
  const replyAr = hasFinancial
    ? 'تم تحليل طلبك المالي بدقة. يرجى مراجعة التفاصيل وتأكيد العملية قبل قيدها في دفتر الحسابات والميزانية:'
    : `قمت بتحليل طلبك وتجهيز ${actions.length} إجراءات مقترحة لتنظيم وقتك بذكاء:`;

  return {
    replyAr,
    proposedActions: actions,
  };
}

// -----------------------------------------------------------------------------
// NEWS DEDUPLICATION & VERIFICATION
// -----------------------------------------------------------------------------
/**
 * Filters out duplicate news articles by normalized URL and normalized headline title,
 * and ensures every article has valid source attribution and distinct publication vs retrieval timestamps.
 */
export function normalizeAndDeduplicateNews(
  rawArticles: Partial<NewsArticleItem>[],
  category: NewsCategory,
  retrievedAtISO: string
): NewsArticleItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const verified: NewsArticleItem[] = [];

  for (const item of rawArticles) {
    const title = (item.title || '').trim();
    const url = (item.url || '').trim();
    const sourceName = (item.sourceName || '').trim();
    const publishedAt = (item.publishedAt || '').trim();

    // Never accept articles missing headline, original link, publisher name, or publication timestamp
    if (!title || !url || !sourceName || !publishedAt) continue;

    const normUrl = url.replace(/\/+$/, '').toLowerCase();
    const normTitle = title.replace(/\s+/g, ' ').toLowerCase();

    if (seenUrls.has(normUrl) || seenTitles.has(normTitle)) continue;
    seenUrls.add(normUrl);
    seenTitles.add(normTitle);

    verified.push({
      id: item.id || `news_${ verified.length }_${normUrl.slice(-16)}`,
      title,
      description: (item.description || '').trim(),
      url,
      imageUrl: item.imageUrl || null,
      sourceName,
      sourceUrl: item.sourceUrl || url,
      publishedAt,
      retrievedAt: item.retrievedAt || retrievedAtISO,
      category: item.category || category,
    });
  }

  return verified;
}
