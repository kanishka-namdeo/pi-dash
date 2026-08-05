import { describe, it, expect } from 'vitest';
import { parseAnsi } from './ansiParser';

describe('parseAnsi', () => {
  it('parses plain text without ANSI codes', () => {
    const result = parseAnsi('hello world');
    expect(result).toEqual([{ text: 'hello world' }]);
  });

  it('parses bold text', () => {
    const result = parseAnsi('\x1b[1mhello\x1b[0m');
    expect(result).toEqual([{ text: 'hello', bold: true }]);
  });

  it('parses colored text', () => {
    const result = parseAnsi('\x1b[32mgreen\x1b[0m');
    expect(result).toEqual([{ text: 'green', color: '#22c55e' }]);
  });

  it('parses bold and colored text', () => {
    const result = parseAnsi('\x1b[1m\x1b[31mred bold\x1b[0m');
    expect(result).toEqual([{ text: 'red bold', bold: true, color: '#ef4444' }]);
  });

  it('handles multiple spans', () => {
    const result = parseAnsi('normal \x1b[32mgreen\x1b[0m normal');
    expect(result).toEqual([
      { text: 'normal ' },
      { text: 'green', color: '#22c55e' },
      { text: ' normal' },
    ]);
  });
});
