import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { parseAnsi } from '../../lib/ansiParser';
import { AnsiText } from './AnsiText';

describe('AnsiText', () => {
  it('renders plain text', () => {
    const { container } = render(<AnsiText text="hello" />);
    expect(container.textContent).toBe('hello');
  });
  
  it('renders bold text', () => {
    const text = "\x1b[1mbold\x1b[0m";
    const spans = parseAnsi(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('bold');
    expect(spans[0].bold).toBe(true);
    
    const { container } = render(<AnsiText text={text} />);
    const span = container.querySelector('span');
    expect(span?.style.fontWeight).toBe('bold');
    expect(span?.textContent).toBe('bold');
  });
  
  it('renders colored text', () => {
    const text = "\x1b[32mgreen\x1b[0m";
    const spans = parseAnsi(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('green');
    expect(spans[0].color).toBe('#22c55e');
    
    const { container } = render(<AnsiText text={text} />);
    const span = container.querySelector('span');
    expect(span?.style.color).toBe('rgb(34, 197, 94)'); // #22c55e in RGB
    expect(span?.textContent).toBe('green');
  });
});
