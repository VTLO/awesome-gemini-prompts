import { promises as fs } from 'fs';
import path from 'path';
import { GeminiPrompt } from '@/schema/prompt';

let cachedPrompts: GeminiPrompt[] | null = null;

/**
 * Loads all prompts from disk and caches the result in memory for the lifetime
 * of the server process. This avoids repeated file I/O on every API request.
 */
export async function loadPrompts(): Promise<GeminiPrompt[]> {
  if (cachedPrompts) return cachedPrompts;
  const filePath = path.join(process.cwd(), 'data', 'prompts.json');
  const raw = await fs.readFile(filePath, 'utf8');
  cachedPrompts = JSON.parse(raw) as GeminiPrompt[];
  return cachedPrompts;
}
