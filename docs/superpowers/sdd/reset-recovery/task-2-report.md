# Task 2: Add resetOnboarding Function

## Status
DONE

## Commit
`7ab523ce` — feat: add resetOnboarding function

## Files Modified
- `src/main/agent-store.ts` — added `resetOnboarding()` function
- `src/main/agent-store.test.ts` — added import + test case

## Implementation
`resetOnboarding()` mirrors the pattern established by `completeOnboarding()`:
1. Resolves the store path via `PI_DASH_USER_DATA` or `app.getPath('userData')`
2. Loads the current store
3. Sets `onboardingCompleted = false`
4. Ensures the parent directory exists
5. Writes the updated store back as formatted JSON

## Test Summary
All 5 tests pass (1 new):
- returns empty store when file does not exist
- saves and loads agents
- marks onboarding as completed
- creates parent directory if missing
- **resets onboarding flag** (new) — completes onboarding, verifies `true`, resets, verifies `false`

## Concerns
None.
