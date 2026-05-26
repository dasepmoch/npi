import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from './cache-manager.js';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';

describe('CacheManager', () => {
  let cache: CacheManager;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `npi-test-cache-${Date.now()}`);
    cache = new CacheManager({ directory: testDir, ttl: 60 });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should set and get a value', async () => {
    await cache.set('key1', { hello: 'world' });
    const result = await cache.get<{ hello: string }>('key1');
    expect(result).toEqual({ hello: 'world' });
  });

  it('should return undefined for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should delete a key', async () => {
    await cache.set('key1', 'value');
    await cache.delete('key1');
    const result = await cache.get('key1');
    expect(result).toBeUndefined();
  });

  it('should check if key exists', async () => {
    await cache.set('key1', 'value');
    expect(await cache.has('key1')).toBe(true);
    expect(await cache.has('key2')).toBe(false);
  });

  it('should expire entries based on TTL', async () => {
    const shortCache = new CacheManager({ directory: testDir, ttl: 0 });
    await shortCache.set('key1', 'value');

    // Wait a tiny bit for expiration
    await new Promise((r) => setTimeout(r, 10));

    const result = await shortCache.get('key1');
    expect(result).toBeUndefined();
  });

  it('should clear all entries', async () => {
    await cache.set('key1', 'a');
    await cache.set('key2', 'b');
    await cache.clear();

    expect(await cache.get('key1')).toBeUndefined();
    expect(await cache.get('key2')).toBeUndefined();
  });

  it('should preserve Date objects through serialization', async () => {
    const data = {
      name: 'test',
      lastPublish: new Date('2024-01-15T10:30:00.000Z'),
      nested: {
        created: new Date('2020-06-01T00:00:00.000Z'),
      },
    };

    await cache.set('dates', data);
    const result = await cache.get<typeof data>('dates');

    expect(result).toBeDefined();
    expect(result!.lastPublish).toBeInstanceOf(Date);
    expect(result!.lastPublish.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    expect(result!.nested.created).toBeInstanceOf(Date);
    expect(result!.nested.created.toISOString()).toBe('2020-06-01T00:00:00.000Z');
  });

  it('should return stats', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    const stats = await cache.getStats();
    expect(stats.entries).toBe(2);
    expect(stats.sizeBytes).toBeGreaterThan(0);
  });

  it('should handle concurrent writes safely', async () => {
    await Promise.all([
      cache.set('a', 1),
      cache.set('b', 2),
      cache.set('c', 3),
    ]);

    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('b')).toBe(2);
    expect(await cache.get('c')).toBe(3);
  });
});
