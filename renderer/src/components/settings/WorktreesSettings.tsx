import { useSettingsContext } from '../../context/SettingsContext'
import { SectionCard } from './SectionCard'
import { SettingsRow, RowSeparator } from './SettingsRow'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Input } from '../ui/input'

const BRANCH_NAMING_PATTERNS = ['issue-{number}', 'branch-{name}', 'custom-{id}'] as const
const MAX_CONCURRENT_OPTIONS = [5, 10, 15, 20] as const

export function WorktreesSettings() {
  const { settings, set, isLoading } = useSettingsContext()

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">Worktrees</h2>
          <p className="text-sm text-[#888]">Configure git worktree management and behavior</p>
        </div>
      </div>
    )
  }

  const { worktrees } = settings

  const handleBrowse = async () => {
    const dir = await window.api.openDirectory()
    if (dir) {
      await set('worktrees.directory', dir)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white">Worktrees</h2>
        <p className="text-sm text-[#888]">Configure git worktree management and behavior</p>
      </div>

      <SectionCard title="Location">
        <SettingsRow label="Worktree directory" description="Where to create new worktrees">
          <div className="flex items-center gap-2">
            <Input
              value={worktrees.directory}
              onChange={(e) => set('worktrees.directory', e.target.value)}
              className="w-[320px] font-mono text-sm"
              placeholder="/path/to/worktrees"
            />
            <button
              onClick={handleBrowse}
              className="rounded-md bg-[#2a2a2a] px-3 py-2 text-sm text-white hover:bg-[#333] border border-[#3a3a3a]"
              type="button"
            >
              Browse
            </button>
          </div>
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Behavior">
        <SettingsRow label="Auto-cleanup merged worktrees" description="Remove worktrees after PR is merged">
          <Switch
            checked={worktrees.autoCleanup}
            onCheckedChange={(v) => set('worktrees.autoCleanup', v)}
          />
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Branch naming pattern" description="Pattern for auto-generated branch names">
          <Select
            value={worktrees.branchNamingPattern}
            onValueChange={(v) => set('worktrees.branchNamingPattern', v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCH_NAMING_PATTERNS.map((pattern) => (
                <SelectItem key={pattern} value={pattern}>
                  {pattern}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <RowSeparator />
        <SettingsRow label="Max concurrent worktrees" description="Limit number of active worktrees">
          <Select
            value={String(worktrees.maxConcurrent)}
            onValueChange={(v) => set('worktrees.maxConcurrent', Number(v))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAX_CONCURRENT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SectionCard>
    </div>
  )
}
