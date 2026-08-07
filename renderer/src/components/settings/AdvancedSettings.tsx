import { useState } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { SectionCard } from './SectionCard';
import { SettingsRow, RowSeparator } from './SettingsRow';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export function AdvancedSettings() {
  const { settings, set, reset, isLoading } = useSettingsContext();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">Advanced</h2>
          <p className="text-sm text-[#888]">Developer options and data management</p>
        </div>
      </div>
    );
  }

  const advanced = settings.advanced;

  const handleExport = async () => {
    if (window.api?.settings?.export) {
      await window.api.settings.export();
    }
  };

  const handleImport = async () => {
    // Placeholder: no file picker IPC yet
  };

  const handleOpenConfig = () => {
    // Placeholder: no IPC yet
  };

  const handleClearCache = () => {
    // Placeholder: no IPC yet
  };

  const handleReset = async () => {
    if (showResetConfirm) {
      await reset();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
    }
  };

  const handleClearAllData = async () => {
    if (showClearDataConfirm) {
      // Placeholder: no IPC yet
      setShowClearDataConfirm(false);
    } else {
      setShowClearDataConfirm(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Advanced</h2>
        <p className="text-sm text-[#888]">Developer options and data management</p>
      </div>

      <SectionCard title="Developer">
        <SettingsRow label="Developer mode" description="Enable advanced debugging features">
          <Switch
            checked={advanced.developerMode}
            onCheckedChange={(v) => set('advanced.developerMode', v)}
          />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Log level" description="Verbosity of application logs">
          <Select
            value={advanced.logLevel}
            onValueChange={(v) => set('advanced.logLevel', v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Configuration file" description="Open config file in default editor">
          <Button variant="outline" onClick={handleOpenConfig}>
            Open
          </Button>
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Data Management">
        <SettingsRow label="Export settings" description="Export all settings to a file">
          <Button variant="outline" onClick={handleExport}>
            Export
          </Button>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Import settings" description="Import settings from a file">
          <Button variant="outline" onClick={handleImport}>
            Import
          </Button>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Cache size" description="Current cache usage: 24.5 MB">
          <Button variant="outline" onClick={handleClearCache}>
            Clear cache
          </Button>
        </SettingsRow>
      </SectionCard>

      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-semibold tracking-wide text-[#f43f5e] uppercase">
          Danger Zone
        </span>
        <div className="flex flex-col rounded-lg bg-[#1a1a1a] border border-[#f43f5e] p-4 px-5">
          <SettingsRow label="Reset all settings" description="Restore all settings to default values">
            <Button
              variant="outline"
              className="border-[#f43f5e] text-[#f43f5e] hover:bg-[#f43f5e]/10 hover:text-[#f43f5e]"
              onClick={handleReset}
            >
              {showResetConfirm ? 'Confirm Reset' : 'Reset'}
            </Button>
          </SettingsRow>
          <RowSeparator />
          <SettingsRow label="Clear all data" description="Delete all local data including agents and sessions">
            <Button
              variant="outline"
              className="border-[#f43f5e] text-[#f43f5e] hover:bg-[#f43f5e]/10 hover:text-[#f43f5e]"
              onClick={handleClearAllData}
            >
              {showClearDataConfirm ? 'Confirm Clear' : 'Clear all data'}
            </Button>
          </SettingsRow>
        </div>
      </div>
    </div>
  );
}
