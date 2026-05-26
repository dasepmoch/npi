import type { PackageAnalysis, ProjectContext } from '@npi/core';
import { fetchPackageMetadata } from '@npi/npm';
import { fetchGithubMetadata } from '@npi/github';
import { calculateHealthScore, calculateBundleImpact, calculateDxScore, calculateEcosystemScore } from '@npi/scoring';
import { RuleEngine, packageRules, antiPatternRules, loadPlugins } from '@npi/rules';
import { CacheManager } from '@npi/cache';

export interface AnalyzerOptions {
  cache?: boolean;
  cacheTtl?: number;
  project?: ProjectContext;
}

const MAX_CONCURRENT = 5;

export class PackageAnalyzer {
  private cache: CacheManager;
  private ruleEngine: RuleEngine;
  private pluginsLoaded: Promise<void>;

  constructor(options?: { cacheTtl?: number }) {
    this.cache = new CacheManager({ ttl: options?.cacheTtl ?? 3600 });
    this.ruleEngine = new RuleEngine();
    this.ruleEngine.registerMany(packageRules);
    this.ruleEngine.registerMany(antiPatternRules);
    this.pluginsLoaded = this.loadPluginsAsync();
  }

  private async loadPluginsAsync(): Promise<void> {
    try {
      const pluginRules = await loadPlugins();
      this.ruleEngine.registerMany(pluginRules);
    } catch {
      // Plugin loading is non-critical
    }
  }

  async analyze(
    packageName: string,
    options?: AnalyzerOptions
  ): Promise<PackageAnalysis> {
    // Validate package name
    if (!isValidPackageName(packageName)) {
      throw new Error(`Invalid package name: "${packageName}"`);
    }

    const cacheKey = options?.project
      ? `analysis:${packageName}:${options.project.framework}:${options.project.typescript}`
      : `analysis:${packageName}`;

    // Check cache
    if (options?.cache !== false) {
      const cached = await this.cache.get<PackageAnalysis>(cacheKey);
      if (cached) return cached;
    }

    // Fetch npm metadata (required)
    const npmMetadata = await fetchPackageMetadata(packageName);

    // Fetch GitHub metadata (optional, non-blocking)
    const githubMetadata = npmMetadata.repository
      ? await fetchGithubMetadata(npmMetadata.repository).catch(() => undefined)
      : undefined;

    // Calculate scores
    const health = calculateHealthScore(npmMetadata, githubMetadata);
    const bundle = calculateBundleImpact(npmMetadata);
    const dx = calculateDxScore(npmMetadata, githubMetadata);
    const ecosystem = calculateEcosystemScore(npmMetadata, githubMetadata);

    // Build analysis
    const analysis: PackageAnalysis = {
      package: npmMetadata,
      github: githubMetadata,
      health,
      bundle,
      dx,
      ecosystem,
      recommendations: [],
      analyzedAt: new Date(),
    };

    // Ensure plugins are loaded before evaluating rules
    await this.pluginsLoaded;

    // Run rules
    const recommendations = this.ruleEngine.evaluate({
      analysis,
      project: options?.project,
    });
    analysis.recommendations = recommendations;

    // Cache result (fire-and-forget, don't block on cache write)
    if (options?.cache !== false) {
      this.cache.set(cacheKey, analysis, options?.cacheTtl).catch(() => {});
    }

    return analysis;
  }

  async analyzeMultiple(
    packages: string[],
    options?: AnalyzerOptions
  ): Promise<PackageAnalysis[]> {
    const results: PackageAnalysis[] = [];
    const errors: Array<{ package: string; error: string }> = [];

    for (let i = 0; i < packages.length; i += MAX_CONCURRENT) {
      const batch = packages.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.allSettled(
        batch.map((pkg) => this.analyze(pkg, options))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            package: batch[j],
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          });
        }
      }
    }

    // Store errors for callers that want to check them
    (results as PackageAnalysis[] & { _errors?: typeof errors })._errors = errors;
    return results;
  }
}

/**
 * Basic validation for npm package names.
 * Prevents obviously invalid inputs from being sent to the registry.
 */
function isValidPackageName(name: string): boolean {
  if (!name || name.length > 214) return false;
  if (name.startsWith('.') || name.startsWith('_')) return false;
  if (name.includes('..')) return false;

  // Scoped packages: @scope/name
  if (name.startsWith('@')) {
    const parts = name.slice(1).split('/');
    if (parts.length !== 2) return false;
    if (!parts[0] || !parts[1]) return false;
  }

  // Basic character validation (npm allows lowercase, digits, hyphens, dots, underscores, tildes)
  const validPattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return validPattern.test(name);
}
