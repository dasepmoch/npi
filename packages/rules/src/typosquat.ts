/**
 * Common popular packages to check for typosquatting.
 */
const POPULAR_PACKAGES = [
  'react', 'vue', 'angular', 'svelte', 'express', 'next', 'nuxt',
  'lodash', 'axios', 'moment', 'dayjs', 'chalk', 'commander', 'inquirer',
  'webpack', 'vite', 'esbuild', 'rollup', 'typescript', 'eslint', 'prettier',
  'jest', 'vitest', 'mocha', 'chai', 'sinon', 'supertest',
  'mongoose', 'sequelize', 'prisma', 'typeorm', 'knex',
  'socket.io', 'fastify', 'koa', 'hapi', 'nest',
  'redux', 'zustand', 'mobx', 'jotai', 'recoil',
  'tailwindcss', 'styled-components', 'emotion',
  'zod', 'yup', 'joi', 'ajv',
  'dotenv', 'cors', 'helmet', 'morgan', 'compression',
  'uuid', 'nanoid', 'crypto-js', 'bcrypt', 'jsonwebtoken',
  'nodemon', 'concurrently', 'cross-env', 'rimraf',
  'underscore', 'ramda', 'rxjs', 'date-fns', 'luxon',
];

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if a package name looks like a typosquat of a popular package.
 * Returns the likely intended package name, or undefined if no match.
 */
export function detectTyposquat(name: string): string | undefined {
  // Don't flag scoped packages
  if (name.startsWith('@')) return undefined;

  // Don't flag if the name IS a popular package
  if (POPULAR_PACKAGES.includes(name)) return undefined;

  for (const popular of POPULAR_PACKAGES) {
    const distance = levenshtein(name, popular);
    // Flag if distance is 1-2 for short names, 1-2 for longer names
    const threshold = popular.length <= 4 ? 1 : 2;
    if (distance > 0 && distance <= threshold) {
      return popular;
    }
  }

  // Check pattern-based detection
  const patternMatch = detectTyposquatPatterns(name);
  if (patternMatch) return patternMatch;

  return undefined;
}

/**
 * Additional typosquat patterns beyond Levenshtein.
 */
export function detectTyposquatPatterns(name: string): string | undefined {
  if (name.startsWith('@')) return undefined;
  if (POPULAR_PACKAGES.includes(name)) return undefined;

  // Check separator tricks: react-dom vs reactdom vs react.dom
  for (const popular of POPULAR_PACKAGES) {
    // Remove separators and compare
    const stripped = name.replace(/[-._]/g, '');
    const popularStripped = popular.replace(/[-._]/g, '');
    if (stripped === popularStripped && name !== popular) {
      return popular;
    }

    // Plural/suffix bait: reacts, expresss, lodash-js
    if (name === `${popular}s` || name === `${popular}js` || name === `${popular}-js`) {
      return popular;
    }
  }

  return undefined;
}
