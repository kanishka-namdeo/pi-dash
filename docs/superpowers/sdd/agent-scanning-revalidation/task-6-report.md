# Task 6: Add Background Mode Tests

## Status: DONE

## Commit: ea18593a

## Summary

Added 6 comprehensive background mode tests to `renderer/src/hooks/useAgentScanner.test.ts`, bringing the background mode test count from 2 to 8 and total test count to 27 (all passing).

### Tests Added

1. **returns drift with only newAgents when all existing agents are still present** — verifies that when existing agents are all found in scan results, only new agents appear in drift report (missingAgents and movedAgents are empty).

2. **returns drift with only missingAgents when no new agents found** — verifies that when scan finds fewer agents than existing, missing agents are correctly categorized (with findAgentInPath returning not-found for all).

3. **returns empty drift when all agents match** — verifies no-drift scenario where scan results exactly match existing agents.

4. **handles empty existingAgents in background mode** — verifies edge case where existingAgents is empty; all scanned agents appear as newAgents.

5. **calls findAgentInPath for each missing agent** — verifies that findAgentInPath is called with the correct lowercase agent name for each agent not found in scan results.

6. **correctly categorizes mixed drift with new, missing, and moved agents** — verifies the full categorization logic: agents in scan but not existing → newAgents; agents in existing but not in scan and not found by findAgentInPath → missingAgents; agents in existing but not in scan but found by findAgentInPath → movedAgents (with correct newPath).

### Test Results

- Background mode tests: 8 (2 existing + 6 new)
- Total tests in file: 27
- All 27 tests passing

### Coverage

The background mode tests now cover:
- Drift with newAgents only
- Drift with missingAgents only
- Drift with movedAgents only (existing test)
- Mixed drift (all three categories)
- No drift (all agents match)
- Empty existingAgents edge case
- findAgentInPath invocation verification
- Mixed categorization with all three drift types

## Concerns

None.