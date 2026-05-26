import { describe, it, expect } from 'vitest';
import { calculateHealthScore } from './health.js';
import type { NpmPackageMetadata, GithubMetadata } from '@npi/core';

function createMockNpm(overrides?: Partial<NpmPackageMetadata>): NpmPackageMetadata {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    description: 'Test package',
    license: 'MIT',
    keywords: [],
    maintainers: ['author'],
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    lastPublish: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    created: new Date('2020-01-01'),
    weeklyDownloads: 100000,
    versions: Array.from({ length: 30 }, (_, i) => `1.${i}.0`),
    ...overrides,
  };
}

function createMockGithub(overrides?: Partial<GithubMetadata>): GithubMetadata {
  return {
    stars: 5000,
    forks: 500,
    openIssues: 50,
    closedIssues: 200,
    lastCommit: new Date(),
    contributors: 25,
    license: 'MIT',
    archived: false,
    topics: ['typescript'],
    commitFrequency: 10,
    ...overrides,
  };
}

describe('calculateHealthScore', () => {
  it('should return high score for well-maintained package', () => {
    const npm = createMockNpm();
    const github = createMockGithub();
    const result = calculateHealthScore(npm, github);

    expect(result.overall).toBeGreaterThan(70);
    expect(result.releaseFrequency).toBeGreaterThanOrEqual(85); // published ~30 days ago
    expect(result.contributorCount).toBe(80); // 25 contributors
  });

  it('should return low score for abandoned package', () => {
    const npm = createMockNpm({
      lastPublish: new Date('2020-01-01'),
      versions: ['1.0.0', '1.0.1'],
    });
    const result = calculateHealthScore(npm);

    expect(result.overall).toBeLessThan(40);
    expect(result.releaseFrequency).toBe(10);
  });

  it('should handle missing github data gracefully', () => {
    const npm = createMockNpm();
    const result = calculateHealthScore(npm);

    expect(result.overall).toBeGreaterThan(0);
    expect(result.issueRatio).toBe(50); // default
    expect(result.contributorCount).toBe(50); // default
    expect(result.commitVelocity).toBe(50); // default
    expect(result.busFactor).toBe(30); // default
  });

  it('should handle Date as string (from cache deserialization)', () => {
    const npm = createMockNpm({
      lastPublish: '2024-01-01T00:00:00.000Z' as unknown as Date,
    });
    const result = calculateHealthScore(npm);

    expect(result.overall).toBeGreaterThan(0);
    expect(result.releaseFrequency).toBeGreaterThan(0);
  });

  it('should give high bus factor for many contributors', () => {
    const npm = createMockNpm();
    const github = createMockGithub({ contributors: 50 });
    const result = calculateHealthScore(npm, github);

    expect(result.busFactor).toBeGreaterThanOrEqual(80);
  });

  it('should give low bus factor for single contributor', () => {
    const npm = createMockNpm();
    const github = createMockGithub({ contributors: 1 });
    const result = calculateHealthScore(npm, github);

    expect(result.busFactor).toBe(15);
  });
});
