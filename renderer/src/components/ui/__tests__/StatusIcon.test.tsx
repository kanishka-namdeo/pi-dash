import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusIcon } from '../StatusIcon';

describe('StatusIcon', () => {
  it('renders success icon', () => {
    render(<StatusIcon type="success" />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('renders error icon', () => {
    render(<StatusIcon type="error" />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    render(<StatusIcon type="success" size={48} />);
    const icon = screen.getByTestId('status-icon');
    expect(icon).toHaveStyle({ width: '48px', height: '48px' });
  });
});
