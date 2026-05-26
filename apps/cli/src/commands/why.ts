import pc from 'picocolors';
import { PackageAnalyzer } from '@npi/analyzer';
import { ExplanationEngine } from '@npi/explanation-engine';
import { formatExplanation } from '@npi/formatter';
import { PackageNotFoundError, NetworkError } from '@npi/core';
import { withSpinner } from '../ui/spinner.js';

export async function whyCommand(packageName: string, options?: { version?: string }): Promise<void> {
  try {
    const analyzer = new PackageAnalyzer();
    const explanationEngine = new ExplanationEngine();

    const analysis = await withSpinner(
      `Researching ${pc.bold(packageName)}${options?.version ? `@${options.version}` : ''}...`,
      () => analyzer.analyze(packageName, { version: options?.version })
    );

    const explanation = explanationEngine.explain(analysis);

    console.log(formatExplanation(explanation));
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      console.error(`\n  ${pc.red('✗')} Package "${pc.bold(packageName)}" not found on npm.\n`);
    } else if (error instanceof NetworkError) {
      console.error(`\n  ${pc.red('✗')} Network error. Check your connection and try again.\n`);
    } else if (error instanceof Error) {
      console.error(`\n  ${pc.red('✗')} ${error.message}\n`);
    } else {
      console.error(`\n  ${pc.red('✗')} An unexpected error occurred.\n`);
    }
    process.exit(1);
  }
}
