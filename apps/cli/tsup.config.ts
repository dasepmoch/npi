import { defineConfig } from 'tsup';

const sharedNoExternal = [
  '@npi/core',
  '@npi/analyzer',
  '@npi/npm',
  '@npi/github',
  '@npi/scoring',
  '@npi/rules',
  '@npi/cache',
  '@npi/recommendation-engine',
  '@npi/explanation-engine',
  '@npi/framework-detector',
  '@npi/formatter',
  '@npi/lockfile',
  '@npi/security',
];

export default defineConfig({
  entry: {
    bin: 'src/bin.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  outExtension: () => ({ js: '.mjs' }),
  target: 'node18',
  platform: 'node',
  splitting: false,
  clean: true,
  dts: false,
  sourcemap: false,
  noExternal: sharedNoExternal,
});
