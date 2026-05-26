import pc from 'picocolors';
import { loadConfig, saveConfig, getConfigPath, getDefaultConfig } from '@npi/core';

export async function configCommand(action?: string, key?: string, value?: string): Promise<void> {
  switch (action) {
    case 'get':
      await configGet(key);
      break;
    case 'set':
      await configSet(key, value);
      break;
    case 'path':
      console.log(`\n  ${getConfigPath()}\n`);
      break;
    case 'reset':
      await saveConfig(getDefaultConfig());
      console.log(`\n  ${pc.green('ok')} Config reset to defaults.\n`);
      break;
    default:
      await configGet();
      break;
  }
}

async function configGet(key?: string): Promise<void> {
  const config = await loadConfig();

  if (key) {
    const value = getNestedValue(config, key);
    if (value === undefined) {
      console.error(`\n  ${pc.red('x')} Unknown config key: ${key}\n`);
      process.exit(1);
    }
    console.log(`\n  ${key} = ${JSON.stringify(value)}\n`);
  } else {
    console.log(`\n${JSON.stringify(config, null, 2)}\n`);
  }
}

async function configSet(key?: string, value?: string): Promise<void> {
  if (!key || value === undefined) {
    console.error(`\n  ${pc.red('x')} Usage: npi config set <key> <value>\n`);
    process.exit(1);
  }

  const config = await loadConfig();
  setNestedValue(config as unknown as Record<string, unknown>, key, parseValue(value));
  await saveConfig(config);
  console.log(`\n  ${pc.green('ok')} Set ${key} = ${value}\n`);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const k of keys) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[k];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof current[keys[i]] !== 'object' || current[keys[i]] === null) {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

function parseValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!isNaN(num)) return num;
  return value;
}
