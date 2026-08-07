import { Search, Zap, Activity } from 'lucide-react';
import { PiLogo } from '../ui/PiLogo';
import { IconBox } from '../ui/IconBox';

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void;
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <PiLogo size={80} />
          </div>
          <h1 className="text-4xl font-bold text-white">Welcome to PiDash</h1>
          <p className="text-lg text-slate-400">
            Your unified dashboard for AI coding agents
          </p>
        </div>

        {/* Feature highlights — vertical stack */}
        <div className="space-y-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
            <IconBox icon={Search} bgColor="#3b82f622" iconColor="#3b82f6" size={40} />
            <div>
              <h3 className="text-white font-semibold">Auto-detect agents</h3>
              <p className="text-sm text-slate-400">
                We'll scan your system for installed AI coding assistants
              </p>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
            <IconBox icon={Zap} bgColor="#10b98122" iconColor="#10b981" size={40} />
            <div>
              <h3 className="text-white font-semibold">One-click launch</h3>
              <p className="text-sm text-slate-400">
                Start any agent from your dashboard with a single click
              </p>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start gap-4">
            <IconBox icon={Activity} bgColor="#8b5cf622" iconColor="#8b5cf6" size={40} />
            <div>
              <h3 className="text-white font-semibold">Live activity</h3>
              <p className="text-sm text-slate-400">
                Monitor what your agents are doing in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('scanning')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Get started with agent detection"
          >
            Get Started
          </button>
          <button
            onClick={() => onNavigate('manual-add')}
            className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Skip detection and add agents manually"
          >
            Skip — I'll add agents manually
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-center text-slate-500">
          We only detect locally installed agents — nothing leaves your device.
        </p>
      </div>
    </div>
  );
}
