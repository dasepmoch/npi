import { describe, it, expect } from 'vitest';
import { RuleEngine } from './engine.js';
import type { Rule } from './engine.js';
import type { PackageAnalysis } from '@npi/core';

function createMockAnalysis(name: string): PackageAnalysis {
  return {
    package: {
      name,
      version: '1.0.0',
      description: 'Test',
      license: 'MIT',
      keywords: [],
      maintainers: [],
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      lastPublish: new Date(),
      created: new Date(),
      weeklyDownloads: 1000,
      versions: ['1.0.0'],
    },
    health: { overall: 80, releaseFrequency: 80, issueRatio: 80, contributorCount: 80, commitVelocity: 80, maintenanceActivity: 80, busFactor: 80 },
    bundle: { level: 'low', installSize: 10000, transitiveDeps: 3, treeShaking: 'full', sideEffects: false },
    dx: { overall: 80, typescript: 'native', esm: true, documentation: 80, setupComplexity: 20, apiErgonomics: 80 },
    ecosystem: { status: 'stable', trend: 'stable', modernAlternatives: [], migrationDifficulty: 'easy' },
    recommendations: [],
    analyzedAt: new Date(),
  };
}

describe('RuleEngine', () => {
  it('should register and evaluate rules', () => {
    const engine = new RuleEngine();
    const rule: Rule = {
      id: 'test-rule',
      name: 'Test Rule',
      description: 'A test rule',
      severity: 'warning',
      evaluate: (ctx) => {
        if (ctx.analysis.package.name === 'bad-pkg') {
          return {
            triggered: true,
            recommendation: {
              package: 'bad-pkg',
              severity: 'warning',
              message: 'This is bad',
              alternatives: [],
              reasons: ['reason1'],
              category: 'maintenance',
            },
          };
        }
        return { triggered: false };
      },
    };

    engine.register(rule);

    const result = engine.evaluate({ analysis: createMockAnalysis('bad-pkg') });
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('This is bad');
  });

  it('should not trigger for non-matching packages', () => {
    const engine = new RuleEngine();
    const rule: Rule = {
      id: 'test-rule',
      name: 'Test',
      description: 'Test',
      severity: 'warning',
      evaluate: (ctx) => {
        if (ctx.analysis.package.name === 'bad-pkg') {
          return { triggered: true, recommendation: { package: 'bad-pkg', severity: 'warning', message: 'bad', alternatives: [], reasons: [], category: 'maintenance' } };
        }
        return { triggered: false };
      },
    };

    engine.register(rule);

    const result = engine.evaluate({ analysis: createMockAnalysis('good-pkg') });
    expect(result).toHaveLength(0);
  });

  it('should sort results by severity (critical first)', () => {
    const engine = new RuleEngine();

    engine.register({
      id: 'info-rule', name: 'Info', description: '', severity: 'info',
      evaluate: () => ({ triggered: true, recommendation: { package: 'x', severity: 'info', message: 'info', alternatives: [], reasons: [], category: 'dx' } }),
    });
    engine.register({
      id: 'critical-rule', name: 'Critical', description: '', severity: 'critical',
      evaluate: () => ({ triggered: true, recommendation: { package: 'x', severity: 'critical', message: 'critical', alternatives: [], reasons: [], category: 'maintenance' } }),
    });
    engine.register({
      id: 'warning-rule', name: 'Warning', description: '', severity: 'warning',
      evaluate: () => ({ triggered: true, recommendation: { package: 'x', severity: 'warning', message: 'warning', alternatives: [], reasons: [], category: 'bundle-size' } }),
    });

    const result = engine.evaluate({ analysis: createMockAnalysis('x') });
    expect(result[0].severity).toBe('critical');
    expect(result[1].severity).toBe('warning');
    expect(result[2].severity).toBe('info');
  });

  it('should return registered rules', () => {
    const engine = new RuleEngine();
    engine.register({ id: 'a', name: 'A', description: '', severity: 'info', evaluate: () => ({ triggered: false }) });
    engine.register({ id: 'b', name: 'B', description: '', severity: 'info', evaluate: () => ({ triggered: false }) });

    expect(engine.getRules()).toHaveLength(2);
  });
});
