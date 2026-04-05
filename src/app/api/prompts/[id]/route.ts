import { NextRequest, NextResponse } from 'next/server';
import { withCors, corsOptions } from '@/lib/cors';
import { loadPrompts } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/prompts/[id]
 *
 * Resolves a prompt by its `id` (UUID) or `slug`.
 *
 * Response
 * --------
 * GeminiPrompt  (200)
 * { "error": "Not found" }  (404)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allPrompts = await loadPrompts();

    const prompt = allPrompts.find((p) => p.id === id || p.slug === id);

    if (!prompt) {
      return withCors(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    }

    return withCors(NextResponse.json(prompt));
  } catch (error) {
    console.error('[GET /api/prompts/[id]]', error);
    return withCors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
  }
}
