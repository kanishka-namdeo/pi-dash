import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SessionProvider, useSessionContext } from './SessionContext';

function TestConsumer() {
  const ctx = useSessionContext();
  return (
    <div>
      <span data-testid="count">{ctx.getActiveSessions().length}</span>
      <button data-testid="register" onClick={() => ctx.registerSession('pi', 1234, '/home/user')}>
        Register
      </button>
    </div>
  );
}

describe('SessionContext', () => {
  it('starts with no sessions', () => {
    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('registers a session', () => {
    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>,
    );
    act(() => {
      screen.getByTestId('register').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
