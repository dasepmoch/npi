import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { NpiConfigSchema, type NpiConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.npi');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const RC_FILE = '.npirc';

const DEFAULT_CONFIG: NpiConfig = {
  cache: {
    enabled: true,
    ttl: 3600,
  },
  ui: {
    colors: true,
    compact: false,
  },
  install: {
    autoConfirm: false,
    preferAlternatives: true,
    showBundleImpact: true,
  },
  telemetry: {
    enabled: false,
  },
  ignore: [],
  rules: {},
};

/**
 * Load config from ~/.npi/config.json, merged with local .npirc if present.
 */
export async function loadConfig(cwd?: string): Promise<NpiConfig> {
  let config = { ...DEFAULT_CONFIG };

  // Load global config
  const globalConfig = await loadJsonFile(CONFIG_FILE);
  if (globalConfig) {
    config = mergeConfig(config, globalConfig);
  }

  // Load local .npirc (overrides global)
  const dir = cwd ?? process.cwd();
  const localConfig = await loadJsonFile(join(dir, RC_FILE));
  if (localConfig) {
    config = mergeConfig(config, localConfig);
  }

  return NpiConfigSchema.parse(config);
}

/**
 * Save config to ~/.npi/config.json
 */
export async function saveConfig(config: Partial<NpiConfig>): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  const current = await loadConfig();
  const merged = mergeConfig(current, config);
  await writeFile(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
}

/**
 * Get the path to the global config file.
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Check if a local .npirc exists in the given directory.
 */
export function hasLocalConfig(cwd?: string): boolean {
  const dir = cwd ?? process.cwd();
  return existsSync(join(dir, RC_FILE));
}

export function createConfig(partial?: Partial<NpiConfig>): NpiConfig {
  const merged = mergeConfig(DEFAULT_CONFIG, partial ?? {});
  return NpiConfigSchema.parse(merged);
}

export function getDefaultConfig(): NpiConfig {
  return { ...DEFAULT_CONFIG };
}

function mergeConfig(base: NpiConfig, override: Partial<NpiConfig>): NpiConfig {
  return {
    cache: { ...base.cache, ...override.cache },
    ui: { ...base.ui, ...override.ui },
    install: { ...base.install, ...override.install },
    telemetry: { ...base.telemetry, ...override.telemetry },
    ignore: override.ignore ?? base.ignore,
    rules: { ...base.rules, ...override.rules },
  };
}

async function loadJsonFile(path: string): Promise<Partial<NpiConfig> | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as Partial<NpiConfig>;
  } catch {
    return null;
  }
}
