import type { Archetype, JourneyYear } from '../types';

const ORDINARY: ReadonlySet<Archetype> = new Set([
  'Quiet Year',
  'Consistent',
  'Explorer',
  'Polyglot',
  'Specialist',
]);

const STAND_OUT: ReadonlySet<Archetype> = new Set([
  'Builder',
  'Creator',
  'Open Source Contributor',
  'Collaborator',
  'Rising Star',
]);

function specialistLanguage(year: JourneyYear): string | null {
  return year.archetype === 'Specialist' && year.reason.kind === 'language' ? year.reason.label : null;
}

export function summarizeJourney(years: JourneyYear[]): string {
  if (years.length < 2) return '';

  const first = years[0];
  const last = years[years.length - 1];
  const fallback = `${first.archetype} → ${last.archetype} in ${years.length} years`;
  if (years.length !== 3) return fallback;

  const [year1, year2, year3] = years;

  if (year1.archetype === 'Quiet Year' && year3.archetype !== 'Quiet Year') {
    return `Bounced back from a quiet year — now ${year3.archetype}`;
  }

  if (year1.archetype !== 'Quiet Year' && year3.archetype === 'Quiet Year') {
    return 'Went quiet after a strong start';
  }

  const lang1 = specialistLanguage(year1);
  const lang3 = specialistLanguage(year3);
  if (lang1 && lang3 && lang1 !== lang3) {
    return `${lang1} → ${lang3} specialist`;
  }

  if (lang1 && lang3 && lang1 === lang3 && year3.sameLanguageStreakYears >= 2) {
    return `${year3.sameLanguageStreakYears} years deep in ${lang3}`;
  }

  if (year1.archetype === year2.archetype && year2.archetype === year3.archetype) {
    return `3 years running as ${year3.archetype}`;
  }

  if (ORDINARY.has(year1.archetype) && ORDINARY.has(year2.archetype) && STAND_OUT.has(year3.archetype)) {
    return `Broke out this year as ${year3.archetype}`;
  }

  const allDifferent =
    year1.archetype !== year2.archetype &&
    year2.archetype !== year3.archetype &&
    year1.archetype !== year3.archetype;
  if (allDifferent && STAND_OUT.has(year3.archetype)) {
    return `${year1.archetype} → ${year2.archetype} → ${year3.archetype}`;
  }

  const builderYears = years.filter((y) => y.archetype === 'Builder' || y.archetype === 'Creator').length;
  if (builderYears >= 2) return 'Kept building things';

  const collabYears = years.filter(
    (y) => y.archetype === 'Open Source Contributor' || y.archetype === 'Collaborator'
  ).length;
  if (collabYears >= 2) return 'Deepening open-source involvement';

  return fallback;
}
