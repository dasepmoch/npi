import type { PackageAnalysis, Recommendation, ProjectContext } from '@npi/core';
import { RuleEngine, packageRules, antiPatternRules } from '@npi/rules';

export class RecommendationEngine {
  private ruleEngine: RuleEngine;

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.ruleEngine.registerMany(packageRules);
    this.ruleEngine.registerMany(antiPatternRules);
  }

  getRecommendations(
    analysis: PackageAnalysis,
    project?: ProjectContext
  ): Recommendation[] {
    return this.ruleEngine.evaluate({ analysis, project });
  }

  shouldWarn(analysis: PackageAnalysis): boolean {
    const recs = this.getRecommendations(analysis);
    return recs.some((r) => r.severity === 'warning' || r.severity === 'critical');
  }

  shouldBlock(analysis: PackageAnalysis): boolean {
    const recs = this.getRecommendations(analysis);
    return recs.some((r) => r.severity === 'critical');
  }

  getBestAlternative(analysis: PackageAnalysis): string | undefined {
    const recs = this.getRecommendations(analysis);
    for (const rec of recs) {
      if (rec.alternatives.length > 0) {
        return rec.alternatives[0].name;
      }
    }
    return undefined;
  }
}
