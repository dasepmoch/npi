import type { GithubMetadata } from '@npi/core';
import { GithubClient } from './client.js';

export async function fetchGithubMetadata(
  repoUrl: string,
  client?: GithubClient
): Promise<GithubMetadata | undefined> {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) return undefined;

  const ghClient = client ?? new GithubClient();

  try {
    const [repo, activity, contributors] = await Promise.all([
      ghClient.getRepo(parsed.owner, parsed.repo),
      ghClient.getCommitActivity(parsed.owner, parsed.repo),
      ghClient.getContributors(parsed.owner, parsed.repo),
    ]);

    const recentWeeks = activity.slice(-12);
    const commitFrequency = recentWeeks.length > 0
      ? recentWeeks.reduce((sum, w) => sum + w.total, 0) / recentWeeks.length
      : 0;

    // Estimate closed issues from total (open_issues_count is only open)
    // GitHub doesn't provide closed count in repo endpoint, so we estimate
    const estimatedClosedIssues = Math.max(0, Math.round(repo.open_issues_count * 2.5));

    return {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      closedIssues: estimatedClosedIssues,
      lastCommit: new Date(repo.pushed_at),
      contributors,
      license: repo.license?.spdx_id ?? 'Unknown',
      archived: repo.archived,
      topics: repo.topics ?? [],
      commitFrequency: Math.round(commitFrequency),
    };
  } catch {
    return undefined;
  }
}

function parseGithubUrl(url: string): { owner: string; repo: string } | undefined {
  if (!url) return undefined;

  // Handle various GitHub URL formats:
  // - https://github.com/owner/repo
  // - https://github.com/owner/repo.git
  // - git+https://github.com/owner/repo.git
  // - git://github.com/owner/repo.git
  // - github:owner/repo
  // - git+ssh://git@github.com/owner/repo.git
  const patterns = [
    /github\.com[/:]([^/]+)\/([^/.#?]+)/,
    /^github:([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      };
    }
  }

  return undefined;
}
