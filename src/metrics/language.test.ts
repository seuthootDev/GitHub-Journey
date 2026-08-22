import { describe, it, expect } from 'vitest';
import { dominantLanguage, dominantLanguageShare, distinctLanguageCount, languageEmoji } from './language';

describe('dominantLanguage', () => {
  it('returns the language with the most bytes', () => {
    expect(dominantLanguage({ languageBytes: { Python: 500, JavaScript: 200 } })).toBe('Python');
  });

  it('breaks ties alphabetically for determinism', () => {
    expect(dominantLanguage({ languageBytes: { TypeScript: 100, JavaScript: 100 } })).toBe('JavaScript');
  });

  it('returns null when there are no languages', () => {
    expect(dominantLanguage({ languageBytes: {} })).toBeNull();
  });
});

describe('dominantLanguageShare', () => {
  it('returns the fraction of bytes held by the dominant language', () => {
    expect(dominantLanguageShare({ languageBytes: { Python: 750, JavaScript: 250 } })).toBeCloseTo(0.75);
  });

  it('returns 0 when there are no languages', () => {
    expect(dominantLanguageShare({ languageBytes: {} })).toBe(0);
  });
});

describe('distinctLanguageCount', () => {
  it('counts distinct languages', () => {
    expect(distinctLanguageCount({ languageBytes: { Python: 1, Go: 1, Rust: 1 } })).toBe(3);
  });
});

describe('languageEmoji', () => {
  it('maps known languages to their mascot emoji', () => {
    expect(languageEmoji('Python')).toBe('🐍');
    expect(languageEmoji('TypeScript')).toBe('🔷');
  });

  it('falls back to a generic icon for unknown languages', () => {
    expect(languageEmoji('COBOL')).toBe('💻');
  });
});
