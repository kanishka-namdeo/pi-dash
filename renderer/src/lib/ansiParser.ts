export type StyledSpan = {
  text: string;
  bold?: boolean;
  color?: string;
};

const ANSI_REGEX = /\x1b\[(\d+)m/g;

const COLOR_MAP: Record<string, string> = {
  '31': '#ef4444', // red
  '32': '#22c55e', // green
  '33': '#eab308', // yellow
  '34': '#3b82f6', // blue
  '35': '#d946ef', // magenta
  '36': '#06b6d4', // cyan
  '37': '#ffffff', // white
  '90': '#737373', // bright black (dim)
};

export function parseAnsi(input: string): StyledSpan[] {
  const spans: StyledSpan[] = [];
  let currentText = '';
  let currentBold = false;
  let currentColor: string | undefined;

  let lastIndex = 0;
  let match;

  while ((match = ANSI_REGEX.exec(input)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      currentText += input.slice(lastIndex, match.index);
    }

    const code = match[1];

    // If we have accumulated text, save it
    if (currentText) {
      spans.push({
        text: currentText,
        bold: currentBold || undefined,
        color: currentColor,
      });
      currentText = '';
    }

    // Update style state
    if (code === '0') {
      currentBold = false;
      currentColor = undefined;
    } else if (code === '1') {
      currentBold = true;
    } else if (COLOR_MAP[code]) {
      currentColor = COLOR_MAP[code];
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < input.length) {
    currentText += input.slice(lastIndex);
  }

  if (currentText) {
    spans.push({
      text: currentText,
      bold: currentBold || undefined,
      color: currentColor,
    });
  }

  return spans;
}
