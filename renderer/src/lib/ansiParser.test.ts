import { describe, it, expect } from 'vitest';
import { parseAnsi } from './ansiParser';

describe('parseAnsi', () => {
  it('parses plain text without ANSI codes', () => {
    const result = parseAnsi('hello world');
    expect(result).toEqual([{ text: 'hello world' }]);
  });
});
