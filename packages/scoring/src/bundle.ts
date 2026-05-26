import type { NpmPackageMetadata, BundleImpactScore } from '@npi/core';

export function calculateBundleImpact(npm: NpmPackageMetadata): BundleImpactScore {
  const depCount = Object.keys(npm.dependencies).length;
  const installSize = npm.unpackedSize ?? estimateSize(npm);
  const transitiveDeps = estimateTransitiveDeps(depCount);

  const treeShaking = determineTreeShaking(npm);
  const sideEffects = npm.sideEffects !== false;

  const sizeKb = installSize / 1024;
  const level = getBundleLevel(sizeKb, depCount, treeShaking);

  return {
    level,
    installSize,
    bundleSize: estimateBundleSize(installSize, treeShaking),
    transitiveDeps,
    treeShaking,
    sideEffects,
  };
}

function getBundleLevel(
  sizeKb: number,
  depCount: number,
  treeShaking: BundleImpactScore['treeShaking']
): BundleImpactScore['level'] {
  let score = 0;

  // Size factor
  if (sizeKb > 500) score += 4;
  else if (sizeKb > 200) score += 3;
  else if (sizeKb > 50) score += 2;
  else if (sizeKb > 10) score += 1;

  // Dependency factor
  if (depCount > 20) score += 3;
  else if (depCount > 10) score += 2;
  else if (depCount > 5) score += 1;

  // Tree-shaking factor
  if (treeShaking === 'none') score += 2;
  else if (treeShaking === 'partial') score += 1;

  if (score >= 7) return 'critical';
  if (score >= 5) return 'high';
  if (score >= 3) return 'moderate';
  if (score >= 1) return 'low';
  return 'minimal';
}

function determineTreeShaking(npm: NpmPackageMetadata): BundleImpactScore['treeShaking'] {
  // ESM + no side effects = full tree-shaking
  if (npm.module && npm.sideEffects === false) return 'full';
  // ESM but has side effects = partial
  if (npm.module) return 'partial';
  // No ESM = no tree-shaking
  return 'none';
}

function estimateSize(npm: NpmPackageMetadata): number {
  // Rough estimation based on dependency count
  const baseSizeKb = 10;
  const depCount = Object.keys(npm.dependencies).length;
  return (baseSizeKb + depCount * 15) * 1024;
}

function estimateTransitiveDeps(directDeps: number): number {
  // Rough estimation: each dep brings ~3 transitive deps on average
  return directDeps * 3;
}

function estimateBundleSize(
  installSize: number,
  treeShaking: BundleImpactScore['treeShaking']
): number {
  switch (treeShaking) {
    case 'full': return Math.round(installSize * 0.3);
    case 'partial': return Math.round(installSize * 0.6);
    case 'none': return installSize;
  }
}
