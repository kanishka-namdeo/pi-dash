import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Search } from 'lucide-react';
import { IconBox } from '../IconBox';

describe('IconBox', () => {
  it('renders with correct size', () => {
    render(<IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" size={40} />);
    const container = screen.getByTestId('icon-box');
    expect(container).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('renders with default size', () => {
    render(<IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" />);
    const container = screen.getByTestId('icon-box');
    expect(container).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('applies background color', () => {
    render(<IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" />);
    const container = screen.getByTestId('icon-box');
    expect(container).toHaveStyle({ backgroundColor: '#3b82f622' });
  });
});
