import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export interface ResolvedDependency {
  name: string;
  requestedRange: string;
  resolvedVersion: string;
  dependencyType: 'dependency' | 'devDependency';
}

/**
 * Parse lockfile to get resolved versions.
 * Supports package-lock.json and pnpm-lock.yaml (basic).
 */
export async function parseLockfile(cwd: string): Promise<ResolvedDependency[] | null> {
  // Try package-lock.json first
  const npmLock = join(cwd, 'package-lock.json');
  if (existsSync(npmLock)) {
    return parseNpmLockfile(npmLock, cwd);
  }

  // Try pnpm-lock.yaml
  const pnpmLock = join(cwd, 'pnpm-lock.yaml');
  if (existsSync(pnpmLock)) {
    return parsePnpmLockfile(pnpmLock, cwd);
  }

  return null;
}

async function parseNpmLockfile(lockPath: string, cwd: string): Promise<ResolvedDependency[]> {
  try {
    const content = await readFile(lockPath, 'utf-8');
    const lock = JSON.parse(content);
    const results: ResolvedDependency[] = [];

    // Read package.json for dependency types
    const pkgJson = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'));
    const deps = pkgJson.dependencies ?? {};
    const devDeps = pkgJson.devDependencies ?? {};

    // npm lockfile v2/v3 uses "packages" field
    if (lock.packages) {
      for (const [key, value] of Object.entries(lock.packages)) {
        if (!key || key === '') continue; // skip root
        const pkg = value as { version?: string; dev?: boolean };
        const name = key.replace(/^node_modules\//, '').replace(/.*node_modules\//, '');

        if (!pkg.version) continue;
        if (!deps[name] && !devDeps[name]) continue; // only direct deps

        results.push({
          name,
          requestedRange: deps[name] ?? devDeps[name] ?? '*',
          resolvedVersion: pkg.version,
          dependencyType: devDeps[name] ? 'devDependency' : 'dependency',
        });
      }
    }
    // npm lockfile v1 uses "dependencies" field
    else if (lock.dependencies) {
      for (const [name, value] of Object.entries(lock.dependencies)) {
        const pkg = value as { version?: string; dev?: boolean };
        if (!pkg.version) continue;
        if (!deps[name] && !devDeps[name]) continue;

        results.push({
          name,
          requestedRange: deps[name] ?? devDeps[name] ?? '*',
          resolvedVersion: pkg.version,
          dependencyType: devDeps[name] ? 'devDependency' : 'dependency',
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

async function parsePnpmLockfile(lockPath: string, cwd: string): Promise<ResolvedDependency[]> {
  try {
    const content = await readFile(lockPath, 'utf-8');
    const results: ResolvedDependency[] = [];

    // Read package.json for dependency types
    const pkgJson = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8'));
    const deps = pkgJson.dependencies ?? {};
    const devDeps = pkgJson.devDependencies ?? {};

    // Simple YAML parsing for pnpm-lock - extract version from dependency entries
    // Format: /package-name@version or package-name@version
    const allDeps = { ...deps, ...devDeps };
    for (const [name, range] of Object.entries(allDeps)) {
      // Try to find resolved version in lockfile content
      const patterns = [
        new RegExp(`/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([\\d.]+)`),
        new RegExp(`'${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}': ([\\d.]+)`),
        new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([\\d.]+[\\w.-]*)`),
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          results.push({
            name,
            requestedRange: range as string,
            resolvedVersion: match[1],
            dependencyType: devDeps[name] ? 'devDependency' : 'dependency',
          });
          break;
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}
