import type { PackageAnalysis, ProjectContext } from '@npi/core';
import { fetchPackageMetadata } from '@npi/npm';
import { fetchGithubMetadata } from '@npi/github';
import { calculateHealthScore, calculateBundleImpact, enhanceBundleWithReal, calculateDxScore, calculateEcosystemScore } from '@npi/scoring';
import { RuleEngine, packageRules, antiPatternRules, loadPlugins } from '@npi/rules';
import { CacheManager } from '@npi/cache';
import { queryOsv } from '@npi/security';

export interface AnalyzerOptions {
  cache?: boolean;
  cacheTtl?: number;
  project?: ProjectContext;
  ignore?: string[];
  ruleOverrides?: Record<string, string>;
  version?: string;
  dependencyType?: 'dependency' | 'devDependency';
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

    const versionKey = options?.version ?? 'latest';
    const cacheKey = options?.project
      ? `analysis:${packageName}@${versionKey}:${options.project.framework}:${options.project.typescript}`
      : `analysis:${packageName}@${versionKey}`;

    // Check cache
    if (options?.cache !== false) {
      const cached = await this.cache.get<PackageAnalysis>(cacheKey);
      if (cached) return cached;
    }

    // Fetch npm metadata (required)
    const npmMetadata = await fetchPackageMetadata(packageName, { version: options?.version });

    // Fetch GitHub metadata (optional, non-blocking)
    const githubMetadata = npmMetadata.repository
      ? await fetchGithubMetadata(npmMetadata.repository).catch(() => undefined)
      : undefined;

    // Query vulnerabilities (non-blocking)
    const vulnResult = await queryOsv(packageName, npmMetadata.version).catch(() => undefined);
    const vulnerabilities = vulnResult?.vulnerabilities?.map((v) => ({
      id: v.id,
      summary: v.summary,
      severity: v.severity,
      fixedVersion: v.fixed_version,
    })) ?? [];

    // Calculate scores
    const health = calculateHealthScore(npmMetadata, githubMetadata);
    const bundle = calculateBundleImpact(npmMetadata);
    const dx = calculateDxScore(npmMetadata, githubMetadata);
    const ecosystem = calculateEcosystemScore(npmMetadata, githubMetadata);

    // Try to enhance with real bundle data (best-effort, non-blocking)
    const enhancedBundle = await enhanceBundleWithReal(bundle, packageName, npmMetadata.version).catch(() => bundle);

    // Calculate confidence
    const confidence = computeConfidence(npmMetadata, githubMetadata);

    // Build analysis
    const analysis: PackageAnalysis = {
      package: npmMetadata,
      github: githubMetadata,
      health,
      bundle: enhancedBundle,
      dx,
      ecosystem,
      vulnerabilities,
      recommendations: [],
      analyzedAt: new Date(),
      confidence,
    };

    // Ensure plugins are loaded before evaluating rules
    await this.pluginsLoaded;

    // Run rules
    const recommendations = this.ruleEngine.evaluate({
      analysis,
      project: options?.project,
    }, {
      ignore: options?.ignore,
      ruleOverrides: options?.ruleOverrides,
    });
    analysis.recommendations = recommendations;

    // Compute decision
    analysis.decision = computeDecision(analysis);

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

  async analyzeMultipleWithVersions(
    packages: Array<{ name: string; version?: string }>,
    options?: Omit<AnalyzerOptions, 'version'>
  ): Promise<PackageAnalysis[]> {
    const results: PackageAnalysis[] = [];
    const errors: Array<{ package: string; error: string }> = [];

    for (let i = 0; i < packages.length; i += MAX_CONCURRENT) {
      const batch = packages.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.allSettled(
        batch.map((pkg) => this.analyze(pkg.name, { ...options, version: pkg.version }))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            package: batch[j].name,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          });
        }
      }
    }

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

function computeConfidence(
  npm: { weeklyDownloads: number; repository?: string },
  github?: { commitFrequency: number; contributors: number }
): { level: 'low' | 'medium' | 'high'; missingSignals: string[] } {
  const missing: string[] = [];

  if (!github) missing.push('GitHub metadata unavailable');
  if (github && github.commitFrequency === 0) missing.push('Commit activity unavailable');
  if (!npm.repository) missing.push('No repository URL');
  if (npm.weeklyDownloads === 0) missing.push('Download data unavailable');

  const level = missing.length === 0 ? 'high'
    : missing.length <= 2 ? 'medium'
    : 'low';

  return { level, missingSignals: missing };
}

function computeDecision(analysis: PackageAnalysis): 'recommended' | 'acceptable' | 'use-with-caution' | 'avoid' {
  const hasCritical = analysis.recommendations.some((r) => r.severity === 'critical');
  const hasWarning = analysis.recommendations.some((r) => r.severity === 'warning');

  if (hasCritical || analysis.package.deprecated) return 'avoid';
  if (hasWarning || analysis.health.overall < 40) return 'use-with-caution';
  if (analysis.health.overall >= 70 && !hasWarning) return 'recommended';
  return 'acceptable';
}
