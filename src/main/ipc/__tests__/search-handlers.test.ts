import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSearchHandlers } from '../search-handlers';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe('registerSearchHandlers', () => {
  const mockSettingsService = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers three IPC handlers', () => {
    registerSearchHandlers(mockSettingsService as any);
    expect(ipcMain.handle).toHaveBeenCalledTimes(3);
    expect(ipcMain.handle).toHaveBeenCalledWith('search:getRecent', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('search:addRecent', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('search:clearRecent', expect.any(Function));
  });

  it('getRecent returns empty array when no data', () => {
    mockSettingsService.get.mockReturnValue(undefined);
    registerSearchHandlers(mockSettingsService as any);
    const getRecentHandler = vi.mocked(ipcMain.handle).mock.calls.find((c) => c[0] === 'search:getRecent')?.[1] as Function;
    const result = getRecentHandler({} as any);
    expect(result).toEqual([]);
  });

  it('addRecent prepends term and caps at 10', () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({ term: `term${i}`, timestamp: i }));
    mockSettingsService.get.mockReturnValue(existing);
    registerSearchHandlers(mockSettingsService as any);
    const addRecentHandler = vi.mocked(ipcMain.handle).mock.calls.find((c) => c[0] === 'search:addRecent')?.[1] as Function;
    addRecentHandler({} as any, 'newTerm');
    expect(mockSettingsService.set).toHaveBeenCalled();
    const saved = mockSettingsService.set.mock.calls[0][1];
    expect(saved[0].term).toBe('newTerm');
    expect(saved.length).toBe(10);
  });
});
