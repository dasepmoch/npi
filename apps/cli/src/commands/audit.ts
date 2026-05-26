import pc from 'picocolors';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PackageAnalyzer } from '@npi/analyzer';
import { formatSize, loadConfig } from '@npi/core';
import type { PackageAnalysis, Severity } from '@npi/core';
import { withSpinner } from '../ui/spinner.js';

export interface AuditOptions {
  severity?: string;
  json?: boolean;
  path?: string;
  output?: string;
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

  const deps = Object.entries(pkgJson.dependencies ?? {}) as [string, string][];
  const devDeps = Object.entries(pkgJson.devDependencies ?? {}) as [string, string][];
  const allEntries = [...deps, ...devDeps];
  const allDeps = allEntries.map(([name]) => name);

  if (allDeps.length === 0) {
    console.log(`\n  ${pc.dim('No dependencies found in package.json.')}\n`);
    return;
  }

  console.log(`\n  ${pc.bold('Auditing')} ${allDeps.length} dependencies...\n`);

  const config = await loadConfig();
  const analyzer = new PackageAnalyzer();
  const minSeverity = parseSeverity(options.severity);

  const results = await withSpinner(
    `Analyzing ${allDeps.length} packages...`,
    () => analyzer.analyzeMultipleWithVersions(
      allEntries.map(([name, range]) => ({ name, version: cleanVersionRange(range) })),
      {
        ignore: config.ignore,
        ruleOverrides: config.rules as Record<string, string>,
      }
    )
  );

  // Check for partial failures
  const errors = (results as unknown as { _errors?: Array<{ package: string; error: string }> })._errors ?? [];
  if (errors.length > 0 && !options.json) {
    console.log(`  ${pc.yellow('!')} ${errors.length} package(s) failed to analyze:`);
    for (const err of errors) {
      console.log(`     ${pc.dim('-')} ${err.package}: ${err.error}`);
    }
    console.log('');
  }

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
    console.log(JSON.stringify({ schemaVersion: '1.0', total: allDeps.length, issues, errors, results }, null, 2));
    return;
  }

  // Export report if --output specified
  if (options.output) {
    await exportReport(options.output, results, issues, errors);
    console.log(`\n  Report exported to ${options.output}\n`);
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


function cleanVersionRange(range: string): string | undefined {
  if (!range || range === '*' || range === 'latest') return undefined;
  // Skip non-registry specs
  if (range.startsWith('workspace:') || range.startsWith('file:') || range.startsWith('link:') || range.startsWith('git') || range.startsWith('github:')) {
    return undefined;
  }
  // Pass through to semver resolver as-is
  return range;
}


async function exportReport(
  outputPath: string,
  results: PackageAnalysis[],
  issues: Array<{ pkg: string; severity: Severity; message: string }>,
  errors: Array<{ package: string; error: string }>
): Promise<void> {
  if (outputPath.endsWith('.md')) {
    const lines = [
      '# NPI Audit Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Packages scanned: ${results.length}`,
      `Issues found: ${issues.length}`,
      '',
    ];

    if (issues.length > 0) {
      lines.push('## Issues', '');
      for (const issue of issues) {
        lines.push(`- **[${issue.severity.toUpperCase()}]** ${issue.pkg}: ${issue.message}`);
      }
      lines.push('');
    }

    if (errors.length > 0) {
      lines.push('## Errors', '');
      for (const err of errors) {
        lines.push(`- ${err.package}: ${err.error}`);
      }
      lines.push('');
    }

    lines.push('## Package Scores', '');
    lines.push('| Package | Health | Bundle | Decision |');
    lines.push('|---------|--------|--------|----------|');
    for (const r of results) {
      lines.push(`| ${r.package.name} | ${r.health.overall}/100 | ${r.bundle.level} | ${r.decision ?? 'N/A'} |`);
    }

    await writeFile(outputPath, lines.join('\n'));
  } else {
    // Default to JSON for .json or any other extension
    await writeFile(outputPath, JSON.stringify({ schemaVersion: '1.0', results, issues, errors }, null, 2));
  }
}
