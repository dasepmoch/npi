import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { Framework, ProjectContext } from '@npi/core';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  type?: string;
}

export async function detectProjectContext(cwd?: string): Promise<ProjectContext> {
  const dir = cwd ?? process.cwd();
  const packageJson = await readPackageJson(dir);
  const framework = detectFramework(packageJson);
  const packageManager = detectPackageManager(dir);
  const typescript = detectTypescript(packageJson, dir);
  const esm = detectEsm(packageJson);
  const existingDeps = [
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {}),
  ];

  return {
    framework,
    packageManager,
    typescript,
    esm,
    existingDeps,
  };
}

export function detectFramework(packageJson?: PackageJson | null): Framework {
  if (!packageJson) return 'unknown';

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if ('next' in allDeps) return 'nextjs';
  if ('nuxt' in allDeps || '@nuxt/kit' in allDeps) return 'nuxt';
  if ('astro' in allDeps) return 'astro';
  if ('@remix-run/node' in allDeps || '@remix-run/react' in allDeps) return 'remix';
  if ('vite' in allDeps && !('next' in allDeps)) return 'vite';
  if ('react-native' in allDeps) return 'react-native';
  if ('electron' in allDeps) return 'electron';
  if ('fastify' in allDeps) return 'fastify';
  if ('express' in allDeps) return 'express';

  return 'unknown';
}

function detectPackageManager(dir: string): ProjectContext['packageManager'] {
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return 'bun';
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function detectTypescript(packageJson?: PackageJson | null, dir?: string): boolean {
  if (!packageJson) return false;

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if ('typescript' in allDeps) return true;
  if (dir && existsSync(join(dir, 'tsconfig.json'))) return true;

  return false;
}

function detectEsm(packageJson?: PackageJson | null): boolean {
  return packageJson?.type === 'module';
}

async function readPackageJson(dir: string): Promise<PackageJson | null> {
  try {
    const content = await readFile(join(dir, 'package.json'), 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}
