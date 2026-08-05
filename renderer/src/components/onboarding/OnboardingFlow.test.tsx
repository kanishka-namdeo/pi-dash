import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';

vi.mock('./WelcomeScreen', () => ({ WelcomeScreen: () => <div data-testid="welcome">WelcomeScreen</div> }));
vi.mock('./ScanningScreen', () => ({ ScanningScreen: () => <div data-testid="scanning">ScanningScreen</div> }));
vi.mock('./ResultsScreen', () => ({ ResultsScreen: () => <div data-testid="results">ResultsScreen</div> }));
vi.mock('./ManualAddScreen', () => ({ ManualAddScreen: () => <div data-testid="manual-add">ManualAddScreen</div> }));
vi.mock('./NoAgentsScreen', () => ({ NoAgentsScreen: () => <div data-testid="no-agents">NoAgentsScreen</div> }));
vi.mock('./ReadyScreen', () => ({ ReadyScreen: () => <div data-testid="ready">ReadyScreen</div> }));

const mockState = {
  currentScreen: 'welcome' as const,
  agents: [],
  selectedAgents: [],
  navigateTo: vi.fn(),
  setAgents: vi.fn(),
  addAgent: vi.fn(),
  toggleAgent: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
};

vi.mock('../../hooks/useOnboardingState', () => ({
  useOnboardingState: () => mockState,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockState.currentScreen = 'welcome';
  mockState.agents = [];
  mockState.selectedAgents = [];
});

import { OnboardingFlow } from './OnboardingFlow';

function renderFlow() {
  return render(<OnboardingFlow />);
}

describe('OnboardingFlow', () => {
  it('renders WelcomeScreen by default', () => {
    renderFlow();
    expect(screen.getByTestId('welcome')).toBeInTheDocument();
  });

  it('renders ScanningScreen when currentScreen is scanning', () => {
    mockState.currentScreen = 'scanning';
    renderFlow();
    expect(screen.getByTestId('scanning')).toBeInTheDocument();
  });

  it('renders ResultsScreen when currentScreen is results', () => {
    mockState.currentScreen = 'results';
    renderFlow();
    expect(screen.getByTestId('results')).toBeInTheDocument();
  });

  it('renders ManualAddScreen when currentScreen is manual-add', () => {
    mockState.currentScreen = 'manual-add';
    renderFlow();
    expect(screen.getByTestId('manual-add')).toBeInTheDocument();
  });

  it('renders NoAgentsScreen when currentScreen is no-agents', () => {
    mockState.currentScreen = 'no-agents';
    renderFlow();
    expect(screen.getByTestId('no-agents')).toBeInTheDocument();
  });

  it('renders ReadyScreen when currentScreen is ready', () => {
    mockState.currentScreen = 'ready';
    renderFlow();
    expect(screen.getByTestId('ready')).toBeInTheDocument();
  });
});
