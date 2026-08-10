# Sub-project C, Task 1: Add ExportedConfig Type

## Status
**DONE**

## Commit
`e99471d0` — `feat: add ExportedConfig type`

## Files Changed
- `src/shared/types.ts` — Added `ExportedConfig` interface and `import type { Project }` from `./project-setup-types`.

## Interface Added
```typescript
export interface ExportedConfig {
  version: 1;
  exportedAt: string;
  agents: AgentsStore;
  projects: Project[];
}
```

## Verification
- TypeScript type check passes for the changed file (pre-existing errors in unrelated test files remain).
- No circular dependency issues — `project-setup-types.ts` already imports from `types.ts`, and the new `import type` is a type-only import which is erased at compile time.

## Concerns
None.
