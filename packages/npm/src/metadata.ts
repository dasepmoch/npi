import semver from 'semver';
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
 * Handles: exact versions, dist-tags, semver ranges, and major/minor matching.
 */
function resolveVersion(data: NpmRegistryResponse, requested?: string): string | undefined {
  if (!requested) return undefined;

  // Check if it's a dist-tag (latest, next, beta, etc.)
  if (data['dist-tags']?.[requested]) {
    return data['dist-tags'][requested];
  }

  const versions = Object.keys(data.versions ?? {}).filter((v) => !semver.prerelease(v));

  // Check exact version match
  if (data.versions?.[requested]) {
    return requested;
  }

  // Try semver range matching
  const resolved = semver.maxSatisfying(versions, requested);
  if (resolved) return resolved;

  // Try major-only (e.g., "18" -> ">=18.0.0 <19.0.0")
  if (/^\d+$/.test(requested)) {
    const major = parseInt(requested, 10);
    const range = `>=${major}.0.0 <${major + 1}.0.0`;
    const resolved = semver.maxSatisfying(versions, range);
    if (resolved) return resolved;
  }

  // Try major.minor (e.g., "18.2" -> ">=18.2.0 <18.3.0")
  if (/^\d+\.\d+$/.test(requested)) {
    const [maj, min] = requested.split('.').map(Number);
    const range = `>=${maj}.${min}.0 <${maj}.${min + 1}.0`;
    const resolved = semver.maxSatisfying(versions, range);
    if (resolved) return resolved;
  }

  // Nothing resolved
  return undefined;
}

function transformToMetadata(
  data: NpmRegistryResponse,
  weeklyDownloads: number,
  requestedVersion?: string
): NpmPackageMetadata {
  const latestVersion = data['dist-tags']?.['latest'] ?? '';
  const resolved = requestedVersion ? resolveVersion(data, requestedVersion) : undefined;

  // If user explicitly requested a version that couldn't be resolved, throw
  if (requestedVersion && !resolved) {
    throw new Error(`Version "${requestedVersion}" not found for "${data.name}". Available: ${Object.keys(data['dist-tags'] ?? {}).join(', ')}`);
  }

  const targetVersion = resolved ?? latestVersion;
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
    hasInstallScripts: hasLifecycleScripts(latest),
    installScripts: getLifecycleScripts(latest),
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

function hasLifecycleScripts(latest?: NpmVersionResponse): boolean {
  if (!latest?.scripts) return false;
  const lifecycle = ['preinstall', 'install', 'postinstall', 'prepare'];
  return lifecycle.some((s) => latest.scripts?.[s]);
}

function getLifecycleScripts(latest?: NpmVersionResponse): string[] {
  if (!latest?.scripts) return [];
  const lifecycle = ['preinstall', 'install', 'postinstall', 'prepare'];
  return lifecycle.filter((s) => latest.scripts?.[s]);
}
