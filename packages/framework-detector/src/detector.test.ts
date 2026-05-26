import { describe, it, expect } from 'vitest';
import { detectFramework } from './detector.js';

describe('detectFramework', () => {
  it('should detect Next.js', () => {
    expect(detectFramework({ dependencies: { next: '14.0.0' } })).toBe('nextjs');
  });

  it('should detect Vite', () => {
    expect(detectFramework({ devDependencies: { vite: '5.0.0' } })).toBe('vite');
  });

  it('should detect Astro', () => {
    expect(detectFramework({ dependencies: { astro: '4.0.0' } })).toBe('astro');
  });

  it('should detect Nuxt', () => {
    expect(detectFramework({ dependencies: { nuxt: '3.0.0' } })).toBe('nuxt');
  });

  it('should detect Remix', () => {
    expect(detectFramework({ dependencies: { '@remix-run/node': '2.0.0' } })).toBe('remix');
  });

  it('should detect React Native', () => {
    expect(detectFramework({ dependencies: { 'react-native': '0.72.0' } })).toBe('react-native');
  });

  it('should detect Electron', () => {
    expect(detectFramework({ devDependencies: { electron: '28.0.0' } })).toBe('electron');
  });

  it('should detect Express', () => {
    expect(detectFramework({ dependencies: { express: '4.18.0' } })).toBe('express');
  });

  it('should detect Fastify', () => {
    expect(detectFramework({ dependencies: { fastify: '4.0.0' } })).toBe('fastify');
  });

  it('should return unknown for no framework', () => {
    expect(detectFramework({ dependencies: { lodash: '4.0.0' } })).toBe('unknown');
  });

  it('should return unknown for null/undefined', () => {
    expect(detectFramework(null)).toBe('unknown');
    expect(detectFramework(undefined)).toBe('unknown');
  });

  it('should prefer Next.js over Vite when both present', () => {
    expect(detectFramework({
      dependencies: { next: '14.0.0' },
      devDependencies: { vite: '5.0.0' },
    })).toBe('nextjs');
  });
});
