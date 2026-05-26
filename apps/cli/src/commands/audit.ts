import pc from 'picocolors';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PackageAnalyzer } from '@npi/analyzer';
import { formatSize } from '@npi/core';
import type { PackageAnalysis, Severity } from '@npi/core';
import { withSpinner } from '../ui/spinner.js';

export interface AuditOptions {
  severity?: string;
  json?: boolean;
  path?: string;
}

export async function auditCommand(options: AuditOptions): Promise<void> {
  const cwd = options.path ?? process.cwd();
  const pkgJsonPath = join(cwd, 'package.json');

  let pkgJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  try {
    const content = await readFile(pkgJsonPath, 'utf-8');
    pkgJson = JSON.parse(content);
  } catch {
    console.error(`\n  ${pc.red('✗')} No package.json found in ${cwd}\n`);
    process.exit(1);
  }

  const deps = Object.keys(pkgJson.dependencies ?? {});
  const devDeps = Object.keys(pkgJson.devDependencies ?? {});
  const allDeps = [...deps, ...devDeps];

  if (allDeps.length === 0) {
    console.log(`\n  ${pc.dim('No dependencies found in package.json.')}\n`);
    return;
  }

  console.log(`\n  ${pc.bold('Auditing')} ${allDeps.length} dependencies...\n`);

  const analyzer = new PackageAnalyzer();
  const minSeverity = parseSeverity(options.severity);

  const results = await withSpinner(
    `Analyzing ${allDeps.length} packages...`,
    () => analyzer.analyzeMultiple(allDeps)
  );

  // Collect all issues
  const issues: Array<{ pkg: string; severity: Severity; message: string }> = [];

  for (const analysis of results) {
    for (const rec of analysis.recommendations) {
      if (severityLevel(rec.severity) <= severityLevel(minSeverity)) {
        issues.push({
          pkg: analysis.package.name,
          severity: rec.severity,
          message: rec.message,
        });
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ total: allDeps.length, issues, results }, null, 2));
    return;
  }

  // Summary
  printAuditSummary(results, issues, minSeverity);
}

function printAuditSummary(
  results: PackageAnalysis[],
  issues: Array<{ pkg: string; severity: Severity; message: string }>,
  minSeverity: Severity
): void {
  const critical = issues.filter((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const suggestions = issues.filter((i) => i.severity === 'suggestion');
  const infos = issues.filter((i) => i.severity === 'info');

  console.log('');
  console.log(`  ${pc.bold('Audit Results')}`);
  console.log('');
  console.log(`  Packages scanned:  ${results.length}`);
  console.log(`  Issues found:      ${issues.length}`);
  console.log('');

  if (critical.length > 0) {
    console.log(`  ${pc.red(`🚨 Critical: ${critical.length}`)}`);
    for (const issue of critical) {
      console.log(`     ${pc.red('•')} ${pc.bold(issue.pkg)} - ${issue.message}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`  ${pc.yellow(`⚠️  Warnings: ${warnings.length}`)}`);
    for (const issue of warnings) {
      console.log(`     ${pc.yellow('•')} ${pc.bold(issue.pkg)} - ${issue.message}`);
    }
    console.log('');
  }

  if (suggestions.length > 0) {
    console.log(`  ${pc.blue(`💡 Suggestions: ${suggestions.length}`)}`);
    for (const issue of suggestions.slice(0, 10)) {
      console.log(`     ${pc.blue('•')} ${pc.bold(issue.pkg)} - ${issue.message}`);
    }
    if (suggestions.length > 10) {
      console.log(`     ${pc.dim(`... and ${suggestions.length - 10} more`)}`);
    }
    console.log('');
  }

  if (infos.length > 0 && severityLevel(minSeverity) >= severityLevel('info')) {
    console.log(`  ${pc.dim(`ℹ️  Info: ${infos.length}`)}`);
    for (const issue of infos.slice(0, 5)) {
      console.log(`     ${pc.dim('•')} ${pc.bold(issue.pkg)} - ${issue.message}`);
    }
    if (infos.length > 5) {
      console.log(`     ${pc.dim(`... and ${infos.length - 5} more`)}`);
    }
    console.log('');
  }

  // Health overview
  const avgHealth = Math.round(
    results.reduce((sum, r) => sum + r.health.overall, 0) / results.length
  );
  const totalSize = results.reduce((sum, r) => sum + (r.package.unpackedSize ?? 0), 0);

  console.log(`  ${pc.dim('─'.repeat(40))}`);
  console.log('');
  console.log(`  Average Health:    ${formatHealthColor(avgHealth)}`);
  if (totalSize > 0) {
    console.log(`  Total Size:        ${formatSize(totalSize)}`);
  }
  console.log('');

  if (issues.length === 0) {
    console.log(`  ${pc.green('✓')} All dependencies look healthy.\n`);
  }
}

function formatHealthColor(score: number): string {
  const str = `${score}/100`;
  if (score >= 80) return pc.green(str);
  if (score >= 60) return pc.yellow(str);
  return pc.red(str);
}

function parseSeverity(input?: string): Severity {
  switch (input?.toLowerCase()) {
    case 'critical': return 'critical';
    case 'warning': return 'warning';
    case 'suggestion': return 'suggestion';
    default: return 'info';
  }
}

function severityLevel(severity: Severity): number {
  switch (severity) {
    case 'critical': return 0;
    case 'warning': return 1;
    case 'suggestion': return 2;
    case 'info': return 3;
  }
}
