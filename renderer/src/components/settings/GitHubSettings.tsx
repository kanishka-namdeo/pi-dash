import { useSettingsContext } from '../../context/SettingsContext'
import { useGitHubAuth } from '../../hooks/useGitHubAuth'
import { SectionCard } from './SectionCard'
import { SettingsRow, RowSeparator } from './SettingsRow'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'

export function GitHubSettings() {
  const { settings, set, isLoading } = useSettingsContext()
  const { isAuthenticated } = useGitHubAuth()


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


    </div>
  )
}
