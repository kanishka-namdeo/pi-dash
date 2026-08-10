# Sub-project C Task 2 Review Package

## Commits
```
7ab523ce feat: add resetOnboarding function
```

## Diff Stat
```
 src/main/agent-store.ts      | ~15 lines added
 src/main/agent-store.test.ts | ~10 lines added
 2 files modified
```

## Summary
Task 2 adds the resetOnboarding function that sets onboardingCompleted = false.

## Function Added
```typescript
export async function resetOnboarding(): Promise<void> {
  const userDataPath = process.env.PI_DASH_USER_DATA || app.getPath('userData');
  const storePath = path.join(userDataPath, STORE_FILE);
  const store = await loadAgents();
  store.onboardingCompleted = false;
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}
```

## Test Added
- Tests that resetOnboarding sets onboardingCompleted to false
- 5 tests total, all passing

## Files Modified
- `src/main/agent-store.ts` (~15 lines added)
- `src/main/agent-store.test.ts` (~10 lines added)
