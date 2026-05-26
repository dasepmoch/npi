import pc from 'picocolors';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PackageAnalyzer } from '@npi/analyzer';
import type { Severity } from '@npi/core';

export interface CheckOptions {
  severity?: string;
  path?: string;
  json?: boolean;
}

/**
 * CI-friendly check command.
 * Exits with non-zero code if issues are found at or above the specified severity.
 * Designed for CI pipelines and pre-commit hooks.
 */
export async function checkCommand(options: CheckOptions): Promise<void> {
  const cwd = options.path ?? process.cwd();
  const pkgJsonPath = join(cwd, 'package.json');
  const failSeverity = parseSeverity(options.severity ?? 'warning');

  let pkgJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  try {
    const content = await readFile(pkgJsonPath, 'utf-8');
    pkgJson = JSON.parse(content);
  } catch {
    if (options.json) {
      console.log(JSON.stringify({ error: 'No package.json found', exitCode: 1 }));
    } else {
      console.error(`${pc.red('✗')} No package.json found in ${cwd}`);
    }
    process.exit(1);
  }

  const deps = Object.keys(pkgJson.dependencies ?? {});
  const devDeps = Object.keys(pkgJson.devDependencies ?? {});
  const allDeps = [...deps, ...devDeps];

  if (allDeps.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ packages: 0, issues: [], passed: true }));
    } else {
      console.log(`${pc.green('✓')} No dependencies to check.`);
    }
    return;
  }

  const analyzer = new PackageAnalyzer();

  let results;
  try {
    results = await analyzer.analyzeMultiple(allDeps);
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed', exitCode: 1 }));
    } else {
      console.error(`${pc.red('✗')} Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    process.exit(1);
  }

  // Collect issues at or above fail severity
  const issues: Array<{ package: string; severity: Severity; message: string }> = [];

  for (const analysis of results) {
    for (const rec of analysis.recommendations) {
      if (severityLevel(rec.severity) <= severityLevel(failSeverity)) {
        issues.push({
          package: analysis.package.name,
          severity: rec.severity,
          message: rec.message,
        });
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify({
      packages: allDeps.length,
      issues,
      passed: issues.length === 0,
      failSeverity,
    }, null, 2));
  } else {
    if (issues.length === 0) {
      console.log(`${pc.green('✓')} All ${allDeps.length} dependencies passed (threshold: ${failSeverity})`);
    } else {
      console.log(`${pc.red('✗')} ${issues.length} issue(s) found in ${allDeps.length} dependencies:\n`);
      for (const issue of issues) {
        const icon = issue.severity === 'critical' ? pc.red('✗') : pc.yellow('!');
        console.log(`  ${icon} ${pc.bold(issue.package)}: ${issue.message}`);
      }
      console.log('');
    }
  }

  // Exit non-zero if issues found
  if (issues.length > 0) {
    process.exit(1);
  }
}

function parseSeverity(input: string): Severity {
  switch (input.toLowerCase()) {
    case 'critical': return 'critical';
    case 'warning': return 'warning';
    case 'suggestion': return 'suggestion';
    case 'info': return 'info';
    default: return 'warning';
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
