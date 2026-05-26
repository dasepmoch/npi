import pc from 'picocolors';
import { execa } from 'execa';
import { PackageAnalyzer } from '@npi/analyzer';
import { formatAnalysis } from '@npi/formatter';
import { detectProjectContext } from '@npi/framework-detector';
import { PackageNotFoundError, NetworkError, loadConfig } from '@npi/core';
import { withSpinner } from '../ui/spinner.js';
import { confirm, select } from '../ui/prompt.js';

export async function installCommand(
  packageName: string,
  options: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfig();
    const analyzer = new PackageAnalyzer({ cacheTtl: config.cache.ttl });
    const project = await detectProjectContext().catch(() => undefined);

    // Step 1: Analyze
    const analysis = await withSpinner(
      `Analyzing ${pc.bold(packageName)}...`,
      () => analyzer.analyze(packageName, {
        cache: options['cache'] !== false && config.cache.enabled,
        project,
      })
    );

    // Step 2: Show analysis
    console.log(formatAnalysis(analysis));

    // Step 3: Check for warnings
    const hasWarnings = analysis.recommendations.some(
      (r) => r.severity === 'warning' || r.severity === 'critical'
    );

    const hasAlternatives = analysis.recommendations.some(
      (r) => r.alternatives.length > 0
    );

    // Step 4: Handle alternatives
    if (hasAlternatives && !options['yes']) {
      const allAlternatives = analysis.recommendations
        .flatMap((r) => r.alternatives)
        .slice(0, 4);

      if (allAlternatives.length > 0) {
        const choices = [
          { label: `${pc.bold(packageName)} ${pc.dim('(original)')}`, value: packageName },
          ...allAlternatives.map((alt) => ({
            label: `${pc.bold(alt.name)} ${pc.dim(`- ${alt.description}`)}`,
            value: alt.name,
          })),
        ];

        const selected = await select('Which package would you like to install?', choices);
        if (selected !== packageName) {
          console.log(`\n  ${pc.green('→')} Switching to ${pc.bold(selected)}\n`);
          await doInstall(selected, options, project?.packageManager ?? 'npm');
          return;
        }
      }
    }

    // Step 5: Confirm install
    if (hasWarnings && !options['yes']) {
      const proceed = await confirm(`Install ${pc.bold(packageName)} anyway?`, false);
      if (!proceed) {
        console.log(`\n  ${pc.dim('Installation cancelled.')}\n`);
        return;
      }
    }

    // Step 6: Install
    await doInstall(packageName, options, project?.packageManager ?? 'npm');
  } catch (error) {
    handleError(error, packageName);
  }
}

async function doInstall(
  packageName: string,
  options: Record<string, unknown>,
  packageManager: string
): Promise<void> {
  const isDev = options['dev'] === true;

  const commands: Record<string, { cmd: string; args: string[] }> = {
    npm: { cmd: 'npm', args: ['install', isDev ? '--save-dev' : '--save', packageName] },
    pnpm: { cmd: 'pnpm', args: ['add', ...(isDev ? ['-D'] : []), packageName] },
    yarn: { cmd: 'yarn', args: ['add', ...(isDev ? ['-D'] : []), packageName] },
    bun: { cmd: 'bun', args: ['add', ...(isDev ? ['-d'] : []), packageName] },
  };

  const { cmd, args } = commands[packageManager] ?? commands['npm'];

  console.log(`  ${pc.dim(`${cmd} ${args.join(' ')}`)}`);
  console.log('');

  await withSpinner(`Installing ${pc.bold(packageName)}...`, async () => {
    await execa(cmd, args, { stdio: 'pipe' });
  });

  console.log(`\n  ${pc.green('✓')} Installed ${pc.bold(packageName)}\n`);
}

function handleError(error: unknown, packageName: string): never {
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
