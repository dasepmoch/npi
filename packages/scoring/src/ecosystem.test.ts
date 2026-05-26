import { describe, it, expect } from 'vitest';
import { calculateEcosystemScore } from './ecosystem.js';
import type { NpmPackageMetadata, GithubMetadata } from '@npi/core';

function createMockNpm(overrides?: Partial<NpmPackageMetadata>): NpmPackageMetadata {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    description: 'Test',
    license: 'MIT',
    keywords: [],
    maintainers: [],
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    lastPublish: new Date(),
    created: new Date(),
    weeklyDownloads: 500000,
    versions: ['1.0.0'],
    ...overrides,
  };
}

describe('calculateEcosystemScore', () => {
  it('should mark moment as legacy', () => {
    const npm = createMockNpm({ name: 'moment' });
    const result = calculateEcosystemScore(npm);

    expect(result.status).toBe('legacy');
    expect(result.trend).toBe('declining');
    expect(result.modernAlternatives).toContain('dayjs');
  });

  it('should mark request as deprecated', () => {
    const npm = createMockNpm({ name: 'request' });
    const result = calculateEcosystemScore(npm);

    expect(result.status).toBe('deprecated');
    expect(result.modernAlternatives).toContain('got');
  });

  it('should mark lodash as declining', () => {
    const npm = createMockNpm({ name: 'lodash' });
    const result = calculateEcosystemScore(npm);

    expect(result.status).toBe('declining');
    expect(result.modernAlternatives).toContain('remeda');
  });

  it('should mark deprecated packages from npm metadata', () => {
    const npm = createMockNpm({ name: 'some-pkg', deprecated: 'Use other-pkg instead' });
    const result = calculateEcosystemScore(npm);

    expect(result.status).toBe('deprecated');
  });

  it('should mark thriving for popular recently-published packages', () => {
    const npm = createMockNpm({
      name: 'popular-pkg',
      weeklyDownloads: 5000000,
      lastPublish: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
    const result = calculateEcosystemScore(npm);

    expect(result.status).toBe('thriving');
  });

  it('should mark archived repos as deprecated', () => {
    const npm = createMockNpm({ name: 'archived-pkg', weeklyDownloads: 5000000 });
    const github: GithubMetadata = {
      stars: 1000,
      forks: 100,
      openIssues: 10,
      closedIssues: 50,
      lastCommit: new Date(),
      contributors: 5,
      license: 'MIT',
      archived: true,
      topics: [],
      commitFrequency: 0,
    };
    const result = calculateEcosystemScore(npm, github);

    expect(result.status).toBe('deprecated');
  });

  it('should handle Date as string from cache', () => {
    const npm = createMockNpm({
      name: 'some-pkg',
      lastPublish: '2024-06-01T00:00:00.000Z' as unknown as Date,
    });
    const result = calculateEcosystemScore(npm);

    expect(result.status).toBeDefined();
  });
});
