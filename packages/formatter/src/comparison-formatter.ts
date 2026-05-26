import pc from 'picocolors';
import Table from 'cli-table3';
import type { PackageComparison } from '@npi/core';
import { formatSize } from '@npi/core';

export function formatComparison(comparison: PackageComparison): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(pc.bold('  📊 Package Comparison'));
  lines.push('');

  const table = new Table({
    head: ['', ...comparison.packages.map((p) => pc.bold(p.package.name))],
    style: { head: [], border: [] },
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤', middle: '│',
    },
  });

  table.push(
    [pc.dim('Health'), ...comparison.packages.map((p) => colorScore(p.health.overall))],
    [pc.dim('Bundle'), ...comparison.packages.map((p) => formatLevel(p.bundle.level))],
    [pc.dim('Size'), ...comparison.packages.map((p) => p.package.unpackedSize ? formatSize(p.package.unpackedSize) : 'N/A')],
    [pc.dim('Deps'), ...comparison.packages.map((p) => String(Object.keys(p.package.dependencies).length))],
    [pc.dim('TypeScript'), ...comparison.packages.map((p) => formatTs(p.dx.typescript))],
    [pc.dim('ESM'), ...comparison.packages.map((p) => p.dx.esm ? pc.green('✓') : pc.red('✗'))],
    [pc.dim('Tree Shake'), ...comparison.packages.map((p) => formatShake(p.bundle.treeShaking))],
    [pc.dim('Downloads'), ...comparison.packages.map((p) => formatDl(p.package.weeklyDownloads))],
    [pc.dim('Ecosystem'), ...comparison.packages.map((p) => formatEco(p.ecosystem.status))],
  );

  lines.push(table.toString());

  if (comparison.winner) {
    lines.push('');
    lines.push(`  ${pc.green('★')} Recommended: ${pc.bold(pc.green(comparison.winner))}`);
  }

  if (comparison.summary) {
    lines.push(`  ${pc.dim(comparison.summary)}`);
  }

  lines.push('');

  return lines.join('\n');
}

function colorScore(score: number): string {
  const str = `${score}/100`;
  if (score >= 80) return pc.green(str);
  if (score >= 60) return pc.yellow(str);
  return pc.red(str);
}

function formatLevel(level: string): string {
  switch (level) {
    case 'minimal': case 'low': return pc.green(level);
    case 'moderate': return pc.yellow(level);
    default: return pc.red(level);
  }
}

function formatTs(ts: string): string {
  if (ts === 'native') return pc.green('Native');
  if (ts === 'definitelytyped') return pc.blue('@types');
  return pc.dim('None');
}

function formatShake(s: string): string {
  if (s === 'full') return pc.green('Full');
  if (s === 'partial') return pc.yellow('Partial');
  return pc.red('None');
}

function formatDl(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return String(count);
}

function formatEco(status: string): string {
  switch (status) {
    case 'thriving': return pc.green('Thriving');
    case 'stable': return pc.blue('Stable');
    case 'declining': return pc.yellow('Declining');
    case 'legacy': return pc.yellow('Legacy');
    case 'deprecated': return pc.red('Deprecated');
    default: return status;
  }
}
