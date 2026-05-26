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

  constructor(options?: { cacheTtl?: number }) {
    this.cache = new CacheManager({ ttl: options?.cacheTtl ?? 3600 });
    this.ruleEngine = new RuleEngine();
    this.ruleEngine.registerMany(packageRules);
    this.ruleEngine.registerMany(antiPatternRules);
    this.loadPluginsAsync();
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

    const cacheKey = `analysis:${packageName}`;

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
    // Limit concurrency to avoid overwhelming APIs
    const results: PackageAnalysis[] = [];

    for (let i = 0; i < packages.length; i += MAX_CONCURRENT) {
      const batch = packages.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(
        batch.map((pkg) => this.analyze(pkg, options))
      );
      results.push(...batchResults);
    }

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
