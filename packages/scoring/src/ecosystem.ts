import type { NpmPackageMetadata, GithubMetadata, EcosystemScore } from '@npi/core';

// Known legacy/deprecated packages
const LEGACY_PACKAGES = new Set([
  'moment', 'request', 'node-uuid', 'nomnom', 'optimist',
  'colors', 'node-sass', 'tslint', 'istanbul', 'mocha',
]);

const DEPRECATED_PACKAGES = new Set([
  'request', 'node-uuid', 'nomnom', 'optimist', 'istanbul',
]);

const DECLINING_PACKAGES = new Set([
  'lodash', 'underscore', 'bluebird', 'q', 'async',
  'gulp', 'grunt', 'bower', 'redux-form', 'enzyme',
]);

const MODERN_ALTERNATIVES: Record<string, string[]> = {
  'moment': ['dayjs', 'date-fns', 'luxon', 'temporal (native)'],
  'request': ['got', 'ky', 'axios', 'native fetch'],
  'lodash': ['remeda', 'radash', 'es-toolkit', 'native JavaScript'],
  'underscore': ['remeda', 'radash', 'native JavaScript'],
  'bluebird': ['native Promise'],
  'q': ['native Promise'],
  'async': ['native async/await'],
  'gulp': ['vite', 'esbuild', 'turbopack'],
  'grunt': ['vite', 'esbuild', 'turbopack'],
  'node-sass': ['sass (dart-sass)'],
  'tslint': ['eslint with @typescript-eslint'],
  'istanbul': ['c8', 'vitest coverage'],
  'mocha': ['vitest', 'jest', 'node:test'],
  'enzyme': ['@testing-library/react'],
  'redux-form': ['react-hook-form', 'formik'],
  'node-uuid': ['crypto.randomUUID()', 'uuid'],
  'colors': ['picocolors', 'chalk'],
  'bower': ['npm', 'pnpm'],
  'axios': ['ky', 'got', 'native fetch'],
};

export function calculateEcosystemScore(
  npm: NpmPackageMetadata,
  github?: GithubMetadata
): EcosystemScore {
  const name = npm.name;

  if (DEPRECATED_PACKAGES.has(name) || npm.deprecated) {
    return {
      status: 'deprecated',
      trend: 'declining',
      modernAlternatives: MODERN_ALTERNATIVES[name] ?? [],
      migrationDifficulty: 'moderate',
    };
  }

  if (LEGACY_PACKAGES.has(name)) {
    return {
      status: 'legacy',
      trend: 'declining',
      modernAlternatives: MODERN_ALTERNATIVES[name] ?? [],
      migrationDifficulty: 'easy',
    };
  }

  if (DECLINING_PACKAGES.has(name)) {
    return {
      status: 'declining',
      trend: 'declining',
      modernAlternatives: MODERN_ALTERNATIVES[name] ?? [],
      migrationDifficulty: 'easy',
    };
  }

  // Dynamic analysis
  const status = determineStatus(npm, github);
  const trend = determineTrend(npm, github);

  return {
    status,
    trend,
    modernAlternatives: MODERN_ALTERNATIVES[name] ?? [],
    migrationDifficulty: 'easy',
  };
}

function determineStatus(
  npm: NpmPackageMetadata,
  github?: GithubMetadata
): EcosystemScore['status'] {
  const daysSincePublish = daysBetween(toDate(npm.lastPublish), new Date());

  if (github?.archived) return 'deprecated';
  if (daysSincePublish > 730) return 'legacy';
  if (daysSincePublish > 365) return 'declining';

  if (npm.weeklyDownloads > 1000000 && daysSincePublish < 180) return 'thriving';
  if (npm.weeklyDownloads > 100000) return 'stable';

  return 'stable';
}

function determineTrend(
  npm: NpmPackageMetadata,
  github?: GithubMetadata
): EcosystemScore['trend'] {
  if (github?.archived) return 'declining';

  const daysSincePublish = daysBetween(toDate(npm.lastPublish), new Date());

  if (daysSincePublish < 90 && npm.weeklyDownloads > 100000) return 'growing';
  if (daysSincePublish > 365) return 'declining';

  return 'stable';
}

/**
 * Safely convert a value to Date (handles string from JSON deserialization).
 */
function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}
