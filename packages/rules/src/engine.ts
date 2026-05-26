import type { Recommendation, Severity, PackageAnalysis, ProjectContext } from '@npi/core';

export interface RuleContext {
  analysis: PackageAnalysis;
  project?: ProjectContext;
}

export interface RuleResult {
  triggered: boolean;
  recommendation?: Recommendation;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  evaluate: (context: RuleContext) => RuleResult;
}

export class RuleEngine {
  private rules: Rule[] = [];

  register(rule: Rule): void {
    this.rules.push(rule);
  }

  registerMany(rules: Rule[]): void {
    this.rules.push(...rules);
  }

  evaluate(context: RuleContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const rule of this.rules) {
      const result = rule.evaluate(context);
      if (result.triggered && result.recommendation) {
        recommendations.push(result.recommendation);
      }
    }

    // Sort by severity
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      warning: 1,
      suggestion: 2,
      info: 3,
    };

    return recommendations.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
  }

  getRules(): Rule[] {
    return [...this.rules];
  }
}
