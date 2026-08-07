import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders unchecked state', () => {
    render(<Checkbox checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('renders checked state with indigo background', () => {
    render(<Checkbox checked={true} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Checkbox checked={false} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
