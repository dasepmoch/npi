import type { NpmPackageMetadata, GithubMetadata, HealthScore } from '@npi/core';

export function calculateHealthScore(
  npm: NpmPackageMetadata,
  github?: GithubMetadata
): HealthScore {
  const releaseFrequency = scoreReleaseFrequency(npm);
  const issueRatio = github ? scoreIssueRatio(github) : 50;
  const contributorCount = github ? scoreContributors(github.contributors) : 50;
  const commitVelocity = github ? scoreCommitVelocity(github.commitFrequency) : 50;
  const maintenanceActivity = scoreMaintenanceActivity(npm);
  const busFactor = github ? scoreBusFactor(github.contributors) : 30;

  const overall = Math.round(
    releaseFrequency * 0.2 +
    issueRatio * 0.15 +
    contributorCount * 0.15 +
    commitVelocity * 0.2 +
    maintenanceActivity * 0.2 +
    busFactor * 0.1
  );

  return {
    overall,
    releaseFrequency,
    issueRatio,
    contributorCount,
    commitVelocity,
    maintenanceActivity,
    busFactor,
  };
}

function scoreReleaseFrequency(npm: NpmPackageMetadata): number {
  const daysSinceLastPublish = daysBetween(toDate(npm.lastPublish), new Date());

  if (daysSinceLastPublish < 30) return 100;
  if (daysSinceLastPublish < 90) return 85;
  if (daysSinceLastPublish < 180) return 70;
  if (daysSinceLastPublish < 365) return 50;
  if (daysSinceLastPublish < 730) return 30;
  return 10;
}

function scoreIssueRatio(github: GithubMetadata): number {
  const total = github.openIssues + github.closedIssues;
  if (total === 0) return 70;

  const ratio = github.closedIssues / total;
  return Math.round(ratio * 100);
}

function scoreContributors(count: number): number {
  if (count >= 100) return 100;
  if (count >= 50) return 90;
  if (count >= 20) return 80;
  if (count >= 10) return 70;
  if (count >= 5) return 55;
  if (count >= 2) return 40;
  return 20;
}

function scoreCommitVelocity(weeklyCommits: number): number {
  if (weeklyCommits >= 20) return 100;
  if (weeklyCommits >= 10) return 90;
  if (weeklyCommits >= 5) return 75;
  if (weeklyCommits >= 2) return 60;
  if (weeklyCommits >= 1) return 45;
  return 20;
}

function scoreMaintenanceActivity(npm: NpmPackageMetadata): number {
  const daysSincePublish = daysBetween(toDate(npm.lastPublish), new Date());
  const versionCount = npm.versions.length;

  let score = 50;

  if (daysSincePublish < 90) score += 30;
  else if (daysSincePublish < 180) score += 20;
  else if (daysSincePublish < 365) score += 10;
  else score -= 20;

  if (versionCount > 50) score += 20;
  else if (versionCount > 20) score += 15;
  else if (versionCount > 10) score += 10;

  return Math.min(100, Math.max(0, score));
}

function scoreBusFactor(contributors: number): number {
  if (contributors >= 10) return 100;
  if (contributors >= 5) return 80;
  if (contributors >= 3) return 60;
  if (contributors >= 2) return 40;
  return 15;
}

/**
 * Safely convert a value to Date (handles string from JSON deserialization).
 */
function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}
