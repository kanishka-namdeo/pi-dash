import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BottomBar } from '../BottomBar';

describe('BottomBar', () => {
  it('renders three zones', () => {
    render(<BottomBar />);
    expect(screen.getByTestId('bottom-bar-left')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-bar-center')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-bar-right')).toBeInTheDocument();
  });

  it('has correct height and border', () => {
    render(<BottomBar />);
    const bar = screen.getByTestId('bottom-bar');
    expect(bar).toHaveStyle({ height: '36px' });
  });
});
