import { renderHook, act } from '@testing-library/react';
import { useBottomBarAlerts, AlertType } from '../useBottomBarAlerts';

describe('useBottomBarAlerts', () => {
  it('returns null when no alerts', () => {
    const { result } = renderHook(() => useBottomBarAlerts());
    expect(result.current.alert).toBeNull();
  });

  it('prioritizes error over rate limit', () => {
    const { result } = renderHook(() => useBottomBarAlerts({
      agentError: { agentId: 'omp', message: 'Exited unexpectedly' },
      rateLimit: { provider: 'claude', percentUsed: 85, resetsIn: 9000 },
    }));
    expect(result.current.alert?.type).toBe('agent-error');
  });

  it('can dismiss alerts', () => {
    const { result } = renderHook(() => useBottomBarAlerts({
      rateLimit: { provider: 'claude', percentUsed: 85, resetsIn: 9000 },
    }));
    expect(result.current.alert).not.toBeNull();
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.alert).toBeNull();
  });
});
