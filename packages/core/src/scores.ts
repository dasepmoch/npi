import type { HealthScore, BundleImpactScore, DxScore, EcosystemScore } from './types.js';

export function calculateOverallHealth(score: HealthScore): number {
  const weights = {
    releaseFrequency: 0.2,
    issueRatio: 0.15,
    contributorCount: 0.15,
    commitVelocity: 0.2,
    maintenanceActivity: 0.2,
    busFactor: 0.1,
  };

  return Math.round(
    score.releaseFrequency * weights.releaseFrequency +
    score.issueRatio * weights.issueRatio +
    score.contributorCount * weights.contributorCount +
    score.commitVelocity * weights.commitVelocity +
    score.maintenanceActivity * weights.maintenanceActivity +
    score.busFactor * weights.busFactor
  );
}

export function getBundleImpactLevel(sizeKb: number): BundleImpactScore['level'] {
  if (sizeKb < 5) return 'minimal';
  if (sizeKb < 20) return 'low';
  if (sizeKb < 50) return 'moderate';
  if (sizeKb < 150) return 'high';
  return 'critical';
}

export function getDxRating(score: DxScore): string {
  if (score.overall >= 90) return 'Excellent';
  if (score.overall >= 75) return 'Good';
  if (score.overall >= 50) return 'Fair';
  if (score.overall >= 25) return 'Poor';
  return 'Minimal';
}

export function getEcosystemLabel(score: EcosystemScore): string {
  switch (score.status) {
    case 'thriving': return '🟢 Thriving';
    case 'stable': return '🔵 Stable';
    case 'declining': return '🟡 Declining';
    case 'legacy': return '🟠 Legacy';
    case 'deprecated': return '🔴 Deprecated';
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
