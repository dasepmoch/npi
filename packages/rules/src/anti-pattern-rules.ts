import type { Rule } from './engine.js';

export const antiPatternRules: Rule[] = [
  {
    id: 'too-many-deps',
    name: 'Excessive Dependencies',
    description: 'Package has too many direct dependencies',
    severity: 'warning',
    evaluate: (ctx) => {
      const depCount = Object.keys(ctx.analysis.package.dependencies).length;
      if (depCount < 15) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'warning',
          message: `This package has ${depCount} direct dependencies. This increases install size and supply chain risk.`,
          alternatives: [],
          reasons: [
            `${depCount} direct dependencies`,
            'Increased supply chain attack surface',
            'Slower install times',
            'Potential version conflicts',
          ],
          category: 'bundle-size',
        },
      };
    },
  },
  {
    id: 'abandoned-package',
    name: 'Abandoned Package',
    description: 'Package has not been updated in over 2 years',
    severity: 'warning',
    evaluate: (ctx) => {
      const lastPublish = toDate(ctx.analysis.package.lastPublish);
      const daysSincePublish = daysBetween(lastPublish, new Date());
      if (daysSincePublish < 730) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'warning',
          message: `This package has not been updated in ${Math.round(daysSincePublish / 365)} years. It may be abandoned.`,
          alternatives: [],
          reasons: [
            `Last published ${Math.round(daysSincePublish / 30)} months ago`,
            'May have unpatched vulnerabilities',
            'May not support modern Node.js',
            'No active maintenance',
          ],
          category: 'maintenance',
        },
      };
    },
  },
  {
    id: 'no-types',
    name: 'No TypeScript Support',
    description: 'Package has no TypeScript type definitions',
    severity: 'info',
    evaluate: (ctx) => {
      if (ctx.analysis.dx.typescript !== 'none') return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'info',
          message: 'This package has no TypeScript type definitions. DX may be limited.',
          alternatives: [],
          reasons: [
            'No IntelliSense support',
            'No compile-time type checking',
            'Manual type declarations needed',
          ],
          category: 'dx',
        },
      };
    },
  },
  {
    id: 'no-esm',
    name: 'No ESM Support',
    description: 'Package does not support ES Modules',
    severity: 'info',
    evaluate: (ctx) => {
      if (ctx.analysis.dx.esm) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'info',
          message: 'This package does not support ES Modules. Tree-shaking will not work.',
          alternatives: [],
          reasons: [
            'No tree-shaking possible',
            'Larger bundle size',
            'May cause issues in ESM projects',
          ],
          category: 'bundle-size',
        },
      };
    },
  },
  {
    id: 'single-maintainer',
    name: 'Single Maintainer Risk',
    description: 'Package has only one maintainer (bus factor = 1)',
    severity: 'info',
    evaluate: (ctx) => {
      if (!ctx.analysis.github || ctx.analysis.github.contributors > 2) {
        return { triggered: false };
      }

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'info',
          message: 'This package has very few contributors. Bus factor risk is high.',
          alternatives: [],
          reasons: [
            'Single point of failure',
            'Maintenance may stop unexpectedly',
            'Limited review process',
          ],
          category: 'maintenance',
        },
      };
    },
  },
];

/**
 * Safely convert a value to Date (handles string from JSON deserialization).
 */
function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

function daysBetween(a: Date, b: Date): number {
  const diff = Math.abs(b.getTime() - a.getTime());
  return diff / (1000 * 60 * 60 * 24);
}
