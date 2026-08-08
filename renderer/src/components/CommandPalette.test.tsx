import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';

vi.mock('../hooks/useCommandPalette', () => ({
  useCommandPalette: () => ({
    isOpen: true,
    query: '',
    setQuery: vi.fn(),
    selectedIndex: 0,
    results: [],
    recentSearches: [{ term: 'claude-code', timestamp: Date.now() }],
    quickActions: [
      { id: 'action-settings', type: 'action', title: 'Open Settings', description: 'Ctrl+,', icon: 'settings', iconColor: '$text-muted', route: '/settings' },
    ],
    inputRef: { current: null },
    handleKeyDown: vi.fn(),
    selectItem: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

describe('CommandPalette', () => {
  it('renders when open', () => {
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText(/search agents/i)).toBeDefined();
  });

  it('shows recent searches when query is empty', () => {
    render(<CommandPalette />);
    expect(screen.getByText('RECENT')).toBeDefined();
    expect(screen.getByText('claude-code')).toBeDefined();
  });

  it('shows quick actions', () => {
    render(<CommandPalette />);
    expect(screen.getByText('QUICK ACTIONS')).toBeDefined();
    expect(screen.getByText('Open Settings')).toBeDefined();
  });
});
