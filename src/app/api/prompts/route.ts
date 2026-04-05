import Fuse from 'fuse.js';
import { NextRequest, NextResponse } from 'next/server';
import { GeminiPrompt } from '@/schema/prompt';
import { withCors, corsOptions } from '@/lib/cors';
import { loadPrompts } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/prompts
 *
 * Query parameters
 * ----------------
 * q          – full-text search across title, description, tags, and prompt text
 * modality   – comma-separated list  e.g. "text,image"
 * models     – comma-separated model names (partial match)  e.g. "gemini-2.5-pro"
 * tags       – comma-separated exact tag filter  e.g. "coding,creative-writing"
 * sort       – "newest" | "popular" | "relevance" (default)
 * page       – 1-based page number (default: 1)
 * limit      – items per page (default: 20, max: 100)
 *
 * Response
 * --------
 * {
 *   "data":  GeminiPrompt[],
 *   "meta": { "total": number, "page": number, "limit": number, "totalPages": number }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const query = searchParams.get('q') ?? undefined;
    const modality = searchParams.get('modality')?.split(',').filter(Boolean);
    const models = searchParams.get('models')?.split(',').filter(Boolean);
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const sort = searchParams.get('sort') ?? 'relevance';
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit') ?? DEFAULT_LIMIT)));

    const allPrompts = await loadPrompts();

    // 1. Filter out prompts with no usable text content
    let results = allPrompts.filter(
      (p) =>
        (p.contents?.length > 0 && p.contents[0].parts.some((part) => part.text)) ||
        (p.promptText && p.promptText.trim().length > 0) ||
        (p.systemInstruction?.parts?.some((part) => part.text))
    );

    // 2. Modality filter
    if (modality && modality.length > 0) {
      results = results.filter((p) => {
        const pModality = p.modality ?? [];
        return modality.some((m) => pModality.includes(m as 'text' | 'image' | 'video' | 'audio'));
      });
    }

    // 3. Models filter (partial match)
    if (models && models.length > 0) {
      results = results.filter((p) => {
        const pModels = p.compatibleModels ?? [];
        return models.some((m) => pModels.some((pm) => pm.includes(m)));
      });
    }

    // 4. Tags filter
    if (tags && tags.length > 0) {
      results = results.filter((p) => {
        const pTags = p.tags ?? [];
        return tags.some((t) => pTags.includes(t));
      });
    }

    // 5. Full-text search
    if (query) {
      const fuse = new Fuse(results, {
        keys: ['title', 'description', 'tags', 'contents.parts.text'],
        threshold: 0.4,
        ignoreLocation: true,
      });
      results = fuse.search(query).map((r) => r.item);
    }

    // 6. Sort
    results = results.sort((a, b) => {
      const getLikes = (p: GeminiPrompt) => p.stats?.likes ?? 0;
      const getDate = (p: GeminiPrompt) => new Date(p.createdAt ?? 0).getTime();

      if (sort === 'newest') return getDate(b) - getDate(a);
      if (sort === 'popular') return getLikes(b) - getLikes(a);

      // relevance: Google-sourced first, then by likes, then by date
      const isGoogleA = a.author?.platform === 'Google';
      const isGoogleB = b.author?.platform === 'Google';
      if (isGoogleA && !isGoogleB) return -1;
      if (!isGoogleA && isGoogleB) return 1;
      const likesDiff = getLikes(b) - getLikes(a);
      return likesDiff !== 0 ? likesDiff : getDate(b) - getDate(a);
    });

    // 7. Paginate
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = results.slice(start, start + limit);

    return withCors(
      NextResponse.json({
        data,
        meta: { total, page, limit, totalPages },
      })
    );
  } catch (error) {
    console.error('[GET /api/prompts]', error);
    return withCors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
  }
}
