import { describe, it, expect } from 'vitest';
import { ExplanationEngine } from './explanation-engine.js';
import type { PackageAnalysis } from '@npi/core';

function createMockAnalysis(name: string, overrides?: Partial<PackageAnalysis>): PackageAnalysis {
  return {
    package: {
      name,
      version: '1.0.0',
      description: 'A test package for testing',
      license: 'MIT',
      keywords: [],
      maintainers: [],
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      lastPublish: new Date(),
      created: new Date(),
      weeklyDownloads: 500000,
      versions: ['1.0.0'],
    },
    health: { overall: 70, releaseFrequency: 70, issueRatio: 70, contributorCount: 70, commitVelocity: 70, maintenanceActivity: 70, busFactor: 70 },
    bundle: { level: 'moderate', installSize: 50000, transitiveDeps: 5, treeShaking: 'partial', sideEffects: true },
    dx: { overall: 70, typescript: 'native', esm: true, documentation: 70, setupComplexity: 30, apiErgonomics: 70 },
    ecosystem: { status: 'stable', trend: 'stable', modernAlternatives: [], migrationDifficulty: 'easy' },
    recommendations: [],
    analyzedAt: new Date(),
    ...overrides,
  };
}

describe('ExplanationEngine', () => {
  const engine = new ExplanationEngine();

  it('should return template-based explanation for known packages', () => {
    const analysis = createMockAnalysis('moment');
    const result = engine.explain(analysis);

    expect(result.package).toBe('moment');
    expect(result.whyUsed).toContain('Moment.js');
    expect(result.whyMovedAway).toContain('bundle size');
    expect(result.alternatives).toContain('dayjs');
    expect(result.migrationTip).toBeDefined();
  });

  it('should return template for lodash', () => {
    const analysis = createMockAnalysis('lodash');
    const result = engine.explain(analysis);

    expect(result.package).toBe('lodash');
    expect(result.whyUsed).toContain('utility library');
    expect(result.alternatives).toContain('remeda');
  });

  it('should generate dynamic explanation for unknown packages', () => {
    const analysis = createMockAnalysis('some-unknown-pkg');
    const result = engine.explain(analysis);

    expect(result.package).toBe('some-unknown-pkg');
    expect(result.whyUsed).toContain('some-unknown-pkg');
    expect(result.currentSentiment).toBeDefined();
  });

  it('should include whyMovedAway for legacy packages', () => {
    const analysis = createMockAnalysis('old-pkg', {
      ecosystem: { status: 'legacy', trend: 'declining', modernAlternatives: ['new-pkg'], migrationDifficulty: 'easy' },
    });
    const result = engine.explain(analysis);

    expect(result.whyMovedAway).toBeDefined();
    expect(result.whyMovedAway).toContain('new-pkg');
  });

  it('should not include whyMovedAway for thriving packages', () => {
    const analysis = createMockAnalysis('good-pkg', {
      ecosystem: { status: 'thriving', trend: 'growing', modernAlternatives: [], migrationDifficulty: 'easy' },
    });
    const result = engine.explain(analysis);

    expect(result.whyMovedAway).toBeUndefined();
  });

  it('should describe popularity based on downloads', () => {
    const analysis = createMockAnalysis('popular-pkg');
    analysis.package.weeklyDownloads = 5000000;
    const result = engine.explain(analysis);

    expect(result.whyUsed).toContain('extremely popular');
  });
});
