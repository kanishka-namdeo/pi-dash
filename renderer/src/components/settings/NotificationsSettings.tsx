import { useSettingsContext } from '../../context/SettingsContext'
import { SectionCard } from './SectionCard'
import { SettingsRow, RowSeparator } from './SettingsRow'
import { Switch } from '../ui/switch'

export function NotificationsSettings() {
  const { settings, set, isLoading } = useSettingsContext()

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">Notifications Settings</h2>
          <p className="text-sm text-[#888]">Alert preferences and notification channels</p>
        </div>
      </div>
    )
  }

  const { notifications } = settings

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
        <p className="text-sm text-[#888]">Configure desktop and in-app notifications</p>
      </div>

      <SectionCard title="Agent Events">
        <SettingsRow label="Agent started" description="Notify when an agent session starts">
          <Switch checked={notifications.agentStarted} onCheckedChange={(v) => set('notifications.agentStarted', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Agent completed" description="Notify when an agent finishes its task">
          <Switch checked={notifications.agentCompleted} onCheckedChange={(v) => set('notifications.agentCompleted', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Agent error" description="Notify when an agent encounters an error">
          <Switch checked={notifications.agentError} onCheckedChange={(v) => set('notifications.agentError', v)} />
        </SettingsRow>
      </SectionCard>

      <SectionCard title="GitHub Events">
        <SettingsRow label="PR review requested" description="Notify when you are requested as a reviewer">
          <Switch checked={notifications.prReviewRequested} onCheckedChange={(v) => set('notifications.prReviewRequested', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Issue assigned" description="Notify when an issue is assigned to you">
          <Switch checked={notifications.issueAssigned} onCheckedChange={(v) => set('notifications.issueAssigned', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="PR merged" description="Notify when a PR is merged">
          <Switch checked={notifications.prMerged} onCheckedChange={(v) => set('notifications.prMerged', v)} />
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Notification Style">
        <SettingsRow label="Desktop notifications" description="Show system-level notifications">
          <Switch checked={notifications.desktop} onCheckedChange={(v) => set('notifications.desktop', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Notification sound" description="Play sound with notifications">
          <Switch checked={notifications.sound} onCheckedChange={(v) => set('notifications.sound', v)} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Show badge count" description="Display unread count on app icon">
          <Switch checked={notifications.badgeCount} onCheckedChange={(v) => set('notifications.badgeCount', v)} />
        </SettingsRow>
      </SectionCard>
    </div>
  )
}
