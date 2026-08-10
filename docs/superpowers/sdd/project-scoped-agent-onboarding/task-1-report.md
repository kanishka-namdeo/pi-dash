# Task 1: Extend Project and ProjectSetupState Types

**Status:** DONE

**Commit:** `a2395294`

## Files Changed

| File | Change |
|------|--------|
| `renderer/src/types/project-setup.ts` | Added `import AgentConfig`; added `projectAgents: AgentConfig[]` to `Project`; added `pendingAgents: AgentConfig[]` and `agentScopeChoice: 'global' \| 'project' \| null` to `ProjectSetupState` |
| `src/shared/project-setup-types.ts` | Added `import AgentConfig`; added `projectAgents: AgentConfig[]` to `Project` |
| `renderer/src/hooks/useProjectSetupState.ts` | Added `pendingAgents: []` and `agentScopeChoice: null` to `getInitialState()`; added `projectAgents: []` to `addProject()` call in `complete()` |
| `renderer/src/types/__tests__/project-setup.test.ts` | Added `projectAgents: []` to test `Project` object |
| `src/main/__tests__/project-manager.test.ts` | Added `projectAgents: []` to all 6 test `Project` objects |
| `src/main/project-manager.ts` | Added backward-compat migration in `readProjectsFile()` — existing projects without `projectAgents` get `[]` default |

## Concerns

None. All new fields have backward-compatible defaults. TypeScript compilation passes for the changed files (pre-existing errors in unrelated files remain unchanged).


---

**Fix commit:** `a2395294` (amended)


| Finding | Severity | Resolution |
|---------|----------|------------|
| Stray `task10_app.tsx` in commit | P2 | Removed from repo |
| No test for backward compat migration | P2 | Added test `'adds projectAgents: [] to legacy projects without the field'` — writes legacy JSON, verifies `getProjects()` returns `projectAgents: []` |
| Unrelated docs in commit | P3 | Unstaged `agent-scanning-revalidation/` docs; only Task 1 files committed |

**Additional fix:** Created `src/main/logger.ts` (was missing, blocking tests). Added `vi.mock('../logger')` to test file.

**Test results:** All 7 project-manager tests pass.