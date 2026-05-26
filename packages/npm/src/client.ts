import { NetworkError, PackageNotFoundError } from '@npi/core';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const NPM_API = 'https://api.npmjs.org';
const DEFAULT_TIMEOUT_MS = 15000;

export class NpmClient {
  private baseUrl: string;
  private apiUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: { registry?: string; timeout?: number; maxRetries?: number }) {
    this.baseUrl = options?.registry ?? NPM_REGISTRY;
    this.apiUrl = NPM_API;
    this.timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  async getPackage(name: string): Promise<NpmRegistryResponse> {
    const url = `${this.baseUrl}/${encodeScopedPackage(name)}`;
    const response = await this.fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      throw new PackageNotFoundError(name);
    }

    if (!response.ok) {
      throw new NetworkError(url, response.status);
    }

    return response.json() as Promise<NpmRegistryResponse>;
  }

  async getPackageVersion(name: string, version: string): Promise<NpmVersionResponse> {
    const url = `${this.baseUrl}/${encodeScopedPackage(name)}/${version}`;
    const response = await this.fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      throw new PackageNotFoundError(name);
    }

    if (!response.ok) {
      throw new NetworkError(url, response.status);
    }

    return response.json() as Promise<NpmVersionResponse>;
  }

  async getDownloads(name: string, period: string = 'last-week'): Promise<NpmDownloadsResponse> {
    const url = `${this.apiUrl}/downloads/point/${period}/${encodeScopedPackage(name)}`;
    const response = await this.fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      // Downloads API failure is non-critical - return 0
      return { downloads: 0, start: '', end: '', package: name };
    }

    return response.json() as Promise<NpmDownloadsResponse>;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        // Retry on 5xx server errors and 429 rate limit
        if (response.status >= 500 || response.status === 429) {
          if (attempt < this.maxRetries) {
            clearTimeout(timeout);
            await delay(Math.pow(2, attempt) * 500);
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (lastError.name === 'AbortError') {
          clearTimeout(timeout);
          if (attempt < this.maxRetries) {
            await delay(Math.pow(2, attempt) * 500);
            continue;
          }
          throw new NetworkError(url);
        }
        if (attempt < this.maxRetries) {
          clearTimeout(timeout);
          await delay(Math.pow(2, attempt) * 500);
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new NetworkError(url);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Response Types ──────────────────────────────────────────────────────────

/**
 * Encode package name for URL, handling scoped packages correctly.
 * Scoped packages like @scope/name → @scope%2Fname (only encode the slash).
 * Non-scoped packages are encoded normally.
 */
function encodeScopedPackage(name: string): string {
  if (name.startsWith('@')) {
    return `@${encodeURIComponent(name.slice(1))}`;
  }
  return encodeURIComponent(name);
}

export interface NpmRegistryResponse {
  name: string;
  description?: string;
  'dist-tags': Record<string, string>;
  versions: Record<string, NpmVersionResponse>;
  time: Record<string, string>;
  maintainers: Array<{ name: string; email?: string }>;
  keywords?: string[];
  license?: string;
  homepage?: string;
  repository?: { type: string; url: string };
}

export interface NpmVersionResponse {
  name: string;
  version: string;
  description?: string;
  main?: string;
  module?: string;
  types?: string;
  typings?: string;
  exports?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  sideEffects?: boolean | string[];
  type?: string;
  dist?: {
    tarball: string;
    shasum: string;
    unpackedSize?: number;
  };
}

export interface NpmDownloadsResponse {
  downloads: number;
  start: string;
  end: string;
  package: string;
}
