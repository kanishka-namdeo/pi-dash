import { useSettingsContext } from '../../context/SettingsContext'
import { useGitHubAuth } from '../../hooks/useGitHubAuth'
import { SectionCard } from './SectionCard'
import { SettingsRow, RowSeparator } from './SettingsRow'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { useState } from 'react'

export function GitHubSettings() {
  const { settings, set, isLoading } = useSettingsContext()
  const { isAuthenticated } = useGitHubAuth()

  // UI-only state for fields not in settings schema
  const [defaultBranch, setDefaultBranch] = useState('main')
  const [autoFetch, setAutoFetch] = useState(false)
  const [fetchInterval, setFetchInterval] = useState('5')

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">GitHub Integration</h2>
          <p className="text-sm text-[#888]">Manage GitHub authentication and repository settings</p>
        </div>
      </div>
    )
  }

  const { github } = settings

  const tokenStatus = isAuthenticated ? 'Valid' : 'Not connected'
  const tokenVariant = isAuthenticated ? 'default' : 'secondary'
  const tokenColor = isAuthenticated
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : 'bg-[#2a2a2a] text-[#888] border-[#3a3a3a]'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">GitHub Integration</h2>
        <p className="text-sm text-[#888]">Manage GitHub authentication and repository settings</p>
      </div>

      <SectionCard title="Authentication">
        <SettingsRow label="Authentication method" description="How to authenticate with GitHub">
          <Select
            value={github.authMethod}
            onValueChange={(v) => set('github.authMethod', v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pat">Personal Access Token</SelectItem>
              <SelectItem value="oauth">OAuth</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Token status" description="Current authentication status">
          <Badge variant={tokenVariant} className={tokenColor}>
            {tokenStatus}
          </Badge>
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Repositories">
        <SettingsRow label="Default branch" description="Branch to use when creating worktrees">
          <Select value={defaultBranch} onValueChange={setDefaultBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">main</SelectItem>
              <SelectItem value="master">master</SelectItem>
              <SelectItem value="develop">develop</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Auto-fetch updates" description="Automatically fetch from remote repositories">
          <Switch checked={autoFetch} onCheckedChange={setAutoFetch} />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Fetch interval" description="How often to check for updates">
          <Select value={fetchInterval} onValueChange={setFetchInterval}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 minute</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Pull Requests & Issues">
        <SettingsRow label="Auto-create worktree on assignment" description="Create worktree when assigned to an issue">
          <Switch
            checked={github.autoCreateWorktree}
            onCheckedChange={(v) => set('github.autoCreateWorktree', v)}
          />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Default PR template" description="Template for new pull requests">
          <Select
            value={github.defaultPRTemplate}
            onValueChange={(v) => set('github.defaultPRTemplate', v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Auto-link commits to issues" description="Automatically reference issues in commit messages">
          <Switch
            checked={github.autoLinkCommits}
            onCheckedChange={(v) => set('github.autoLinkCommits', v)}
          />
        </SettingsRow>
      </SectionCard>
    </div>
  )
}
