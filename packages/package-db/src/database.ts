/**
 * Local package intelligence database.
 * Stores curated package metadata, recommendations, and ecosystem knowledge.
 */
export class PackageDatabase {
  private data: Map<string, PackageEntry> = new Map();

  constructor() {
    this.loadBuiltinData();
  }

  get(name: string): PackageEntry | undefined {
    return this.data.get(name);
  }

  has(name: string): boolean {
    return this.data.has(name);
  }

  getCategory(name: string): string | undefined {
    return this.data.get(name)?.category;
  }

  getAlternatives(name: string): string[] {
    return this.data.get(name)?.alternatives ?? [];
  }

  private loadBuiltinData(): void {
    const entries: PackageEntry[] = [
      { name: 'moment', category: 'date', status: 'legacy', alternatives: ['dayjs', 'date-fns', 'luxon'] },
      { name: 'lodash', category: 'utility', status: 'declining', alternatives: ['remeda', 'radash', 'es-toolkit'] },
      { name: 'request', category: 'http', status: 'deprecated', alternatives: ['got', 'ky', 'ofetch'] },
      { name: 'axios', category: 'http', status: 'stable', alternatives: ['ky', 'ofetch', 'native fetch'] },
      { name: 'node-sass', category: 'css', status: 'deprecated', alternatives: ['sass'] },
      { name: 'enzyme', category: 'testing', status: 'legacy', alternatives: ['@testing-library/react'] },
      { name: 'tslint', category: 'linting', status: 'deprecated', alternatives: ['eslint'] },
      { name: 'gulp', category: 'build', status: 'legacy', alternatives: ['vite', 'esbuild'] },
      { name: 'grunt', category: 'build', status: 'deprecated', alternatives: ['vite', 'esbuild'] },
      { name: 'bower', category: 'package-manager', status: 'deprecated', alternatives: ['npm', 'pnpm'] },
    ];

    for (const entry of entries) {
      this.data.set(entry.name, entry);
    }
  }
}

export interface PackageEntry {
  name: string;
  category: string;
  status: 'thriving' | 'stable' | 'declining' | 'legacy' | 'deprecated';
  alternatives: string[];
}
