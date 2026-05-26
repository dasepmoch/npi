import { z } from 'zod';

// ─── Package Metadata ────────────────────────────────────────────────────────

export interface NpmPackageMetadata {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  author?: string;
  maintainers: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  lastPublish: Date;
  created: Date;
  weeklyDownloads: number;
  versions: string[];
  deprecated?: string;
  types?: boolean;
  module?: boolean;
  sideEffects?: boolean;
  unpackedSize?: number;
  hasInstallScripts?: boolean;
  installScripts?: string[];
}

export interface GithubMetadata {
  stars: number;
  forks: number;
  openIssues: number;
  closedIssues: number;
  lastCommit: Date;
  contributors: number;
  license: string;
  archived: boolean;
  topics: string[];
  commitFrequency: number;
}

// ─── Scores ──────────────────────────────────────────────────────────────────

export interface HealthScore {
  overall: number;
  releaseFrequency: number;
  issueRatio: number;
  contributorCount: number;
  commitVelocity: number;
  maintenanceActivity: number;
  busFactor: number;
}

export interface BundleImpactScore {
  level: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  installSize: number;
  bundleSize?: number;
  transitiveDeps: number;
  treeShaking: 'full' | 'partial' | 'none';
  sideEffects: boolean;
}

export interface DxScore {
  overall: number;
  typescript: 'native' | 'definitelytyped' | 'none';
  esm: boolean;
  documentation: number;
  setupComplexity: number;
  apiErgonomics: number;
}

export interface EcosystemScore {
  status: 'thriving' | 'stable' | 'declining' | 'legacy' | 'deprecated';
  trend: 'growing' | 'stable' | 'declining';
  modernAlternatives: string[];
  migrationDifficulty: 'easy' | 'moderate' | 'hard';
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export type Severity = 'info' | 'suggestion' | 'warning' | 'critical';

export interface Recommendation {
  package: string;
  severity: Severity;
  message: string;
  alternatives: Alternative[];
  reasons: string[];
  category: RecommendationCategory;
}

export interface Alternative {
  name: string;
  description: string;
  bundleSavings?: string;
  advantages: string[];
}

export type RecommendationCategory =
  | 'bundle-size'
  | 'maintenance'
  | 'security'
  | 'ecosystem'
  | 'dx'
  | 'performance'
  | 'anti-pattern'
  | 'framework-specific';

// ─── Analysis Result ─────────────────────────────────────────────────────────

export type Decision = 'recommended' | 'acceptable' | 'use-with-caution' | 'avoid';

export interface AnalysisConfidence {
  level: 'low' | 'medium' | 'high';
  missingSignals: string[];
}

export interface SecurityVulnerability {
  id: string;
  summary: string;
  severity: string;
  fixedVersion?: string;
}

export interface PackageAnalysis {
  package: NpmPackageMetadata;
  github?: GithubMetadata;
  health: HealthScore;
  bundle: BundleImpactScore;
  dx: DxScore;
  ecosystem: EcosystemScore;
  recommendations: Recommendation[];
  analyzedAt: Date;
  confidence?: AnalysisConfidence;
  decision?: Decision;
  vulnerabilities?: SecurityVulnerability[];
}

// ─── Comparison ──────────────────────────────────────────────────────────────

export interface PackageComparison {
  packages: PackageAnalysis[];
  winner?: string;
  summary: string;
}

// ─── Framework Detection ─────────────────────────────────────────────────────

export type Framework =
  | 'nextjs'
  | 'vite'
  | 'astro'
  | 'nuxt'
  | 'remix'
  | 'react-native'
  | 'electron'
  | 'express'
  | 'fastify'
  | 'unknown';

export interface ProjectContext {
  framework: Framework;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  typescript: boolean;
  esm: boolean;
  existingDeps: string[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const NpiConfigSchema = z.object({
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(3600),
    directory: z.string().optional(),
  }).default({}),
  ui: z.object({
    colors: z.boolean().default(true),
    compact: z.boolean().default(false),
    width: z.number().optional(),
  }).default({}),
  install: z.object({
    autoConfirm: z.boolean().default(false),
    preferAlternatives: z.boolean().default(true),
    showBundleImpact: z.boolean().default(true),
  }).default({}),
  telemetry: z.object({
    enabled: z.boolean().default(false),
  }).default({}),
  ignore: z.array(z.string()).default([]),
  rules: z.record(z.enum(['off', 'info', 'suggestion', 'warning', 'critical'])).default({}),
});

export type NpiConfig = z.infer<typeof NpiConfigSchema>;
