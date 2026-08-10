# Sub-project B Task 5 Review Package

## Commits
```
33282d13 feat: detect new agents in SelectAgentsScreen and show scope dialog
```

## Diff Stat
```
 renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx | ~60 lines changed
 1 file modified
```

## Summary
Task 5 updates SelectAgentsScreen to detect new agents (not in global config) and show the AgentScopeDialog to let users choose between adding to global or project-only.

## Changes Made
- Added imports for AgentScopeDialog, findNewAgents, and AgentConfig
- Added state for globalAgents and showScopeDialog
- Added useEffect to load global agents on mount
- Computed newAgents using findNewAgents utility
- Updated handleContinue to check for new agents and show scope dialog
- Added handleAddToGlobal and handleAddToProject handlers
- Added "🆕" badge next to new agents in the list
- Added AgentScopeDialog component at the end

## Integration Points
- Uses findNewAgents from Task 2
- Uses AgentScopeDialog from Task 3
- Uses setPendingAgents, setAgentScopeChoice, complete from Task 4

## Files Modified
- `renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx` (~60 lines changed)
