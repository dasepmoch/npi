import pc from 'picocolors';
import { PackageAnalyzer } from '@npi/analyzer';
import { formatAnalysis } from '@npi/formatter';
import { detectProjectContext } from '@npi/framework-detector';
import { PackageNotFoundError, NetworkError } from '@npi/core';
import { withSpinner } from '../ui/spinner.js';

export async function analyzeCommand(
  packageName: string,
  options: Record<string, unknown>
): Promise<void> {
  try {
    const analyzer = new PackageAnalyzer();
    const project = await detectProjectContext().catch(() => undefined);

    const analysis = await withSpinner(
      `Analyzing ${pc.bold(packageName)}...`,
      () => analyzer.analyze(packageName, {
        cache: options['cache'] !== false,
        project,
      })
    );

    if (options['json']) {
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    console.log(formatAnalysis(analysis));
  } catch (error) {
    handleError(error, packageName);
  }
}

function handleError(error: unknown, packageName: string): never {
  if (error instanceof PackageNotFoundError) {
    console.error(`\n  ${pc.red('✗')} Package "${pc.bold(packageName)}" not found on npm.\n`);
    console.error(`  ${pc.dim('Check the spelling or verify the package exists:')}`);
    console.error(`  ${pc.dim(`https://www.npmjs.com/package/${packageName}`)}\n`);
  } else if (error instanceof NetworkError) {
    console.error(`\n  ${pc.red('✗')} Network error while fetching package data.\n`);
    console.error(`  ${pc.dim('Check your internet connection and try again.')}\n`);
  } else if (error instanceof Error) {
    console.error(`\n  ${pc.red('✗')} ${error.message}\n`);
  } else {
    console.error(`\n  ${pc.red('✗')} An unexpected error occurred.\n`);
  }
  process.exit(1);
}
