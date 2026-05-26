import type { PackageAnalysis, EcosystemScore } from '@npi/core';
import { explanationTemplates, type ExplanationTemplate } from './templates.js';

export interface Explanation {
  package: string;
  whyUsed: string;
  whyMovedAway?: string;
  currentSentiment: string;
  alternatives: string[];
  migrationTip?: string;
}

export class ExplanationEngine {
  explain(analysis: PackageAnalysis): Explanation {
    const name = analysis.package.name;

    // Check for pre-built template
    const template = explanationTemplates[name];
    if (template) {
      return this.fromTemplate(template);
    }

    // Generate dynamic explanation from metadata
    return this.generateDynamic(analysis);
  }

  private fromTemplate(template: ExplanationTemplate): Explanation {
    return {
      package: template.package,
      whyUsed: template.whyUsed,
      whyMovedAway: template.whyMovedAway,
      currentSentiment: template.currentSentiment,
      alternatives: template.alternatives,
      migrationTip: template.migrationTip,
    };
  }

  private generateDynamic(analysis: PackageAnalysis): Explanation {
    const { package: pkg, ecosystem, health } = analysis;

    const whyUsed = this.generateWhyUsed(pkg.name, pkg.description, pkg.weeklyDownloads);
    const currentSentiment = this.generateSentiment(ecosystem, health.overall);
    const whyMovedAway = ecosystem.status === 'legacy' || ecosystem.status === 'deprecated'
      ? this.generateWhyMovedAway(ecosystem)
      : undefined;

    return {
      package: pkg.name,
      whyUsed,
      whyMovedAway,
      currentSentiment,
      alternatives: ecosystem.modernAlternatives,
      migrationTip: ecosystem.modernAlternatives.length > 0
        ? `Consider switching to ${ecosystem.modernAlternatives[0]} for a modern alternative.`
        : undefined,
    };
  }

  private generateWhyUsed(name: string, description: string, downloads: number): string {
    const popularity = downloads > 1000000 ? 'extremely popular'
      : downloads > 100000 ? 'widely used'
      : downloads > 10000 ? 'popular'
      : 'a known';

    return `${name} is ${popularity} package. ${description || 'It provides utility functionality for JavaScript/TypeScript projects.'}`;
  }

  private generateSentiment(ecosystem: EcosystemScore, healthScore: number): string {
    switch (ecosystem.status) {
      case 'thriving':
        return 'Actively maintained and growing. The ecosystem considers this a solid choice.';
      case 'stable':
        return healthScore > 70
          ? 'Stable and well-maintained. A reliable choice for production use.'
          : 'Stable but maintenance activity could be better.';
      case 'declining':
        return 'Usage is declining. The ecosystem is moving toward modern alternatives.';
      case 'legacy':
        return 'Considered legacy. While still functional, modern alternatives are recommended for new projects.';
      case 'deprecated':
        return 'Deprecated. Should not be used in new projects. No active maintenance or security patches.';
    }
  }

  private generateWhyMovedAway(ecosystem: EcosystemScore): string {
    const reasons: string[] = [];

    if (ecosystem.status === 'deprecated') {
      reasons.push('The package has been officially deprecated by its maintainers.');
    }
    if (ecosystem.modernAlternatives.length > 0) {
      reasons.push(`Modern alternatives like ${ecosystem.modernAlternatives.slice(0, 2).join(' and ')} offer better DX and smaller bundles.`);
    }
    if (ecosystem.status === 'legacy') {
      reasons.push('The JavaScript ecosystem has evolved with better patterns and native APIs.');
    }

    return reasons.join(' ');
  }
}
