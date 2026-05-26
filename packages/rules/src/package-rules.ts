import type { Rule } from './engine.js';

export const packageRules: Rule[] = [
  {
    id: 'moment-legacy',
    name: 'Moment.js Legacy',
    description: 'Moment.js is considered legacy and has modern alternatives',
    severity: 'warning',
    evaluate: (ctx) => {
      if (ctx.analysis.package.name !== 'moment') {
        return { triggered: false };
      }
      return {
        triggered: true,
        recommendation: {
          package: 'moment',
          severity: 'warning',
          message: 'Moment.js is considered legacy. The ecosystem has moved to lighter, immutable alternatives.',
          alternatives: [
            { name: 'dayjs', description: '2KB immutable date library with Moment-compatible API', advantages: ['2KB vs 72KB', 'Immutable', 'Plugin system', 'Moment-compatible API'] },
            { name: 'date-fns', description: 'Modern modular date utility library', advantages: ['Tree-shakeable', 'Functional API', 'TypeScript native', 'ESM'] },
            { name: 'luxon', description: 'Powerful date library by Moment team', advantages: ['Immutable', 'Timezone support', 'Intl-based', 'Modern API'] },
          ],
          reasons: ['72KB bundle size', 'Mutable API causes bugs', 'No tree-shaking', 'Ecosystem has moved on'],
          category: 'ecosystem',
        },
      };
    },
  },
  {
    id: 'lodash-full',
    name: 'Full Lodash Import',
    description: 'Full lodash may be excessive for most use cases',
    severity: 'suggestion',
    evaluate: (ctx) => {
      if (ctx.analysis.package.name !== 'lodash') {
        return { triggered: false };
      }
      return {
        triggered: true,
        recommendation: {
          package: 'lodash',
          severity: 'suggestion',
          message: 'You probably do not need full lodash. Consider individual imports or modern alternatives.',
          alternatives: [
            { name: 'lodash-es', description: 'ESM version of lodash for tree-shaking', advantages: ['Tree-shakeable', 'Same API', 'Smaller bundle'] },
            { name: 'remeda', description: 'TypeScript-first utility library', advantages: ['TypeScript native', 'Tree-shakeable', 'Pipe-first', 'Modern'] },
            { name: 'radash', description: 'Modern, typed utility library', advantages: ['Zero deps', 'TypeScript native', 'Tree-shakeable', 'Modern API'] },
            { name: 'es-toolkit', description: 'Blazingly fast JS utility library', advantages: ['2-3x faster', 'Smaller bundle', 'TypeScript native', 'Drop-in replacement'] },
          ],
          reasons: ['72KB full bundle', 'Most projects use <10 functions', 'No tree-shaking in CJS', 'Modern alternatives exist'],
          category: 'bundle-size',
        },
      };
    },
  },
  {
    id: 'request-deprecated',
    name: 'Request Deprecated',
    description: 'Request library is fully deprecated',
    severity: 'critical',
    evaluate: (ctx) => {
      if (ctx.analysis.package.name !== 'request') {
        return { triggered: false };
      }
      return {
        triggered: true,
        recommendation: {
          package: 'request',
          severity: 'critical',
          message: 'Request is fully deprecated and no longer maintained. Do not use in new projects.',
          alternatives: [
            { name: 'got', description: 'Human-friendly HTTP request library', advantages: ['Actively maintained', 'TypeScript', 'Retry support', 'Streams'] },
            { name: 'ky', description: 'Tiny HTTP client based on Fetch', advantages: ['Tiny bundle', 'Fetch-based', 'Browser + Node', 'Modern'] },
            { name: 'native fetch', description: 'Built-in fetch API (Node 18+)', advantages: ['Zero dependencies', 'Standard API', 'Built-in', 'No install needed'] },
          ],
          reasons: ['Fully deprecated', 'No security patches', 'No maintenance', 'Modern alternatives are better'],
          category: 'maintenance',
        },
      };
    },
  },
  {
    id: 'axios-alternatives',
    name: 'Axios Alternatives',
    description: 'Axios has lighter modern alternatives',
    severity: 'info',
    evaluate: (ctx) => {
      if (ctx.analysis.package.name !== 'axios') {
        return { triggered: false };
      }
      return {
        triggered: true,
        recommendation: {
          package: 'axios',
          severity: 'info',
          message: 'Axios is stable but has lighter alternatives. Consider if you need its full feature set.',
          alternatives: [
            { name: 'ky', description: 'Tiny elegant HTTP client', advantages: ['3KB vs 13KB', 'Fetch-based', 'Modern', 'Hooks'] },
            { name: 'ofetch', description: 'Better fetch API by UnJS', advantages: ['Auto-retry', 'Auto-parse', 'Universal', 'Tiny'] },
            { name: 'native fetch', description: 'Built-in fetch (Node 18+)', advantages: ['Zero deps', 'Standard', 'Built-in'] },
          ],
          reasons: ['13KB bundle', 'Native fetch covers most use cases', 'Lighter alternatives exist'],
          category: 'bundle-size',
        },
      };
    },
  },
  {
    id: 'node-sass-deprecated',
    name: 'Node Sass Deprecated',
    description: 'node-sass is deprecated in favor of dart-sass',
    severity: 'critical',
    evaluate: (ctx) => {
      if (ctx.analysis.package.name !== 'node-sass') {
        return { triggered: false };
      }
      return {
        triggered: true,
        recommendation: {
          package: 'node-sass',
          severity: 'critical',
          message: 'node-sass is deprecated. Use the official Dart Sass implementation.',
          alternatives: [
            { name: 'sass', description: 'Official Dart Sass implementation', advantages: ['Actively maintained', 'Latest features', 'No native deps', 'Official'] },
          ],
          reasons: ['Deprecated', 'Native compilation issues', 'Missing new features', 'Security risks'],
          category: 'maintenance',
        },
      };
    },
  },
];
