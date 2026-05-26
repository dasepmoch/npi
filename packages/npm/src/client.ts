import { NetworkError, PackageNotFoundError } from '@npi/core';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const NPM_API = 'https://api.npmjs.org';
const DEFAULT_TIMEOUT_MS = 15000;

export class NpmClient {
  private baseUrl: string;
  private apiUrl: string;
  private timeoutMs: number;

  constructor(options?: { registry?: string; timeout?: number }) {
    this.baseUrl = options?.registry ?? NPM_REGISTRY;
    this.apiUrl = NPM_API;
    this.timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  }

  async getPackage(name: string): Promise<NpmRegistryResponse> {
    const url = `${this.baseUrl}/${encodeURIComponent(name)}`;
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
    const url = `${this.baseUrl}/${encodeURIComponent(name)}/${version}`;
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
    const url = `${this.apiUrl}/downloads/point/${period}/${encodeURIComponent(name)}`;
    const response = await this.fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      // Downloads API failure is non-critical — return 0
      return { downloads: 0, start: '', end: '', package: name };
    }

    return response.json() as Promise<NpmDownloadsResponse>;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(url);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─── Response Types ──────────────────────────────────────────────────────────

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
