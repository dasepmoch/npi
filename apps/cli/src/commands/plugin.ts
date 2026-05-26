import pc from 'picocolors';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { z } from 'zod';

const PluginRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(['info', 'suggestion', 'warning', 'critical']),
  match: z.union([z.string(), z.array(z.string())]),
  message: z.string().min(1),
  alternatives: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
  reasons: z.array(z.string()).optional(),
});

const PluginSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  rules: z.array(PluginRuleSchema),
});

export async function pluginCommand(action?: string): Promise<void> {
  switch (action) {
    case 'list':
      await pluginList();
      break;
    case 'validate':
      await pluginValidate();
      break;
    default:
      console.log('');
      console.log(`  Usage:`);
      console.log(`    npi plugin list       List all loaded plugins`);
      console.log(`    npi plugin validate   Validate all plugin files`);
      console.log('');
      break;
  }
}

async function pluginList(): Promise<void> {
  const plugins = await findPlugins();

  if (plugins.length === 0) {
    console.log(`\n  ${pc.dim('No plugins found.')}`);
    console.log(`  ${pc.dim(`Place JSON files in ~/.npi/plugins/ or .npi/plugins/`)}\n`);
    return;
  }

  console.log(`\n  ${pc.bold('Plugins')} (${plugins.length})\n`);
  for (const p of plugins) {
    const icon = p.valid ? pc.green('ok') : pc.red('x');
    console.log(`  ${icon}  ${pc.bold(p.name)} v${p.version} (${p.ruleCount} rules) - ${pc.dim(p.path)}`);
    if (!p.valid && p.error) {
      console.log(`      ${pc.red(p.error)}`);
    }
  }
  console.log('');
}

async function pluginValidate(): Promise<void> {
  const plugins = await findPlugins();

  if (plugins.length === 0) {
    console.log(`\n  ${pc.dim('No plugin files found.')}\n`);
    return;
  }

  let valid = 0;
  let invalid = 0;

  console.log('');
  for (const p of plugins) {
    if (p.valid) {
      console.log(`  ${pc.green('ok')}  ${p.path} - ${p.ruleCount} rules`);
      valid++;
    } else {
      console.log(`  ${pc.red('x')}  ${p.path}`);
      console.log(`      ${pc.red(p.error ?? 'Unknown error')}`);
      invalid++;
    }
  }
  console.log('');
  console.log(`  ${pc.bold('Result:')} ${valid} valid, ${invalid} invalid\n`);

  if (invalid > 0) process.exit(1);
}

interface PluginInfo {
  path: string;
  name: string;
  version: string;
  ruleCount: number;
  valid: boolean;
  error?: string;
}

async function findPlugins(): Promise<PluginInfo[]> {
  const results: PluginInfo[] = [];
  const dirs = [
    join(homedir(), '.npi', 'plugins'),
    join(process.cwd(), '.npi', 'plugins'),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;

    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = join(dir, file);

      try {
        const content = await readFile(filePath, 'utf-8');
        const json = JSON.parse(content);
        const parsed = PluginSchema.safeParse(json);

        if (parsed.success) {
          results.push({
            path: filePath,
            name: parsed.data.name,
            version: parsed.data.version,
            ruleCount: parsed.data.rules.length,
            valid: true,
          });
        } else {
          const firstError = parsed.error.issues[0];
          results.push({
            path: filePath,
            name: json.name ?? file,
            version: json.version ?? '?',
            ruleCount: 0,
            valid: false,
            error: `${firstError.path.join('.')}: ${firstError.message}`,
          });
        }
      } catch (err) {
        results.push({
          path: filePath,
          name: file,
          version: '?',
          ruleCount: 0,
          valid: false,
          error: err instanceof Error ? err.message : 'Failed to read file',
        });
      }
    }
  }

  return results;
}
