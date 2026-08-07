import { useSettingsContext } from '../../context/SettingsContext'
import { SectionCard } from './SectionCard'
import { SettingsRow, RowSeparator } from './SettingsRow'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'

export function GeneralSettings() {
  const { settings, set, isLoading } = useSettingsContext()

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">General Settings</h2>
          <p className="text-sm text-[#888]">Application-wide preferences and behavior</p>
        </div>
      </div>
    )
  }

  const { general } = settings

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">General Settings</h2>
        <p className="text-sm text-[#888]">Application-wide preferences and behavior</p>
      </div>

      <SectionCard title="Appearance">
        <SettingsRow label="Theme" description="Choose light or dark mode">
          <Select value={general.theme} onValueChange={(v) => set('general.theme', v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Language" description="Display language">
          <Select value={general.language} onValueChange={(v) => set('general.language', v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Font Size" description="UI text scaling">
          <Select value={general.fontSize} onValueChange={(v) => set('general.fontSize', v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Startup">
        <SettingsRow label="Launch on boot" description="Start PiDash when your computer starts">
          <Switch checked={general.launchOnBoot} onCheckedChange={(v) => set('general.launchOnBoot', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Restore last session" description="Reopen agents from your last session">
          <Switch checked={general.restoreSession} onCheckedChange={(v) => set('general.restoreSession', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Minimize to tray" description="Close to system tray instead of exiting">
          <Switch checked={general.minimizeToTray} onCheckedChange={(v) => set('general.minimizeToTray', v)} />
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Agents">
        <SettingsRow label="Default working directory" description="Where new agents start">
          <Select value={general.defaultWorkingDirectory} onValueChange={(v) => set('general.defaultWorkingDirectory', v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="~/projects">~/projects</SelectItem>
              <SelectItem value="~/Desktop">~/Desktop</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Auto-detect on launch" description="Scan for new agents when app starts">
          <Switch checked={general.autoDetectOnLaunch} onCheckedChange={(v) => set('general.autoDetectOnLaunch', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Max concurrent agents" description="Limit how many agents run at once">
          <Select
            value={String(general.maxConcurrentAgents)}
            onValueChange={(v) => set('general.maxConcurrentAgents', Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="8">8</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="16">16</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SectionCard>
    </div>
  )
}
