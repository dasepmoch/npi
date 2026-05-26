import pc from 'picocolors';

const ROUNDED = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

/**
 * Get the visual width of a string, accounting for ANSI codes and wide characters (emoji).
 */
function stringWidth(str: string): number {
  const stripped = stripAnsi(str);
  let width = 0;
  for (const char of stripped) {
    const code = char.codePointAt(0) ?? 0;
    // Emoji and other wide characters take 2 columns
    if (isWideCharacter(code)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Check if a Unicode code point is a wide character (CJK, emoji, etc.)
 */
function isWideCharacter(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115F) || // Hangul Jamo
    (code >= 0x2E80 && code <= 0x303E) || // CJK
    (code >= 0x3040 && code <= 0x33BF) || // Japanese
    (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility
    (code >= 0xFE30 && code <= 0xFE6F) || // CJK Forms
    (code >= 0xFF01 && code <= 0xFF60) || // Fullwidth
    (code >= 0x1F000 && code <= 0x1FFFF) || // Emoji & symbols
    (code >= 0x20000 && code <= 0x2FFFF) || // CJK Extension B+
    (code >= 0xFE00 && code <= 0xFE0F) || // Variation selectors
    (code >= 0x2600 && code <= 0x27BF) // Misc symbols
  );
}

export function box(content: string, options?: { title?: string; width?: number }): string {
  const termWidth = process.stdout.columns || 60;
  const width = options?.width ?? Math.min(termWidth, 60);
  const innerWidth = width - 4;
  const lines = content.split('\n');

  let top: string;
  if (options?.title) {
    const titleWidth = stringWidth(options.title);
    const remainingWidth = Math.max(0, innerWidth - titleWidth - 3);
    top = `${ROUNDED.topLeft}${ROUNDED.horizontal} ${pc.bold(options.title)} ${ROUNDED.horizontal.repeat(remainingWidth)}${ROUNDED.topRight}`;
  } else {
    top = `${ROUNDED.topLeft}${ROUNDED.horizontal.repeat(innerWidth + 2)}${ROUNDED.topRight}`;
  }

  const bottom = `${ROUNDED.bottomLeft}${ROUNDED.horizontal.repeat(innerWidth + 2)}${ROUNDED.bottomRight}`;

  const body = lines.map((line) => {
    const lineWidth = stringWidth(line);
    const padding = Math.max(0, innerWidth - lineWidth);
    return `${ROUNDED.vertical} ${line}${' '.repeat(padding)} ${ROUNDED.vertical}`;
  });

  return [top, ...body, bottom].join('\n');
}

export function divider(width?: number): string {
  const w = width ?? Math.min(process.stdout.columns || 60, 60);
  return pc.dim(ROUNDED.horizontal.repeat(w));
}

export function badge(text: string, color: 'green' | 'yellow' | 'red' | 'blue' | 'dim'): string {
  const colorFn = {
    green: pc.green,
    yellow: pc.yellow,
    red: pc.red,
    blue: pc.blue,
    dim: pc.dim,
  }[color];

  return colorFn(`[${text}]`);
}

export function label(key: string, value: string, keyWidth = 20): string {
  const paddedKey = key.padEnd(keyWidth);
  return `${pc.dim(paddedKey)}${value}`;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}
