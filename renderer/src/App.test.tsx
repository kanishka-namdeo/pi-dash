import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';

// Mock the OnboardingFlow component
vi.mock('./components/onboarding/OnboardingFlow', () => ({
  OnboardingFlow: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="onboarding-flow">
      <button
        data-testid="complete-btn"
        onClick={() => onComplete?.()}
      >
        Complete
      </button>
    </div>
  ),
}));

// Mock the Dashboard component
vi.mock('./components/dashboard/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>,
}));

// Mock sub-route components
vi.mock('./components/views/AgentDetailView', () => ({
  AgentDetailView: () => <div data-testid="agent-detail">AgentDetailView</div>,
}));
vi.mock('./components/views/WorktreeView', () => ({
  WorktreeView: () => <div data-testid="worktree">WorktreeView</div>,
}));
vi.mock('./components/views/CompletedWorkView', () => ({
  CompletedWorkView: () => <div data-testid="completed-work">CompletedWorkView</div>,
}));

const mockGetOnboardingStatus = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Mock window.api with a Promise that resolves to a value we control
  Object.defineProperty(window, 'api', {
    value: {
      getOnboardingStatus: mockGetOnboardingStatus,
    },
    writable: true,
  });
});

import App from './App';

function renderApp() {
  return render(<App />);
}

describe('App', () => {
  it('shows OnboardingFlow when onboarding is not completed', async () => {
    mockGetOnboardingStatus.mockResolvedValue(false);

    renderApp();

    // Should show loading first, then OnboardingFlow
    const onboarding = await screen.findByTestId('onboarding-flow');
    expect(onboarding).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('shows Dashboard when onboarding is completed', async () => {
    mockGetOnboardingStatus.mockResolvedValue(true);

    renderApp();

    const dashboard = await screen.findByTestId('dashboard');
    expect(dashboard).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
  });

  it('transitions from OnboardingFlow to Dashboard when onboarding completes', async () => {
    mockGetOnboardingStatus.mockResolvedValue(false);

    renderApp();

    // Should start with OnboardingFlow
    const onboarding = await screen.findByTestId('onboarding-flow');
    expect(onboarding).toBeInTheDocument();

    // Simulate onboarding completion
    const completeBtn = screen.getByTestId('complete-btn');
    await act(async () => {
      completeBtn.click();
    });

    // Should now show Dashboard
    const dashboard = await screen.findByTestId('dashboard');
    expect(dashboard).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-flow')).not.toBeInTheDocument();
  });
});
