import type { YearContext } from '../diff';
import type { Archetype, JourneyYear, Reason } from '../types';
import { dominantLanguage, dominantLanguageShare, distinctLanguageCount, languageEmoji } from '../metrics/language';

const EXPLORER_MIN_NEW_LANGS = 3;
const EXPLORER_MIN_BREADTH = 4;
const SPECIALIST_MIN_STREAK_YEARS = 2;
const SPECIALIST_MAX_BREADTH = 2;
const SPECIALIST_MIN_DEPTH_SHARE = 0.6;
const BUILDER_MIN_ACTIVE_REPOS = 3;
const BUILDER_MIN_LONG_LIVED = 2;
const CREATOR_MIN_REPOS_CREATED = 4;
const OSS_MIN_EXTERNAL_PRS = 5;
const OSS_MIN_EXTERNAL_REPOS = 2;
const COLLAB_GROWTH_MULTIPLIER = 1.5;
const COLLAB_MIN_ABSOLUTE = 5;
const RISING_STAR_GROWTH_MULTIPLIER = 2.0;
const RISING_STAR_MIN_ABSOLUTE = 10;
const QUIET_YEAR_RATIO = 0.3;
const POLYGLOT_MIN_BREADTH = 4;

interface RuleMatch {
  archetype: Archetype;
  reason: Reason;
}

type Rule = (ctx: YearContext) => RuleMatch | null;

function metricReason(icon: string, text: string): Reason {
  return { kind: 'metric', icon, text };
}

const quietYear: Rule = (ctx) => {
  const b = ctx.baseline;
  if (!b) return null;
  const m = ctx.metrics;
  const wellBelow = (value: number, avg: number) => avg > 0 && value <= avg * QUIET_YEAR_RATIO;
  const allQuiet =
    wellBelow(m.commitDays, b.avgCommitDays) &&
    wellBelow(m.reposCreated + m.reposActive, b.avgReposCreated + b.avgReposActive) &&
    wellBelow(m.ownPRs + m.externalPRs, b.avgExternalPRs + 1) &&
    wellBelow(m.reviews, b.avgReviews + 1);
  if (!allQuiet) return null;
  return { archetype: 'Quiet Year', reason: metricReason('💤', 'low activity') };
};

const risingStar: Rule = (ctx) => {
  const b = ctx.baseline;
  if (!b) return null;
  const gained = ctx.metrics.starsGained;
  if (gained < RISING_STAR_MIN_ABSOLUTE) return null;
  if (gained < b.avgStarsGained * RISING_STAR_GROWTH_MULTIPLIER) return null;
  return { archetype: 'Rising Star', reason: metricReason('⭐', `+${gained} stars`) };
};

const collaborator: Rule = (ctx) => {
  if (!ctx.baseline) return null;
  const reviews = ctx.metrics.reviews;
  if (reviews < COLLAB_MIN_ABSOLUTE) return null;
  if (reviews < ctx.baseline.avgReviews * COLLAB_GROWTH_MULTIPLIER) return null;
  return { archetype: 'Collaborator', reason: metricReason('👀', `+${reviews} reviews`) };
};

const openSourceContributor: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.externalPRs >= OSS_MIN_EXTERNAL_PRS && m.externalReposContributed >= OSS_MIN_EXTERNAL_REPOS) {
    return { archetype: 'Open Source Contributor', reason: metricReason('🔀', `+${m.externalPRs} ext PRs`) };
  }
  return null;
};

const builder: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.reposActive >= BUILDER_MIN_ACTIVE_REPOS && m.longLivedRepoCount >= BUILDER_MIN_LONG_LIVED) {
    return { archetype: 'Builder', reason: metricReason('📦', `${m.longLivedRepoCount} long-lived`) };
  }
  return null;
};

const creator: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.reposCreated >= CREATOR_MIN_REPOS_CREATED) {
    return { archetype: 'Creator', reason: metricReason('🛠️', `+${m.reposCreated} repos`) };
  }
  return null;
};

const explorer: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.newLanguageCount >= EXPLORER_MIN_NEW_LANGS && distinctLanguageCount(m) >= EXPLORER_MIN_BREADTH) {
    return { archetype: 'Explorer', reason: metricReason('🌱', `+${m.newLanguageCount} langs`) };
  }
  return null;
};

const polyglot: Rule = (ctx) => {
  const breadth = distinctLanguageCount(ctx.metrics);
  const baselineBreadth = ctx.baseline?.avgLanguageBreadth ?? 0;
  if (breadth >= POLYGLOT_MIN_BREADTH && baselineBreadth >= POLYGLOT_MIN_BREADTH) {
    return { archetype: 'Polyglot', reason: metricReason('🌐', `${breadth} langs active`) };
  }
  return null;
};

const specialist: Rule = (ctx) => {
  const m = ctx.metrics;
  const breadth = distinctLanguageCount(m);
  const depth = dominantLanguageShare(m);
  if (
    ctx.sameLanguageStreakYears >= SPECIALIST_MIN_STREAK_YEARS &&
    breadth <= SPECIALIST_MAX_BREADTH &&
    depth >= SPECIALIST_MIN_DEPTH_SHARE
  ) {
    const lang = dominantLanguage(m);
    if (lang) {
      return { archetype: 'Specialist', reason: { kind: 'language', emoji: languageEmoji(lang), label: lang } };
    }
  }
  return null;
};

const consistent: Rule = (ctx) => ({
  archetype: 'Consistent',
  reason: metricReason('🔥', `${ctx.metrics.longestStreakDays}d streak`),
});

const RULES: Rule[] = [
  quietYear,
  risingStar,
  collaborator,
  openSourceContributor,
  builder,
  creator,
  explorer,
  polyglot,
  specialist,
  consistent,
];

export function evaluateYear(ctx: YearContext): JourneyYear {
  for (const rule of RULES) {
    const match = rule(ctx);
    if (match) {
      return {
        year: ctx.metrics.year,
        archetype: match.archetype,
        reason: match.reason,
        isCurrent: ctx.isCurrent,
        sameLanguageStreakYears: ctx.sameLanguageStreakYears,
      };
    }
  }
  // consistent always matches, so this is unreachable — kept for type safety.
  throw new Error('no rule matched, including the unconditional fallback');
}
