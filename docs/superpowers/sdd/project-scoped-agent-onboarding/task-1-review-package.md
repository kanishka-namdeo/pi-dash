# Sub-project B Task 1 Review Package

## Commits
```
167aac83 feat: extend Project type with projectAgents field
```

## Diff Stat
```
 renderer/src/types/project-setup.ts              | ~10 lines
 src/shared/project-setup-types.ts                | ~5 lines
 renderer/src/hooks/useProjectSetupState.ts       | ~10 lines
 renderer/src/types/__tests__/project-setup.test.ts | ~20 lines
 src/main/__tests__/project-manager.test.ts       | ~20 lines
 src/main/project-manager.ts                      | ~10 lines
 6 files changed
```

## Summary
Task 1 extends the Project and ProjectSetupState types to support project-scoped agents.

## Types Added
- `Project.projectAgents: AgentConfig[]` — agents specific to this project
- `ProjectSetupState.pendingAgents: AgentConfig[]` — agents selected but not yet scoped
- `ProjectSetupState.agentScopeChoice: 'global' | 'project' | null` — user's scoping choice

## Backward Compatibility
- `readProjectsFile()` maps existing projects to add `projectAgents: []` default
- Existing projects will work without migration

## Files Changed
- `renderer/src/types/project-setup.ts` — added projectAgents to Project, pendingAgents and agentScopeChoice to ProjectSetupState
- `src/shared/project-setup-types.ts` — mirrored Project type changes
- `renderer/src/hooks/useProjectSetupState.ts` — added new fields to initial state
- `renderer/src/types/__tests__/project-setup.test.ts` — added tests for new types
- `src/main/__tests__/project-manager.test.ts` — added tests for backward compatibility
- `src/main/project-manager.ts` — added backward compatibility mapping
