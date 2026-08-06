import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PRComposer } from '../PRComposer';

const mockCreatePR = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  Object.defineProperty(window, 'api', {
    value: {
      agentGitHub: {
        createPR: mockCreatePR,
      },
    },
    writable: true,
    configurable: true,
  });
});

describe('PRComposer', () => {
  it('renders dialog when open', () => {
    render(<PRComposer open={true} onClose={() => {}} worktreePath="/path" />);
    expect(screen.getByText('Create Pull Request')).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(<PRComposer open={false} onClose={() => {}} worktreePath="/path" />);
    expect(screen.queryByText('Create Pull Request')).not.toBeInTheDocument();
  });

  it('disables create button when title is empty', () => {
    render(<PRComposer open={true} onClose={() => {}} worktreePath="/path" />);
    const button = screen.getByText('Create PR');
    expect(button.closest('button')?.disabled).toBe(true);
  });

  it('renders title and description inputs', () => {
    render(<PRComposer open={true} onClose={() => {}} worktreePath="/path" />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    render(<PRComposer open={true} onClose={() => {}} worktreePath="/path" />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
