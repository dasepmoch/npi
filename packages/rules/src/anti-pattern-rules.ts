import type { Rule } from './engine.js';
import { detectTyposquat } from './typosquat.js';

export const antiPatternRules: Rule[] = [
  {
    id: 'npm-deprecated',
    name: 'Deprecated by Author',
    description: 'Package is marked as deprecated on npm by its author',
    severity: 'critical',
    evaluate: (ctx) => {
      const deprecated = ctx.analysis.package.deprecated;
      if (!deprecated) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'critical',
          message: `This package is deprecated on npm: "${deprecated}"`,
          alternatives: [],
          reasons: [
            'Marked deprecated by the package author',
            'No future updates or security patches',
            'Should not be used in new projects',
          ],
          category: 'maintenance',
        },
      };
    },
  },
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

      // Severity increases in TypeScript projects
      const severity = ctx.project?.typescript ? 'warning' : 'info';

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity,
          message: ctx.project?.typescript
            ? 'This package has no TypeScript types. You will need manual type declarations.'
            : 'This package has no TypeScript type definitions. DX may be limited.',
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
  {
    id: 'no-esm-in-esm-project',
    name: 'CJS Package in ESM Project',
    description: 'Package does not support ESM in an ESM project',
    severity: 'warning',
    evaluate: (ctx) => {
      if (ctx.analysis.dx.esm) return { triggered: false };
      if (!ctx.project?.esm) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'warning',
          message: 'This CJS-only package may cause issues in your ESM project. Consider an ESM-compatible alternative.',
          alternatives: [],
          reasons: [
            'No tree-shaking possible',
            'May require import workarounds',
            'Incompatible with pure ESM projects',
          ],
          category: 'bundle-size',
        },
      };
    },
  },
  {
    id: 'large-bundle-frontend',
    name: 'Large Bundle in Frontend Project',
    description: 'Large package in a frontend/client-heavy project',
    severity: 'warning',
    evaluate: (ctx) => {
      const frontendFrameworks = ['nextjs', 'vite', 'astro', 'nuxt', 'remix'];
      if (!ctx.project || !frontendFrameworks.includes(ctx.project.framework)) {
        return { triggered: false };
      }
      if (ctx.analysis.bundle.level !== 'high' && ctx.analysis.bundle.level !== 'critical') {
        return { triggered: false };
      }

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'warning',
          message: `This package has ${ctx.analysis.bundle.level} bundle impact. In a ${ctx.project.framework} project, this may significantly affect client-side performance.`,
          alternatives: [],
          reasons: [
            `${ctx.analysis.bundle.level} bundle impact`,
            `Frontend project (${ctx.project.framework})`,
            'May slow down page load',
            'Consider lighter alternatives',
          ],
          category: 'bundle-size',
        },
      };
    },
  },
  {
    id: 'possible-typosquat',
    name: 'Possible Typosquat',
    description: 'Package name is suspiciously similar to a popular package',
    severity: 'critical',
    evaluate: (ctx) => {
      const intended = detectTyposquat(ctx.analysis.package.name);
      if (!intended) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'critical',
          message: `This package name is very similar to "${intended}". This could be a typosquatting attempt. Did you mean "${intended}"?`,
          alternatives: [{ name: intended, description: `The popular package you likely intended`, advantages: [] }],
          reasons: [
            `Name is suspiciously similar to "${intended}"`,
            'Typosquatting is a common supply chain attack vector',
            'Verify this is the intended package before installing',
          ],
          category: 'security',
        },
      };
    },
  },
  {
    id: 'install-scripts',
    name: 'Has Install Scripts',
    description: 'Package runs scripts during installation',
    severity: 'info',
    evaluate: (ctx) => {
      if (!ctx.analysis.package.hasInstallScripts) return { triggered: false };

      const scripts = ctx.analysis.package.installScripts ?? [];
      const daysSinceCreated = daysBetween(toDate(ctx.analysis.package.created), new Date());
      const isNew = daysSinceCreated < 30;
      const lowDownloads = ctx.analysis.package.weeklyDownloads < 1000;

      // Higher risk if package is new AND has low downloads AND install scripts
      const severity = (isNew && lowDownloads) ? 'warning' : 'info';

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity,
          message: `This package runs lifecycle scripts during installation: ${scripts.join(', ')}.${isNew && lowDownloads ? ' Combined with low downloads and recent creation, this is a higher risk signal.' : ''}`,
          alternatives: [],
          reasons: [
            `Has install scripts: ${scripts.join(', ')}`,
            'Install scripts execute code on your machine',
            ...(isNew ? ['Package was created less than 30 days ago'] : []),
            ...(lowDownloads ? ['Package has fewer than 1000 weekly downloads'] : []),
          ],
          category: 'security',
        },
      };
    },
  },
  {
    id: 'license-risk',
    name: 'Restrictive License',
    description: 'Package has a potentially restrictive license',
    severity: 'warning',
    evaluate: (ctx) => {
      const license = ctx.analysis.package.license.toLowerCase();
      const restrictive = ['gpl', 'agpl', 'lgpl', 'sspl', 'bsl', 'elastic'];
      const isRestrictive = restrictive.some((r) => license.includes(r));

      if (!isRestrictive) return { triggered: false };
      if (license === 'unknown') return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'warning',
          message: `This package uses a "${ctx.analysis.package.license}" license which may have copyleft or commercial restrictions.`,
          alternatives: [],
          reasons: [
            `License: ${ctx.analysis.package.license}`,
            'May require you to open-source your code',
            'May have commercial use restrictions',
            'Consult legal counsel for production use',
          ],
          category: 'security',
        },
      };
    },
  },
  {
    id: 'peer-dependency-mismatch',
    name: 'Peer Dependency Mismatch',
    description: 'Package has peer dependencies not satisfied by your project',
    severity: 'warning',
    evaluate: (ctx) => {
      if (!ctx.project?.existingDeps || ctx.project.existingDeps.length === 0) {
        return { triggered: false };
      }

      const peerDeps = ctx.analysis.package.peerDependencies;
      if (Object.keys(peerDeps).length === 0) return { triggered: false };

      const missingPeers: string[] = [];
      for (const peer of Object.keys(peerDeps)) {
        if (!ctx.project.existingDeps.includes(peer)) {
          missingPeers.push(peer);
        }
      }

      if (missingPeers.length === 0) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'warning',
          message: `Missing peer dependencies: ${missingPeers.join(', ')}. You may need to install them separately.`,
          alternatives: [],
          reasons: missingPeers.map((p) => `Requires peer: ${p} (${peerDeps[p]})`),
          category: 'dx',
        },
      };
    },
  },
  {
    id: 'known-vulnerability',
    name: 'Known Vulnerability',
    description: 'Package version has known security vulnerabilities',
    severity: 'critical',
    evaluate: (ctx) => {
      const vulns = ctx.analysis.vulnerabilities;
      if (!vulns || vulns.length === 0) return { triggered: false };

      const critical = vulns.filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH');
      const severity = critical.length > 0 ? 'critical' : 'warning';

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity,
          message: `${vulns.length} known vulnerability(ies) found in ${ctx.analysis.package.name}@${ctx.analysis.package.version}. ${critical.length > 0 ? `${critical.length} are high/critical severity.` : ''}`,
          alternatives: [],
          reasons: vulns.slice(0, 5).map((v) => `${v.id}: ${v.summary}${v.fixedVersion ? ` (fixed in ${v.fixedVersion})` : ''}`),
          category: 'security',
        },
      };
    },
  },
  {
    id: 'recently-published',
    name: 'Recently Published Version',
    description: 'This specific version was published very recently',
    severity: 'info',
    evaluate: (ctx) => {
      const lastPublish = toDate(ctx.analysis.package.lastPublish);
      const daysSince = daysBetween(lastPublish, new Date());

      if (daysSince > 7) return { triggered: false };

      // Only warn if also low downloads or new package
      const lowDownloads = ctx.analysis.package.weeklyDownloads < 10000;
      if (!lowDownloads) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: ctx.analysis.package.name,
          severity: 'info',
          message: `This version was published ${daysSince < 1 ? 'today' : `${Math.round(daysSince)} day(s) ago`}. Exercise caution with very new releases of lesser-known packages.`,
          alternatives: [],
          reasons: [
            `Published ${Math.round(daysSince)} day(s) ago`,
            'New versions may contain undiscovered issues',
            'Consider waiting for community validation',
          ],
          category: 'security',
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
