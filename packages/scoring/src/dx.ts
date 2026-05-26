import type { NpmPackageMetadata, GithubMetadata, DxScore } from '@npi/core';

export function calculateDxScore(
  npm: NpmPackageMetadata,
  github?: GithubMetadata
): DxScore {
  const typescript = determineTypescriptSupport(npm);
  const esm = npm.module === true;
  const documentation = scoreDocumentation(npm, github);
  const setupComplexity = scoreSetupComplexity(npm);
  const apiErgonomics = scoreApiErgonomics(npm);

  const overall = Math.round(
    scoreTypescript(typescript) * 0.25 +
    (esm ? 100 : 40) * 0.15 +
    documentation * 0.25 +
    (100 - setupComplexity) * 0.15 +
    apiErgonomics * 0.2
  );

  return {
    overall,
    typescript,
    esm,
    documentation,
    setupComplexity,
    apiErgonomics,
  };
}

function determineTypescriptSupport(npm: NpmPackageMetadata): DxScore['typescript'] {
  // Check if package ships its own types
  if (npm.types) return 'native';

  // Check if package name suggests it's a @types package itself
  if (npm.name.startsWith('@types/')) return 'native';

  // For popular packages, @types likely exists — but we can't verify without a network call.
  // Use a conservative heuristic: only assume @types for very popular packages.
  if (npm.weeklyDownloads > 500000) return 'definitelytyped';

  return 'none';
}

function scoreTypescript(support: DxScore['typescript']): number {
  switch (support) {
    case 'native': return 100;
    case 'definitelytyped': return 70;
    case 'none': return 20;
  }
}

function scoreDocumentation(npm: NpmPackageMetadata, github?: GithubMetadata): number {
  let score = 30; // base

  if (npm.homepage) score += 20;
  if (npm.description && npm.description.length > 20) score += 10;
  if (npm.keywords.length > 3) score += 10;
  if (github?.stars && github.stars > 1000) score += 15;
  if (npm.weeklyDownloads > 100000) score += 15;

  return Math.min(100, score);
}

function scoreSetupComplexity(npm: NpmPackageMetadata): number {
  const depCount = Object.keys(npm.dependencies).length;
  const peerDepCount = Object.keys(npm.peerDependencies).length;

  let complexity = 10; // base

  if (depCount > 10) complexity += 30;
  else if (depCount > 5) complexity += 15;

  if (peerDepCount > 3) complexity += 30;
  else if (peerDepCount > 1) complexity += 15;

  return Math.min(100, complexity);
}

function scoreApiErgonomics(npm: NpmPackageMetadata): number {
  let score = 50; // base

  if (npm.types) score += 20;
  if (npm.module) score += 10;
  if (npm.keywords.length > 0) score += 10;
  if (npm.weeklyDownloads > 500000) score += 10;

  return Math.min(100, score);
}
