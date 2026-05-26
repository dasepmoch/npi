import type { Recommendation, Severity, PackageAnalysis, ProjectContext } from '@npi/core';

export interface RuleContext {
  analysis: PackageAnalysis;
  project?: ProjectContext;
}

export interface RuleEvalOptions {
  ignore?: string[];
  ruleOverrides?: Record<string, string>;
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
  private rules: Map<string, Rule> = new Map();

  register(rule: Rule): void {
    // Last registered wins (plugin overrides built-in)
    this.rules.set(rule.id, rule);
  }

  registerMany(rules: Rule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  evaluate(context: RuleContext, options?: RuleEvalOptions): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const ignoredPackages = new Set(options?.ignore ?? []);

    // Skip if package is in ignore list
    if (ignoredPackages.has(context.analysis.package.name)) {
      return [];
    }

    for (const rule of this.rules.values()) {
      // Check if rule is turned off via config
      const ruleOverride = options?.ruleOverrides?.[rule.id];
      if (ruleOverride === 'off') continue;

      const result = rule.evaluate(context);
      if (result.triggered && result.recommendation) {
        // Apply severity override from config
        if (ruleOverride) {
          result.recommendation.severity = ruleOverride as Severity;
        }
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
    return [...this.rules.values()];
  }
}
