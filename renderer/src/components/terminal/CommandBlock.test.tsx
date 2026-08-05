import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CommandBlockView } from './CommandBlock';
import type { CommandBlock } from '../../types/session';

const mockBlock: CommandBlock = {
  id: '1',
  command: 'ls',
  timestamp: Date.now(),
  output: 'file1.txt\nfile2.txt',
  isMultiLine: true,
  isCollapsed: false,
};

describe('CommandBlockView', () => {
  it('renders command and output', () => {
    const { container } = render(
      <CommandBlockView block={mockBlock} onToggleCollapse={() => {}} />
    );
    expect(container.textContent).toContain('ls');
    expect(container.textContent).toContain('file1.txt');
  });
  
  it('shows collapse chevron for multi-line blocks', () => {
    const { container } = render(
      <CommandBlockView block={mockBlock} onToggleCollapse={() => {}} />
    );
    expect(container.textContent).toContain('▼');
  });
  
  it('calls onToggleCollapse when header is clicked', () => {
    let clicked = false;
    const { container } = render(
      <CommandBlockView block={mockBlock} onToggleCollapse={() => { clicked = true; }} />
    );
    
    const header = container.querySelector('.block-header');
    fireEvent.click(header!);
    
    expect(clicked).toBe(true);
  });
});
