import pc from 'picocolors';
import { PackageAnalyzer } from '@npi/analyzer';
import { formatComparison } from '@npi/formatter';
import { NetworkError } from '@npi/core';
import type { PackageComparison } from '@npi/core';
import { withSpinner } from '../ui/spinner.js';

export async function compareCommand(packages: string[]): Promise<void> {
  if (packages.length < 2) {
    console.error(`\n  ${pc.red('✗')} Please provide at least 2 packages to compare.\n`);
    console.error(`  ${pc.dim('Usage: npi compare <package1> <package2> [package3...]')}\n`);
    process.exit(1);
  }

  if (packages.length > 6) {
    console.error(`\n  ${pc.red('✗')} Maximum 6 packages can be compared at once.\n`);
    process.exit(1);
  }

  try {
    const analyzer = new PackageAnalyzer();

    const analyses = await withSpinner(
      `Comparing ${packages.map((p) => pc.bold(p)).join(', ')}...`,
      () => analyzer.analyzeMultiple(packages)
    );

    // Determine winner based on composite score
    const sorted = [...analyses].sort((a, b) => {
      const scoreA = computeCompositeScore(a);
      const scoreB = computeCompositeScore(b);
      return scoreB - scoreA;
    });

    const winner = sorted[0]?.package.name;

    const comparison: PackageComparison = {
      packages: analyses,
      winner,
      summary: 'Based on health, DX, and bundle impact analysis.',
    };

    console.log(formatComparison(comparison));
  } catch (error) {
    if (error instanceof NetworkError) {
      console.error(`\n  ${pc.red('✗')} Network error. Check your connection and try again.\n`);
    } else if (error instanceof Error) {
      console.error(`\n  ${pc.red('✗')} ${error.message}\n`);
    } else {
      console.error(`\n  ${pc.red('✗')} An unexpected error occurred.\n`);
    }
    process.exit(1);
  }
}

function computeCompositeScore(analysis: { health: { overall: number }; dx: { overall: number }; bundle: { level: string } }): number {
  const bundleBonus = analysis.bundle.level === 'minimal' ? 20
    : analysis.bundle.level === 'low' ? 10
    : analysis.bundle.level === 'moderate' ? 0
    : -10;

  return analysis.health.overall + analysis.dx.overall + bundleBonus;
}
