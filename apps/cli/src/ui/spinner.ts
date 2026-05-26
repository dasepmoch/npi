import ora, { type Ora } from 'ora';
import pc from 'picocolors';

export function createSpinner(text: string): Ora {
  return ora({
    text: pc.dim(text),
    spinner: 'dots',
    color: 'white',
  });
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();

  try {
    const result = await fn();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.fail(pc.red('Failed'));
    throw error;
  }
}
