/**
 * Anonymous telemetry for understanding usage patterns.
 * Completely opt-in. No personal data collected.
 */
export class Telemetry {
  private enabled: boolean;

  constructor(options?: { enabled?: boolean }) {
    this.enabled = options?.enabled ?? false;
  }

  track(_event: string, _properties?: Record<string, unknown>): void {
    if (!this.enabled) return;
    // Future: send anonymous usage data
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
