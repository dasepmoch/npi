import { describe, it, expect } from 'vitest';
import { NpiError, PackageNotFoundError, NetworkError, CacheError, AnalysisError } from './errors.js';

describe('NpiError', () => {
  it('should create error with code and details', () => {
    const err = new NpiError('test', 'TEST_CODE', { foo: 'bar' });
    expect(err.message).toBe('test');
    expect(err.code).toBe('TEST_CODE');
    expect(err.details).toEqual({ foo: 'bar' });
    expect(err.name).toBe('NpiError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('PackageNotFoundError', () => {
  it('should include package name in message', () => {
    const err = new PackageNotFoundError('my-pkg');
    expect(err.message).toContain('my-pkg');
    expect(err.code).toBe('PACKAGE_NOT_FOUND');
    expect(err.name).toBe('PackageNotFoundError');
    expect(err).toBeInstanceOf(NpiError);
  });
});

describe('NetworkError', () => {
  it('should include url and status', () => {
    const err = new NetworkError('https://example.com', 500);
    expect(err.message).toContain('https://example.com');
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.details).toEqual({ url: 'https://example.com', statusCode: 500 });
  });
});

describe('CacheError', () => {
  it('should create with message', () => {
    const err = new CacheError('disk full');
    expect(err.message).toBe('disk full');
    expect(err.code).toBe('CACHE_ERROR');
  });
});

describe('AnalysisError', () => {
  it('should include package name and reason', () => {
    const err = new AnalysisError('lodash', 'timeout');
    expect(err.message).toContain('lodash');
    expect(err.message).toContain('timeout');
    expect(err.code).toBe('ANALYSIS_ERROR');
  });
});
