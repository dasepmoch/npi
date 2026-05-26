import { describe, it, expect } from 'vitest';
import { parsePackageSpec } from './package-spec.js';

describe('parsePackageSpec', () => {
  it('parses simple package name', () => {
    expect(parsePackageSpec('react')).toEqual({ name: 'react' });
  });

  it('parses package with version', () => {
    expect(parsePackageSpec('react@18')).toEqual({ name: 'react', version: '18' });
  });

  it('parses package with exact version', () => {
    expect(parsePackageSpec('react@18.2.0')).toEqual({ name: 'react', version: '18.2.0' });
  });

  it('parses scoped package', () => {
    expect(parsePackageSpec('@types/node')).toEqual({ name: '@types/node' });
  });

  it('parses scoped package with version', () => {
    expect(parsePackageSpec('@types/node@20')).toEqual({ name: '@types/node', version: '20' });
  });

  it('parses scoped package with exact version', () => {
    expect(parsePackageSpec('@scope/pkg@1.2.3')).toEqual({ name: '@scope/pkg', version: '1.2.3' });
  });

  it('parses package with latest tag', () => {
    expect(parsePackageSpec('lodash@latest')).toEqual({ name: 'lodash', version: 'latest' });
  });

  it('parses package with caret range', () => {
    expect(parsePackageSpec('react@^18.0.0')).toEqual({ name: 'react', version: '^18.0.0' });
  });

  it('throws on empty input', () => {
    expect(() => parsePackageSpec('')).toThrow();
  });
});
