import pc from 'picocolors';
import { PackageAnalyzer } from '@npi/analyzer';
import { formatComparison } from '@npi/formatter';
import { NetworkError } from '@npi/core';
import type { PackageComparison, PackageAnalysis } from '@npi/core';
import { withSpinner } from '../ui/spinner.js';
import { parsePackageSpec } from '../utils/package-spec.js';

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
    const specs = packages.map(parsePackageSpec);

    const analyses = await withSpinner(
      `Comparing ${packages.map((p) => pc.bold(p)).join(', ')}...`,
      async () => {
        const results: PackageAnalysis[] = [];
        for (const spec of specs) {
          const result = await analyzer.analyze(spec.name, { version: spec.version });
          results.push(result);
        }
        return results;
      }
    );

    // Determine contextual winners
    const winners = computeContextualWinners(analyses);
    const overallWinner = computeOverallWinner(analyses);

    const comparison: PackageComparison = {
      packages: analyses,
      winner: overallWinner,
      summary: formatWinnerSummary(winners, overallWinner),
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

interface CategoryWinner {
  category: string;
  package: string;
}

function computeContextualWinners(analyses: { package: { name: string }; health: { overall: number }; dx: { overall: number }; bundle: { level: string; treeShaking: string }; ecosystem: { status: string } }[]): CategoryWinner[] {
  const winners: CategoryWinner[] = [];

  // Best health
  const healthSorted = [...analyses].sort((a, b) => b.health.overall - a.health.overall);
  if (healthSorted[0]) {
    winners.push({ category: 'Best maintained', package: healthSorted[0].package.name });
  }

  // Best DX
  const dxSorted = [...analyses].sort((a, b) => b.dx.overall - a.dx.overall);
  if (dxSorted[0]) {
    winners.push({ category: 'Best DX', package: dxSorted[0].package.name });
  }

  // Smallest bundle
  const bundleOrder = { minimal: 0, low: 1, moderate: 2, high: 3, critical: 4 };
  const bundleSorted = [...analyses].sort((a, b) =>
    (bundleOrder[a.bundle.level as keyof typeof bundleOrder] ?? 4) -
    (bundleOrder[b.bundle.level as keyof typeof bundleOrder] ?? 4)
  );
  if (bundleSorted[0]) {
    winners.push({ category: 'Smallest bundle', package: bundleSorted[0].package.name });
  }

  return winners;
}

function computeOverallWinner(analyses: { package: { name: string }; health: { overall: number }; dx: { overall: number }; bundle: { level: string } }[]): string | undefined {
  if (analyses.length === 0) return undefined;

  const sorted = [...analyses].sort((a, b) => {
    const bundleBonus = (level: string) => {
      if (level === 'minimal') return 20;
      if (level === 'low') return 10;
      if (level === 'moderate') return 0;
      return -10;
    };
    const scoreA = a.health.overall + a.dx.overall + bundleBonus(a.bundle.level);
    const scoreB = b.health.overall + b.dx.overall + bundleBonus(b.bundle.level);
    return scoreB - scoreA;
  });

  return sorted[0]?.package.name;
}

function formatWinnerSummary(winners: CategoryWinner[], overall?: string): string {
  const lines = winners.map((w) => `${w.category}: ${w.package}`);
  if (overall) lines.push(`Overall recommendation: ${overall}`);
  return lines.join('. ');
}
