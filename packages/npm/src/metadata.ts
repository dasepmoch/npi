import type { NpmPackageMetadata } from '@npi/core';
import { NpmClient, type NpmRegistryResponse, type NpmVersionResponse } from './client.js';

export async function fetchPackageMetadata(
  packageName: string,
  client?: NpmClient
): Promise<NpmPackageMetadata> {
  const npmClient = client ?? new NpmClient();

  // Fetch package data and downloads in parallel
  const [data, downloads] = await Promise.all([
    npmClient.getPackage(packageName),
    npmClient.getDownloads(packageName),
  ]);

  return transformToMetadata(data, downloads.downloads);
}

function transformToMetadata(
  data: NpmRegistryResponse,
  weeklyDownloads: number
): NpmPackageMetadata {
  const latestVersion = data['dist-tags']?.['latest'] ?? '';
  const latest = data.versions?.[latestVersion];
  const versions = Object.keys(data.versions ?? {});
  const times = data.time ?? {};

  return {
    name: data.name,
    version: latestVersion,
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
    lastPublish: new Date(times[latestVersion] ?? Date.now()),
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
