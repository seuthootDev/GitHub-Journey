import type { YearlyMetrics } from '../types';

const LANGUAGE_EMOJI: Record<string, string> = {
  Python: '🐍',
  Java: '☕',
  JavaScript: '💛',
  TypeScript: '🔷',
  Go: '🐹',
  Rust: '🦀',
  'C++': '➕',
  C: '➕',
  'C#': '🎯',
  Kotlin: '🟣',
  Swift: '🐦',
};

const DEFAULT_LANGUAGE_EMOJI = '💻';

type LanguageBag = Pick<YearlyMetrics, 'languageBytes'>;

export function dominantLanguage(metrics: LanguageBag): string | null {
  const entries = Object.entries(metrics.languageBytes);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0][0];
}

export function dominantLanguageShare(metrics: LanguageBag): number {
  const entries = Object.entries(metrics.languageBytes);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) return 0;
  const top = Math.max(...entries.map(([, bytes]) => bytes));
  return top / total;
}

export function distinctLanguageCount(metrics: LanguageBag): number {
  return Object.keys(metrics.languageBytes).length;
}

export function languageEmoji(language: string): string {
  return LANGUAGE_EMOJI[language] ?? DEFAULT_LANGUAGE_EMOJI;
}
