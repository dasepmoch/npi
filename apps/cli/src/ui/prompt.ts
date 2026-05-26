import { createInterface } from 'node:readline';
import pc from 'picocolors';

export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultValue ? '[Y/n]' : '[y/N]';

  return new Promise((resolve) => {
    rl.question(`  ${message} ${pc.dim(hint)} `, (answer) => {
      rl.close();
      if (!answer) {
        resolve(defaultValue);
        return;
      }
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

export async function select(
  message: string,
  options: Array<{ label: string; value: string }>
): Promise<string> {
  console.log(`  ${message}`);
  console.log('');

  for (let i = 0; i < options.length; i++) {
    console.log(`  ${pc.dim(`${i + 1}.`)} ${options[i].label}`);
  }

  console.log('');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`  ${pc.dim('Select (1-' + options.length + '):')} `, (answer) => {
      rl.close();
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < options.length) {
        resolve(options[idx].value);
      } else {
        resolve(options[0].value);
      }
    });
  });
}
