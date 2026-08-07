import { useSettingsContext } from '../../context/SettingsContext'
import { SectionCard } from './SectionCard'
import { SettingsRow, RowSeparator } from './SettingsRow'
import { KeyCap } from './KeyCap'
function ShortcutKeys({ accel }: { accel: string }) {
  const keys = accel.split('+').map(k => k.trim())
  return (
    <div className="flex gap-1.5">
      {keys.map((key, i) => (
        <KeyCap key={i} label={key} />
      ))}
    </div>
  )
}

export function KeyboardShortcutsSettings() {
  const { settings, isLoading } = useSettingsContext()

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
          <p className="text-sm text-[#888]">Customize keyboard shortcuts for quick actions</p>
        </div>
      </div>
    )
  }

  const { general, agents, navigation } = settings.keyboard

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
        <p className="text-sm text-[#888]">Customize keyboard shortcuts for quick actions</p>
      </div>

      <SectionCard title="GENERAL">
        <SettingsRow label="Open Settings">
          <ShortcutKeys accel={general.openSettings} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Toggle PiP Mode">
          <ShortcutKeys accel={general.togglePiP} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Close Window">
          <ShortcutKeys accel={general.closeWindow} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Quit Application">
          <ShortcutKeys accel={general.quitApp} />
        </SettingsRow>
      </SectionCard>

      <SectionCard title="AGENTS">
        <SettingsRow label="Launch Agent">
          <ShortcutKeys accel={agents.launchAgent} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Stop Agent">
          <ShortcutKeys accel={agents.stopAgent} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Next Agent">
          <ShortcutKeys accel={agents.nextAgent} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Previous Agent">
          <ShortcutKeys accel={agents.previousAgent} />
        </SettingsRow>
      </SectionCard>

      <SectionCard title="NAVIGATION">
        <SettingsRow label="Dashboard View">
          <ShortcutKeys accel={navigation.dashboardView} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Terminal View">
          <ShortcutKeys accel={navigation.terminalView} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Toggle Sidebar">
          <ShortcutKeys accel={navigation.toggleSidebar} />
        </SettingsRow>
      </SectionCard>
    </div>
  )
}
