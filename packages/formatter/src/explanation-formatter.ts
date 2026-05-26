import pc from 'picocolors';
import { box } from './primitives.js';

export interface ExplanationData {
  package: string;
  whyUsed: string;
  whyMovedAway?: string;
  currentSentiment: string;
  alternatives: string[];
  migrationTip?: string;
}

export function formatExplanation(data: ExplanationData): string {
  const lines: string[] = [];

  lines.push(box(
    `${pc.bold(data.package)}\n${pc.dim('Package Explanation')}`,
    { title: '📖 Why' }
  ));

  lines.push('');

  // Why it was used
  lines.push(`  ${pc.bold('Why developers used it')}`);
  lines.push('');
  wrapText(data.whyUsed, 56).forEach((line) => {
    lines.push(`  ${line}`);
  });

  // Why ecosystem moved away
  if (data.whyMovedAway) {
    lines.push('');
    lines.push(`  ${pc.bold('Why the ecosystem moved away')}`);
    lines.push('');
    wrapText(data.whyMovedAway, 56).forEach((line) => {
      lines.push(`  ${line}`);
    });
  }

  // Current sentiment
  lines.push('');
  lines.push(`  ${pc.bold('Current sentiment')}`);
  lines.push('');
  wrapText(data.currentSentiment, 56).forEach((line) => {
    lines.push(`  ${line}`);
  });

  // Alternatives
  if (data.alternatives.length > 0) {
    lines.push('');
    lines.push(`  ${pc.bold('Modern alternatives')}`);
    lines.push('');
    for (const alt of data.alternatives) {
      lines.push(`  ${pc.green('•')} ${alt}`);
    }
  }

  // Migration tip
  if (data.migrationTip) {
    lines.push('');
    lines.push(`  ${pc.bold('Migration tip')}`);
    lines.push('');
    wrapText(data.migrationTip, 56).forEach((line) => {
      lines.push(`  ${pc.dim(line)}`);
    });
  }

  lines.push('');

  return lines.join('\n');
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}
