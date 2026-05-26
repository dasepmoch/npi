import { describe, it, expect } from 'vitest';
import { createConfig, getDefaultConfig } from './config.js';

describe('createConfig', () => {
  it('should return default config when no args', () => {
    const config = createConfig();
    expect(config.cache.enabled).toBe(true);
    expect(config.cache.ttl).toBe(3600);
    expect(config.ui.colors).toBe(true);
    expect(config.install.autoConfirm).toBe(false);
    expect(config.telemetry.enabled).toBe(false);
  });

  it('should merge partial config with defaults', () => {
    const config = createConfig({
      cache: { enabled: false, ttl: 1800 },
    });
    expect(config.cache.enabled).toBe(false);
    expect(config.cache.ttl).toBe(1800);
    expect(config.ui.colors).toBe(true); // default preserved
  });
});

describe('getDefaultConfig', () => {
  it('should return a copy of default config', () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // different references
  });
});
