import { useSettingsContext } from '../../context/SettingsContext'
import { SectionCard } from './SectionCard'
import { SettingsRow, RowSeparator } from './SettingsRow'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Input } from '../ui/input'

export function TerminalSettings() {
  const { settings, set, isLoading } = useSettingsContext()

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">Terminal Settings</h2>
          <p className="text-sm text-[#888]">Terminal appearance and behavior</p>
        </div>
      </div>
    )
  }

  const terminal = settings.terminal

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Terminal Settings</h2>
        <p className="text-sm text-[#888]">Configure terminal appearance and behavior</p>
      </div>

      <SectionCard title="Shell">
        <SettingsRow label="Default shell" description="Shell used for new terminal sessions">
          <Select value={terminal.defaultShell} onValueChange={(v) => set('terminal.defaultShell', v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="/bin/bash">/bin/bash</SelectItem>
              <SelectItem value="/bin/zsh">/bin/zsh</SelectItem>
              <SelectItem value="/bin/fish">/bin/fish</SelectItem>
              <SelectItem value="powershell.exe">powershell.exe</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Shell arguments" description="Additional arguments passed to shell">
          <Input
            value={terminal.shellArgs}
            onChange={(e) => set('terminal.shellArgs', e.target.value)}
            className="w-[220px] font-mono text-sm bg-[#111] border-[#2a2a2a] text-white"
            placeholder="e.g. --login"
          />
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Appearance">
        <SettingsRow label="Font family" description="Terminal font face">
          <Select value={terminal.fontFamily} onValueChange={(v) => set('terminal.fontFamily', v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Geist Mono">Geist Mono</SelectItem>
              <SelectItem value="Fira Code">Fira Code</SelectItem>
              <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
              <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Font size" description="Terminal text size in pixels">
          <Select
            value={String(terminal.fontSize)}
            onValueChange={(v) => set('terminal.fontSize', parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12px</SelectItem>
              <SelectItem value="13">13px</SelectItem>
              <SelectItem value="14">14px</SelectItem>
              <SelectItem value="15">15px</SelectItem>
              <SelectItem value="16">16px</SelectItem>
              <SelectItem value="18">18px</SelectItem>
              <SelectItem value="20">20px</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Terminal theme" description="Color scheme for terminal">
          <Select value={terminal.theme} onValueChange={(v) => set('terminal.theme', v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="solarized">Solarized</SelectItem>
              <SelectItem value="monokai">Monokai</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Behavior">
        <SettingsRow label="Scrollback lines" description="Number of lines to keep in history">
          <Select
            value={String(terminal.scrollbackLines)}
            onValueChange={(v) => set('terminal.scrollbackLines', parseInt(v, 10))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1000">1,000</SelectItem>
              <SelectItem value="5000">5,000</SelectItem>
              <SelectItem value="10000">10,000</SelectItem>
              <SelectItem value="50000">50,000</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Cursor style" description="Terminal cursor appearance">
          <Select value={terminal.cursorStyle} onValueChange={(v) => set('terminal.cursorStyle', v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="block">Block</SelectItem>
              <SelectItem value="underline">Underline</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Copy on select" description="Automatically copy selected text">
          <Switch
            checked={terminal.copyOnSelect}
            onCheckedChange={(v) => set('terminal.copyOnSelect', v)}
          />
        </SettingsRow>
      </SectionCard>
    </div>
  )
}
