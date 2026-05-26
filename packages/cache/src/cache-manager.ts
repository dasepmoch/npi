import { readFile, writeFile, mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

export interface CacheOptions {
  directory?: string;
  ttl?: number; // seconds
  maxSize?: number; // max entries
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

/**
 * Custom JSON replacer that converts Date objects to a tagged format
 * so they can be properly restored on deserialization.
 * Note: We use `this[key]` because JSON.stringify calls .toJSON() on Dates
 * before passing the value to the replacer.
 */
function jsonReplacer(this: unknown, key: string, value: unknown): unknown {
  if (key === '') return value; // root object
  const rawValue = (this as Record<string, unknown>)[key];
  if (rawValue instanceof Date) {
    return { __type: 'Date', __value: rawValue.toISOString() };
  }
  return value;
}

/**
 * Custom JSON reviver that restores Date objects from tagged format.
 */
function jsonReviver(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    '__type' in (value as Record<string, unknown>) &&
    (value as Record<string, unknown>).__type === 'Date'
  ) {
    return new Date((value as Record<string, unknown>).__value as string);
  }
  return value;
}

export class CacheManager {
  private directory: string;
  private defaultTtl: number;
  private maxSize: number;

  constructor(options?: CacheOptions) {
    this.directory = options?.directory ?? join(homedir(), '.npi', 'cache');
    this.defaultTtl = options?.ttl ?? 3600;
    this.maxSize = options?.maxSize ?? 500;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const filePath = this.getFilePath(key);
      const content = await readFile(filePath, 'utf-8');
      const entry = JSON.parse(content, jsonReviver) as CacheEntry<T>;

      if (this.isExpired(entry)) {
        await this.delete(key);
        return undefined;
      }

      return entry.data;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.ensureDirectory();
    await this.evictIfNeeded();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      key,
    };

    const filePath = this.getFilePath(key);
    await writeFile(filePath, JSON.stringify(entry, jsonReplacer), 'utf-8');
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await unlink(filePath);
    } catch {
      // ignore — file may not exist
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async clear(): Promise<void> {
    try {
      const files = await readdir(this.directory);
      await Promise.all(
        files.map((file) => unlink(join(this.directory, file)))
      );
    } catch {
      // ignore — directory may not exist
    }
  }

  async getStats(): Promise<{ entries: number; sizeBytes: number }> {
    try {
      const files = await readdir(this.directory);
      let totalSize = 0;

      for (const file of files) {
        const s = await stat(join(this.directory, file));
        totalSize += s.size;
      }

      return { entries: files.length, sizeBytes: totalSize };
    } catch {
      return { entries: 0, sizeBytes: 0 };
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const expiresAt = entry.timestamp + entry.ttl * 1000;
    return now > expiresAt;
  }

  private getFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex').slice(0, 16);
    return join(this.directory, `${hash}.json`);
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  /**
   * Evict oldest entries when cache exceeds maxSize.
   */
  private async evictIfNeeded(): Promise<void> {
    try {
      const files = await readdir(this.directory);
      if (files.length < this.maxSize) return;

      // Get file stats and sort by modification time (oldest first)
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = join(this.directory, file);
          const s = await stat(filePath);
          return { file: filePath, mtime: s.mtimeMs };
        })
      );

      fileStats.sort((a, b) => a.mtime - b.mtime);

      // Remove oldest 20% of entries
      const toRemove = Math.ceil(files.length * 0.2);
      await Promise.all(
        fileStats.slice(0, toRemove).map((f) => unlink(f.file).catch(() => {}))
      );
    } catch {
      // ignore — non-critical operation
    }
  }
}
