import { cac } from 'cac';
import { analyzeCommand } from './commands/analyze.js';
import { installCommand } from './commands/install.js';
import { compareCommand } from './commands/compare.js';
import { whyCommand } from './commands/why.js';
import { auditCommand } from './commands/audit.js';
import { checkCommand } from './commands/check.js';
import { configCommand } from './commands/config.js';
import { cacheCommand } from './commands/cache.js';
import { showBanner } from './ui/banner.js';
import { parsePackageSpec } from './utils/package-spec.js';

export function createApp() {
  const cli = cac('npi');

  cli
    .command('[package]', 'Analyze a package')
    .option('--no-cache', 'Disable cache')
    .option('--json', 'Output as JSON')
    .action(async (packageName: string | undefined, options: Record<string, unknown>) => {
      if (!packageName) {
        showBanner();
        cli.outputHelp();
        return;
      }
      const spec = parsePackageSpec(packageName);
      await analyzeCommand(spec.name, { ...options, version: spec.version });
    });

  cli
    .command('install <package>', 'Smart install with analysis')
    .alias('i')
    .option('--no-cache', 'Disable cache')
    .option('--yes', 'Skip confirmation')
    .option('--dev', 'Install as devDependency')
    .action(async (packageName: string, options: Record<string, unknown>) => {
      const spec = parsePackageSpec(packageName);
      await installCommand(spec.name, { ...options, version: spec.version });
    });

  cli
    .command('compare <...packages>', 'Compare packages')
    .action(async (packages: string[]) => {
      await compareCommand(packages);
    });

  cli
    .command('why <package>', 'Explain a package')
    .action(async (packageName: string) => {
      await whyCommand(packageName);
    });

  cli
    .command('audit', 'Audit all dependencies in package.json')
    .option('--severity <level>', 'Minimum severity to report (critical|warning|suggestion|info)', { default: 'info' })
    .option('--json', 'Output as JSON')
    .option('--path <dir>', 'Path to project directory')
    .action(async (options: Record<string, unknown>) => {
      await auditCommand({
        severity: options['severity'] as string | undefined,
        json: options['json'] as boolean | undefined,
        path: options['path'] as string | undefined,
      });
    });

  cli
    .command('check', 'CI-friendly dependency check (exits non-zero on issues)')
    .option('--severity <level>', 'Fail threshold (critical|warning|suggestion|info)', { default: 'warning' })
    .option('--json', 'Output as JSON')
    .option('--path <dir>', 'Path to project directory')
    .action(async (options: Record<string, unknown>) => {
      await checkCommand({
        severity: options['severity'] as string | undefined,
        json: options['json'] as boolean | undefined,
        path: options['path'] as string | undefined,
      });
    });

  cli
    .command('config [action] [key] [value]', 'Manage configuration')
    .action(async (action: string | undefined, key: string | undefined, value: string | undefined) => {
      await configCommand(action, key, value);
    });

  cli
    .command('cache [action]', 'Manage cache')
    .action(async (action: string | undefined) => {
      await cacheCommand(action);
    });

  cli.help();
  cli.version('1.1.0');

  return cli;
}
