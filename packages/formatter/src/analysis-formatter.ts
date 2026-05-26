import pc from 'picocolors';
import type { PackageAnalysis } from '@npi/core';
import { formatSize } from '@npi/core';
import { box, label, divider } from './primitives.js';

export function formatAnalysis(analysis: PackageAnalysis): string {
  const lines: string[] = [];

  // Header box
  lines.push(box(
    `${pc.bold(analysis.package.name)}\n${pc.dim(analysis.package.description || 'No description')}`,
    { title: '📦 Package' }
  ));

  lines.push('');

  // Scores section
  lines.push(pc.bold('  Scores'));
  lines.push('');
  lines.push(`  ${label('Health Score', formatHealthScore(analysis.health.overall))}`);
  lines.push(`  ${label('Bundle Impact', formatBundleLevel(analysis.bundle.level))}`);
  lines.push(`  ${label('Dependencies', String(Object.keys(analysis.package.dependencies).length))}`);
  lines.push(`  ${label('TypeScript', formatTypescript(analysis.dx.typescript))}`);
  lines.push(`  ${label('Tree Shaking', formatTreeShaking(analysis.bundle.treeShaking))}`);
  lines.push(`  ${label('ESM', analysis.dx.esm ? pc.green('Yes') : pc.yellow('No'))}`);

  if (analysis.package.unpackedSize) {
    lines.push(`  ${label('Install Size', formatSize(analysis.package.unpackedSize))}`);
  }

  lines.push(`  ${label('Weekly Downloads', formatDownloads(analysis.package.weeklyDownloads))}`);
  lines.push(`  ${label('Ecosystem', formatEcosystem(analysis.ecosystem.status))}`);

  // Recommendations
  if (analysis.recommendations.length > 0) {
    lines.push('');
    lines.push(`  ${divider(50)}`);
    lines.push('');

    for (const rec of analysis.recommendations) {
      const icon = rec.severity === 'critical' ? '🚨'
        : rec.severity === 'warning' ? '⚠️'
        : rec.severity === 'suggestion' ? '💡'
        : 'ℹ️';

      lines.push(`  ${icon} ${pc.bold(severityLabel(rec.severity))}`);
      lines.push('');
      lines.push(`  ${rec.message}`);

      if (rec.alternatives.length > 0) {
        lines.push('');
        lines.push(`  ${pc.dim('Suggested:')}`);
        for (const alt of rec.alternatives.slice(0, 4)) {
          lines.push(`  ${pc.green('•')} ${pc.bold(alt.name)} ${pc.dim(`— ${alt.description}`)}`);
        }
      }

      if (rec.reasons.length > 0) {
        lines.push('');
        lines.push(`  ${pc.dim('Reasons:')}`);
        for (const reason of rec.reasons.slice(0, 4)) {
          lines.push(`  ${pc.dim('·')} ${pc.dim(reason)}`);
        }
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

function formatHealthScore(score: number): string {
  if (score >= 80) return pc.green(`${score}/100`);
  if (score >= 60) return pc.yellow(`${score}/100`);
  return pc.red(`${score}/100`);
}

function formatBundleLevel(level: string): string {
  switch (level) {
    case 'minimal': return pc.green('Minimal');
    case 'low': return pc.green('Low');
    case 'moderate': return pc.yellow('Moderate');
    case 'high': return pc.red('High');
    case 'critical': return pc.red('Critical');
    default: return level;
  }
}

function formatTypescript(support: string): string {
  switch (support) {
    case 'native': return pc.green('Native');
    case 'definitelytyped': return pc.blue('@types');
    case 'none': return pc.dim('None');
    default: return support;
  }
}

function formatTreeShaking(support: string): string {
  switch (support) {
    case 'full': return pc.green('Full');
    case 'partial': return pc.yellow('Partial');
    case 'none': return pc.red('None');
    default: return support;
  }
}

function formatEcosystem(status: string): string {
  switch (status) {
    case 'thriving': return pc.green('Thriving');
    case 'stable': return pc.blue('Stable');
    case 'declining': return pc.yellow('Declining');
    case 'legacy': return pc.yellow('Legacy');
    case 'deprecated': return pc.red('Deprecated');
    default: return status;
  }
}

function formatDownloads(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M/week`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K/week`;
  return `${count}/week`;
}

function severityLabel(severity: string): string {
  switch (severity) {
    case 'critical': return pc.red('Critical');
    case 'warning': return pc.yellow('Warning');
    case 'suggestion': return pc.blue('Suggestion');
    case 'info': return pc.dim('Info');
    default: return severity;
  }
}
