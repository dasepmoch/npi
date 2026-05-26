import { NetworkError } from '@npi/core';

const GITHUB_API = 'https://api.github.com';
const DEFAULT_TIMEOUT_MS = 10000;

export class GithubClient {
  private token?: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: { token?: string; timeout?: number; maxRetries?: number }) {
    this.token = options?.token ?? process.env['GITHUB_TOKEN'];
    this.timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'npi-cli',
    };
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`;
    }
    return h;
  }

  async getRepo(owner: string, repo: string): Promise<GithubRepoResponse> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}`;
    const response = await this.fetchWithTimeout(url, { headers: this.headers });

    if (!response.ok) {
      throw new NetworkError(url, response.status);
    }

    return response.json() as Promise<GithubRepoResponse>;
  }

  async getCommitActivity(owner: string, repo: string): Promise<GithubCommitActivity[]> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/stats/commit_activity`;
    const response = await this.fetchWithTimeout(url, { headers: this.headers });

    // GitHub returns 202 when stats are being computed - treat as empty
    if (!response.ok || response.status === 202) {
      return [];
    }

    const data = await response.json();
    // GitHub sometimes returns {} instead of array when computing
    if (!Array.isArray(data)) return [];

    return data as GithubCommitActivity[];
  }

  async getContributors(owner: string, repo: string): Promise<number> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=1&anon=true`;
    const response = await this.fetchWithTimeout(url, { headers: this.headers });

    if (!response.ok) return 0;

    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
      const match = linkHeader.match(/page=(\d+)>; rel="last"/);
      if (match) return parseInt(match[1], 10);
    }

    const data = await response.json() as unknown[];
    return Array.isArray(data) ? data.length : 0;
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
            await delay(Math.pow(2, attempt) * 500); // exponential backoff
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

export interface GithubRepoResponse {
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id: string } | null;
  archived: boolean;
  pushed_at: string;
  topics: string[];
  default_branch: string;
}

export interface GithubCommitActivity {
  total: number;
  week: number;
  days: number[];
}
