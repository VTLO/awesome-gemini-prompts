import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { GeminiPrompt } from '@/schema/prompt';
import { withCors, corsOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

async function loadPrompts(): Promise<GeminiPrompt[]> {
  const filePath = path.join(process.cwd(), 'data', 'prompts.json');
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as GeminiPrompt[];
}

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
