import { describe, it, expect } from 'vitest';
import { summarizeJourney } from './index';
import type { Archetype, JourneyYear } from '../types';

function year(y: number, archetype: Archetype, extras: Partial<JourneyYear> = {}): JourneyYear {
  return {
    year: y,
    archetype,
    reason: { kind: 'metric', icon: '·', text: '' },
    isCurrent: false,
    sameLanguageStreakYears: 1,
    ...extras,
  };
}

function specialist(y: number, lang: string, streak = 1): JourneyYear {
  return year(y, 'Specialist', {
    reason: { kind: 'language', emoji: '💻', label: lang },
    sameLanguageStreakYears: streak,
  });
}

describe('summarizeJourney', () => {
  it('returns an empty string when there are fewer than 2 years', () => {
    expect(summarizeJourney([])).toBe('');
    expect(summarizeJourney([year(2026, 'Builder')])).toBe('');
  });

  it('uses first → last when there are only 2 years', () => {
    expect(summarizeJourney([year(2025, 'Explorer'), year(2026, 'Builder')])).toBe(
      'Explorer → Builder in 2 years'
    );
  });

  it('picks comeback when year 1 is Quiet Year and year 3 is not', () => {
    expect(
      summarizeJourney([
        year(2024, 'Quiet Year'),
        year(2025, 'Explorer'),
        year(2026, 'Open Source Contributor'),
      ])
    ).toBe('Bounced back from a quiet year — now Open Source Contributor');
  });

  it('picks slump when year 1 is active and year 3 is Quiet Year', () => {
    expect(
      summarizeJourney([year(2024, 'Builder'), year(2025, 'Creator'), year(2026, 'Quiet Year')])
    ).toBe('Went quiet after a strong start');
  });

  it('picks language switch when years 1 and 3 are Specialists in different languages', () => {
    expect(
      summarizeJourney([
        specialist(2024, 'Python'),
        year(2025, 'Explorer'),
        specialist(2026, 'TypeScript', 1),
      ])
    ).toBe('Python → TypeScript specialist');
  });

  it('picks language switch over same-archetype streak when all 3 years are Specialists in different languages', () => {
    expect(
      summarizeJourney([
        specialist(2024, 'Python'),
        specialist(2025, 'Go'),
        specialist(2026, 'TypeScript'),
      ])
    ).toBe('Python → TypeScript specialist');
  });

  it('picks one-well when years 1 and 3 are Specialists in the same language with a 2+ year streak', () => {
    expect(
      summarizeJourney([
        specialist(2024, 'Python', 1),
        year(2025, 'Builder'),
        specialist(2026, 'Python', 2),
      ])
    ).toBe('2 years deep in Python');
  });

  it('picks same-archetype streak when all 3 years share an archetype that is not a language switch or one-well', () => {
    expect(
      summarizeJourney([year(2024, 'Builder'), year(2025, 'Builder'), year(2026, 'Builder')])
    ).toBe('3 years running as Builder');
  });

  it('picks breakout when the first 2 years are ordinary and only year 3 stands out', () => {
    expect(
      summarizeJourney([
        year(2024, 'Explorer'),
        specialist(2025, 'Python', 2),
        year(2026, 'Open Source Contributor'),
      ])
    ).toBe('Broke out this year as Open Source Contributor');
  });

  it('picks steady growth when all 3 archetypes differ and the last one stands out, but year 2 already stood out', () => {
    expect(
      summarizeJourney([
        year(2024, 'Explorer'),
        year(2025, 'Builder'),
        year(2026, 'Open Source Contributor'),
      ])
    ).toBe('Explorer → Builder → Open Source Contributor');
  });

  it('picks ongoing builder when 2+ of the 3 years are Builder or Creator', () => {
    expect(
      summarizeJourney([year(2024, 'Builder'), year(2025, 'Creator'), year(2026, 'Explorer')])
    ).toBe('Kept building things');
  });

  it('picks ongoing collaboration when 2+ of the 3 years are OSS Contributor or Collaborator', () => {
    expect(
      summarizeJourney([
        year(2024, 'Open Source Contributor'),
        year(2025, 'Collaborator'),
        year(2026, 'Explorer'),
      ])
    ).toBe('Deepening open-source involvement');
  });

  it('falls back to first → last over 3 years when nothing else matches', () => {
    expect(
      summarizeJourney([year(2024, 'Explorer'), year(2025, 'Polyglot'), year(2026, 'Consistent')])
    ).toBe('Explorer → Consistent in 3 years');
  });
});
