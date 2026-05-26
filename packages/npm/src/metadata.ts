import type { NpmPackageMetadata } from '@npi/core';
import { NpmClient, type NpmRegistryResponse, type NpmVersionResponse } from './client.js';

export async function fetchPackageMetadata(
  packageName: string,
  options?: { client?: NpmClient; version?: string }
): Promise<NpmPackageMetadata> {
  const npmClient = options?.client ?? new NpmClient();

  // Fetch package data and downloads in parallel
  const [data, downloads] = await Promise.all([
    npmClient.getPackage(packageName),
    npmClient.getDownloads(packageName),
  ]);

  return transformToMetadata(data, downloads.downloads, options?.version);
}

/**
 * Resolve a version specifier to an actual version from available versions.
 * Handles: exact versions, dist-tags, and simple major version matching.
 */
function resolveVersion(data: NpmRegistryResponse, requested?: string): string | undefined {
  if (!requested) return undefined;

  // Check if it's a dist-tag (latest, next, beta, etc.)
  if (data['dist-tags']?.[requested]) {
    return data['dist-tags'][requested];
  }

  // Check if it's an exact version match
  if (data.versions?.[requested]) {
    return requested;
  }

  // Try to match major version (e.g., "18" matches "18.x.x")
  const versions = Object.keys(data.versions ?? {});

  // If requested looks like just a number, match major version
  if (/^\d+$/.test(requested)) {
    const major = parseInt(requested, 10);
    const matching = versions
      .filter((v) => {
        const parts = v.split('.');
        return parseInt(parts[0], 10) === major && !v.includes('-');
      })
      .sort(compareVersions);
    return matching[matching.length - 1]; // latest matching major
  }

  // If requested is major.minor, match
  if (/^\d+\.\d+$/.test(requested)) {
    const [reqMajor, reqMinor] = requested.split('.').map(Number);
    const matching = versions
      .filter((v) => {
        const parts = v.split('.').map(Number);
        return parts[0] === reqMajor && parts[1] === reqMinor && !v.includes('-');
      })
      .sort(compareVersions);
    return matching[matching.length - 1];
  }

  // If it starts with ^ or ~, strip and try exact
  const stripped = requested.replace(/^[\^~>=<]*/, '');
  if (data.versions?.[stripped]) {
    return stripped;
  }

  // Fallback: return undefined (will use latest)
  return undefined;
}

/**
 * Simple semver comparison for sorting.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) {
      return (pa[i] ?? 0) - (pb[i] ?? 0);
    }
  }
  return 0;
}

function transformToMetadata(
  data: NpmRegistryResponse,
  weeklyDownloads: number,
  requestedVersion?: string
): NpmPackageMetadata {
  const latestVersion = data['dist-tags']?.['latest'] ?? '';

  // Resolve the target version
  const targetVersion = resolveVersion(data, requestedVersion) ?? latestVersion;
  const latest = data.versions?.[targetVersion];
  const versions = Object.keys(data.versions ?? {});
  const times = data.time ?? {};

  return {
    name: data.name,
    version: targetVersion,
    description: data.description ?? '',
    license: data.license ?? 'Unknown',
    homepage: data.homepage,
    repository: data.repository?.url,
    keywords: data.keywords ?? [],
    author: data.maintainers?.[0]?.name,
    maintainers: data.maintainers?.map((m) => m.name) ?? [],
    dependencies: latest?.dependencies ?? {},
    devDependencies: latest?.devDependencies ?? {},
    peerDependencies: latest?.peerDependencies ?? {},
    lastPublish: new Date(times[targetVersion] ?? Date.now()),
    created: new Date(times['created'] ?? Date.now()),
    weeklyDownloads,
    versions,
    deprecated: latest?.deprecated,
    types: !!(latest?.types || latest?.typings),
    module: hasEsmSupport(latest),
    sideEffects: determineSideEffects(latest),
    unpackedSize: latest?.dist?.unpackedSize,
  };
}

/**
 * Detect ESM support by checking `module`, `type: "module"`, or `exports` field.
 */
function hasEsmSupport(latest?: NpmVersionResponse): boolean {
  if (!latest) return false;
  if (latest.module) return true;
  if (latest.type === 'module') return true;
  if (latest.exports) {
    // Check if exports has import/module conditions
    const exportsStr = JSON.stringify(latest.exports);
    if (exportsStr.includes('"import"') || exportsStr.includes('"module"')) {
      return true;
    }
  }
  return false;
}

/**
 * Determine sideEffects status.
 * - `false` means fully tree-shakeable
 * - `true` means has side effects (or unknown)
 * - array means partial (specific files have side effects)
 */
function determineSideEffects(latest?: NpmVersionResponse): boolean {
  if (!latest) return true;
  if (latest.sideEffects === false) return false;
  if (Array.isArray(latest.sideEffects)) return false; // partial = still tree-shakeable
  return true;
}
