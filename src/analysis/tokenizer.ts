import { encode, decode } from 'gpt-tokenizer';
import type { TokenInfo } from '../types';

/** est. input price per 1M tokens for a typical small model (UI label says "typical small model") */
export const COST_PER_MTOK_USD = 0.15;

export function analyzeTokens(text: string): TokenInfo {
  if (text === '') return { count: 0, costUsd: 0, tokens: [] };
  const ids = encode(text);
  const tokens = ids.map((id) => decode([id]));
  return {
    count: ids.length,
    costUsd: (ids.length / 1_000_000) * COST_PER_MTOK_USD,
    tokens,
  };
}
