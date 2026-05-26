import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import type { Rule } from './engine.js';
import type { Severity } from '@npi/core';

/**
 * Plugin definition for custom rules.
 * Users can create plugins in ~/.npi/plugins/ or .npi/plugins/ in their project.
 */
export interface NpiPlugin {
  name: string;
  version: string;
  rules: PluginRuleDefinition[];
}

export interface PluginRuleDefinition {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  /** Package name to match (exact or glob pattern) */
  match: string | string[];
  message: string;
  alternatives?: Array<{ name: string; description: string }>;
  reasons?: string[];
}

/**
 * Load plugins from ~/.npi/plugins/ and local .npi/plugins/
 */
export async function loadPlugins(cwd?: string): Promise<Rule[]> {
  const rules: Rule[] = [];
  const dir = cwd ?? process.cwd();

  // Global plugins
  const globalPluginDir = join(homedir(), '.npi', 'plugins');
  const globalRules = await loadPluginsFromDir(globalPluginDir);
  rules.push(...globalRules);

  // Local plugins (override global)
  const localPluginDir = join(dir, '.npi', 'plugins');
  const localRules = await loadPluginsFromDir(localPluginDir);
  rules.push(...localRules);

  return rules;
}

async function loadPluginsFromDir(dir: string): Promise<Rule[]> {
  if (!existsSync(dir)) return [];

  const rules: Rule[] = [];

  try {
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await readFile(join(dir, file), 'utf-8');
        const plugin = JSON.parse(content) as NpiPlugin;

        if (plugin.rules && Array.isArray(plugin.rules)) {
          for (const ruleDef of plugin.rules) {
            rules.push(pluginRuleToRule(ruleDef));
          }
        }
      } catch {
        // Skip invalid plugin files
      }
    }
  } catch {
    // Directory read failed
  }

  return rules;
}

function pluginRuleToRule(def: PluginRuleDefinition): Rule {
  const matchers = Array.isArray(def.match) ? def.match : [def.match];

  return {
    id: `plugin:${def.id}`,
    name: def.name,
    description: def.description,
    severity: def.severity,
    evaluate: (ctx) => {
      const pkgName = ctx.analysis.package.name;
      const matches = matchers.some((pattern) => matchPattern(pkgName, pattern));

      if (!matches) return { triggered: false };

      return {
        triggered: true,
        recommendation: {
          package: pkgName,
          severity: def.severity,
          message: def.message,
          alternatives: (def.alternatives ?? []).map((a) => ({
            ...a,
            advantages: [],
          })),
          reasons: def.reasons ?? [],
          category: 'anti-pattern',
        },
      };
    },
  };
}

/**
 * Simple glob matching: supports * as wildcard.
 */
function matchPattern(name: string, pattern: string): boolean {
  if (pattern === name) return true;
  if (pattern === '*') return true;

  // Convert glob to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`).test(name);
}
