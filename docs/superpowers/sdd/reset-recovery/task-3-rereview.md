# Task 3 Re-review: onboardingCompleted restoration fix

## Fix verification: ADDRESSED

Commit `4af62b10` adds the missing restoration logic inside the `import-config` IPC handler in `src/main/ipc-handlers.ts` (lines 101-106), immediately after `saveAgents(config.agents.agents)`.

Checks:

1. **Post-saveAgents placement** ✓ — The new block runs after `saveAgents(config.agents.agents)` and before the projects file write, matching the natural position for state restoration.
2. **Boolean guard on the imported value** ✓ — Line 97 already validates `typeof config.agents.onboardingCompleted !== 'boolean'` and throws `INVALID_ONBOARDING`, so the branch condition is guaranteed to receive a real boolean (no coercion surprises from a malformed JSON payload).
3. **True path calls `completeOnboarding()`** ✓ — `await completeOnboarding();` (line 103).
4. **False path calls `resetOnboarding()`** ✓ — `await resetOnboarding();` (line 105).
5. **Imports are in place** ✓ — `completeOnboarding` and `resetOnboarding` are imported from `./agent-store` at line 5 of the file; both functions are already used by other handlers (`complete-onboarding` at line 32-34, `full-reset` at line 130), so the symbols are real and the call shape matches existing usage.
6. **`await` used consistently** ✓ — Both calls are awaited, matching the surrounding handler style (every other store call in the block is awaited).

## New breakage: NONE

- No new imports, no new types, no signature changes.
- Ordering is safe: `saveAgents` writes the agent list first, then onboarding state is reconciled, then `projects.json` is written. If `completeOnboarding`/`resetOnboarding` throws, the handler rejects before the return, and the partially-written state (agents saved, projects not yet written) is the same class of partial-failure the handler already had — the fix does not introduce a new failure mode.
- The boolean pre-check at line 97 means the `if` branch is exhaustive; no fall-through or silent no-op.
- No other call sites were modified; the rest of `ipc-handlers.ts` is untouched.

## Verdict: APPROVED

The P1 finding from the original Task 3 review is cleanly resolved with a minimal, well-placed patch. No new issues introduced.
