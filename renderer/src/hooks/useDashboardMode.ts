import { useState } from 'react';
import type { Mode } from '@/types/dashboard';

export function useDashboardMode(initialMode: Mode = 'supervised') {
  const [mode, setMode] = useState<Mode>(initialMode);

  return { mode, setMode };
}
