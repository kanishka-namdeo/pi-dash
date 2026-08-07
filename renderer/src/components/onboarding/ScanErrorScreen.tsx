import type { ScreenName } from '../../types';
import { PiLogo } from '../ui/PiLogo';
import { StatusIcon } from '../ui/StatusIcon';

interface ScanErrorScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export function ScanErrorScreen({ onNavigate }: ScanErrorScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <PiLogo size={48} />
        </div>

        <div className="flex justify-center">
          <StatusIcon type="error" size={64} />
        </div>

        <h2 className="text-2xl font-bold text-white">Scan Failed</h2>
        <p className="text-slate-400">
          We couldn't scan for agents. The scan may have timed out or been interrupted.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onNavigate('scanning')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Try Again
          </button>
          <button
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            + Add Manually
          </button>
        </div>
      </div>
    </div>
  );
}
