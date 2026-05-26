import { describe, it, expect } from 'vitest';
import { calculateOverallHealth, getBundleImpactLevel, getDxRating, getEcosystemLabel, formatSize } from './scores.js';
import type { HealthScore, DxScore, EcosystemScore } from './types.js';

describe('calculateOverallHealth', () => {
  it('should calculate weighted average of health metrics', () => {
    const score: HealthScore = {
      overall: 0,
      releaseFrequency: 100,
      issueRatio: 100,
      contributorCount: 100,
      commitVelocity: 100,
      maintenanceActivity: 100,
      busFactor: 100,
    };
    expect(calculateOverallHealth(score)).toBe(100);
  });

  it('should return 0 for all-zero scores', () => {
    const score: HealthScore = {
      overall: 0,
      releaseFrequency: 0,
      issueRatio: 0,
      contributorCount: 0,
      commitVelocity: 0,
      maintenanceActivity: 0,
      busFactor: 0,
    };
    expect(calculateOverallHealth(score)).toBe(0);
  });

  it('should handle mixed scores correctly', () => {
    const score: HealthScore = {
      overall: 0,
      releaseFrequency: 80,
      issueRatio: 60,
      contributorCount: 70,
      commitVelocity: 90,
      maintenanceActivity: 50,
      busFactor: 40,
    };
    const result = calculateOverallHealth(score);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });
});

describe('getBundleImpactLevel', () => {
  it('should return minimal for tiny packages', () => {
    expect(getBundleImpactLevel(2)).toBe('minimal');
  });

  it('should return low for small packages', () => {
    expect(getBundleImpactLevel(10)).toBe('low');
  });

  it('should return moderate for medium packages', () => {
    expect(getBundleImpactLevel(30)).toBe('moderate');
  });

  it('should return high for large packages', () => {
    expect(getBundleImpactLevel(100)).toBe('high');
  });

  it('should return critical for huge packages', () => {
    expect(getBundleImpactLevel(200)).toBe('critical');
  });
});

describe('getDxRating', () => {
  it('should return Excellent for high scores', () => {
    expect(getDxRating({ overall: 95 } as DxScore)).toBe('Excellent');
  });

  it('should return Good for decent scores', () => {
    expect(getDxRating({ overall: 80 } as DxScore)).toBe('Good');
  });

  it('should return Fair for average scores', () => {
    expect(getDxRating({ overall: 55 } as DxScore)).toBe('Fair');
  });

  it('should return Poor for low scores', () => {
    expect(getDxRating({ overall: 30 } as DxScore)).toBe('Poor');
  });

  it('should return Minimal for very low scores', () => {
    expect(getDxRating({ overall: 10 } as DxScore)).toBe('Minimal');
  });
});

describe('getEcosystemLabel', () => {
  it('should return correct labels for each status', () => {
    expect(getEcosystemLabel({ status: 'thriving' } as EcosystemScore)).toContain('Thriving');
    expect(getEcosystemLabel({ status: 'stable' } as EcosystemScore)).toContain('Stable');
    expect(getEcosystemLabel({ status: 'declining' } as EcosystemScore)).toContain('Declining');
    expect(getEcosystemLabel({ status: 'legacy' } as EcosystemScore)).toContain('Legacy');
    expect(getEcosystemLabel({ status: 'deprecated' } as EcosystemScore)).toContain('Deprecated');
  });
});

describe('formatSize', () => {
  it('should format bytes', () => {
    expect(formatSize(500)).toBe('500B');
  });

  it('should format kilobytes', () => {
    expect(formatSize(2048)).toBe('2.0KB');
  });

  it('should format megabytes', () => {
    expect(formatSize(1048576)).toBe('1.0MB');
  });
});
