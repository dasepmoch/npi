import pc from 'picocolors';
import { CacheManager } from '@npi/cache';
import { join } from 'node:path';
import { homedir } from 'node:os';

export async function cacheCommand(action?: string): Promise<void> {
  const cache = new CacheManager();

  switch (action) {
    case 'clear':
      await cache.clear();
      console.log(`\n  ${pc.green('ok')} Cache cleared.\n`);
      break;
    case 'stats': {
      const stats = await cache.getStats();
      console.log('');
      console.log(`  Cache entries:  ${stats.entries}`);
      console.log(`  Cache size:     ${formatBytes(stats.sizeBytes)}`);
      console.log(`  Cache path:     ${join(homedir(), '.npi', 'cache')}`);
      console.log('');
      break;
    }
    case 'path':
      console.log(`\n  ${join(homedir(), '.npi', 'cache')}\n`);
      break;
    default:
      console.log('');
      console.log(`  Usage:`);
      console.log(`    npi cache clear   Clear all cached data`);
      console.log(`    npi cache stats   Show cache statistics`);
      console.log(`    npi cache path    Show cache directory path`);
      console.log('');
      break;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
