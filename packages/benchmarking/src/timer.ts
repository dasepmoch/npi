/**
 * Performance measurement utilities for NPI operations.
 */
export class Timer {
  private start: bigint;
  private marks: Map<string, bigint> = new Map();

  constructor() {
    this.start = process.hrtime.bigint();
  }

  mark(label: string): void {
    this.marks.set(label, process.hrtime.bigint());
  }

  elapsed(): number {
    return Number(process.hrtime.bigint() - this.start) / 1_000_000;
  }

  elapsedSince(label: string): number {
    const mark = this.marks.get(label);
    if (!mark) return 0;
    return Number(process.hrtime.bigint() - mark) / 1_000_000;
  }

  report(): Record<string, number> {
    const result: Record<string, number> = {};
    result['total'] = this.elapsed();

    let prev = this.start;
    for (const [label, time] of this.marks) {
      result[label] = Number(time - prev) / 1_000_000;
      prev = time;
    }

    return result;
  }
}

export async function benchmark<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

  return { result, durationMs };
}
