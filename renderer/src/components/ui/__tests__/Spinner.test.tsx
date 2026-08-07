import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('renders with custom size', () => {
    render(<Spinner size={48} />);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('has loading role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
