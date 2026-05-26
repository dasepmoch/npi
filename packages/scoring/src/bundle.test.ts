import { describe, it, expect } from 'vitest';
import { calculateBundleImpact } from './bundle.js';
import type { NpmPackageMetadata } from '@npi/core';

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
    weeklyDownloads: 1000,
    versions: ['1.0.0'],
    ...overrides,
  };
}

describe('calculateBundleImpact', () => {
  it('should return minimal for tiny zero-dep package', () => {
    const npm = createMockNpm({
      unpackedSize: 3000, // 3KB
      module: true,
      sideEffects: false, // full tree-shaking, no penalty
    });
    const result = calculateBundleImpact(npm);

    expect(result.level).toBe('minimal');
    expect(result.transitiveDeps).toBe(0);
  });

  it('should return high for large package with many deps', () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 15; i++) deps[`dep-${i}`] = '1.0.0';

    const npm = createMockNpm({
      dependencies: deps,
      unpackedSize: 300 * 1024, // 300KB
    });
    const result = calculateBundleImpact(npm);

    // 300KB (score 3) + 15 deps (score 2) + no tree-shaking (score 2) = 7 = critical
    expect(result.level).toBe('critical');
    expect(result.transitiveDeps).toBe(45); // 15 * 3
  });

  it('should detect full tree-shaking', () => {
    const npm = createMockNpm({
      module: true,
      sideEffects: false,
      unpackedSize: 50000,
    });
    const result = calculateBundleImpact(npm);

    expect(result.treeShaking).toBe('full');
    expect(result.sideEffects).toBe(false);
  });

  it('should detect partial tree-shaking', () => {
    const npm = createMockNpm({
      module: true,
      sideEffects: true,
      unpackedSize: 50000,
    });
    const result = calculateBundleImpact(npm);

    expect(result.treeShaking).toBe('partial');
  });

  it('should detect no tree-shaking for CJS', () => {
    const npm = createMockNpm({
      module: undefined,
      unpackedSize: 50000,
    });
    const result = calculateBundleImpact(npm);

    expect(result.treeShaking).toBe('none');
  });

  it('should estimate size when unpackedSize is missing', () => {
    const npm = createMockNpm({ unpackedSize: undefined });
    const result = calculateBundleImpact(npm);

    expect(result.installSize).toBeGreaterThan(0);
  });

  it('should estimate bundle size based on tree-shaking', () => {
    const npm = createMockNpm({
      module: true,
      sideEffects: false,
      unpackedSize: 100000,
    });
    const result = calculateBundleImpact(npm);

    expect(result.bundleSize).toBe(30000); // 30% of install size
  });
});
