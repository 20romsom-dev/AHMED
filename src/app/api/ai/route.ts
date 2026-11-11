import { NextRequest } from 'next/server';
import { parseNaturalLanguageIntent } from '@/domain/intelligence/adaptive';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt : '';
    const todayISO =
      typeof body?.todayISO === 'string'
        ? body.todayISO
        : new Date().toISOString().slice(0, 10);

    const parsed = parseNaturalLanguageIntent(prompt, todayISO);
    return Response.json({
      ...parsed,
      processedAt: new Date().toISOString(),
      provider: process.env.OPENAI_API_KEY ? 'server_ai_configured' : 'deterministic_arabic_nlu',
    });
  } catch {
    return Response.json(
      {
        replyAr: 'تعذر معالجة الطلب حالياً. يرجى المحاولة مرة أخرى.',
        proposedActions: [],
      },
      { status: 400 }
    );
  }
}
