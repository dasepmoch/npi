export class NpiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NpiError';
  }
}

export class PackageNotFoundError extends NpiError {
  constructor(packageName: string) {
    super(
      `Package "${packageName}" not found on npm registry.`,
      'PACKAGE_NOT_FOUND',
      { packageName }
    );
    this.name = 'PackageNotFoundError';
  }
}

export class NetworkError extends NpiError {
  constructor(url: string, statusCode?: number) {
    super(
      `Network request failed: ${url}`,
      'NETWORK_ERROR',
      { url, statusCode }
    );
    this.name = 'NetworkError';
  }
}

export class CacheError extends NpiError {
  constructor(message: string) {
    super(message, 'CACHE_ERROR');
    this.name = 'CacheError';
  }
}

export class AnalysisError extends NpiError {
  constructor(packageName: string, reason: string) {
    super(
      `Failed to analyze "${packageName}": ${reason}`,
      'ANALYSIS_ERROR',
      { packageName, reason }
    );
    this.name = 'AnalysisError';
  }
}
