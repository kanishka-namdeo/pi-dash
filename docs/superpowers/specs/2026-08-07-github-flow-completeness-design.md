# GitHub Integration Flow — Completeness & New Screens Design

**Date:** 2026-08-07
**Status:** Approved
**Design file:** `design/pidash-ui.pen` (GitHub Integration Flow frame)

## Summary

Evaluated the existing GitHub Integration Flow (10 screens) against 8 competitor products (WorktreeHQ, claude-code-pr-dashboard, Workstream, GitHub Agent HQ, Junco, gh-dashboard, Loom, WorktreeOS). Identified gaps in agent↔GitHub linking, CI visibility, review submission, issue creation, multi-repo support, agent session logs, rate limit management, and sync configuration.

Designed 8 new screens/variants to close the gaps, split into two tiers:

- **Tier 1** (core flow gaps): Agent Assignment Modal, PR Checks Panel, Review Composer, New Issue Screen
- **Tier 2** (competitive differentiators): Multi-Repo Overview, Agent Session Tab in PR, Rate Limit Warning, Sync Settings

## Existing Screens (baseline)

| # | Screen | Purpose |
|---|--------|---------|
| 1 | GitHub Settings — Connect | OAuth + PAT connect, feature pitch, security note |
| 2 | GitHub Settings (connected) | Account card, auth method, scopes, expiry, repos |
| 3 | Dashboard — GitHub Connected | Main dashboard with embedded GitHub Panel |
| 4 | GitHub Issues | Split view: issue list + detail panel with comments |
| 5 | Git Worktrees — GitHub | Worktree cards with metrics, branch info, assign |
| 6 | GitHub PRs | PR list with search, filter, New PR button |
| 7 | Pull Request Detail | Summary panel, review timeline, comments, Merge |
| 8 | GitHub Panel — States | Loading/empty/error/offline states |
| 9 | GitHub Auth Expired | Re-authenticate + PAT fallback |
| 10 | Worktree Conflict | Conflict error state |

## New Screens

### Screen 1: Agent Assignment Modal

**Purpose:** Connect a running agent session to a GitHub issue or PR. The core differentiator — bridges PiDash's agent world and GitHub world.

**Trigger:** "Assign Agent" button on issue rows, worktree cards, and PR rows.

**Layout:** Modal overlay (640px wide), centered, dimmed background.

**Components:**
- Header: issue/PR context (number, title, repo)
- Agent list: filtered to configured agents, each showing live status (idle / working / offline)
  - Busy agents show what they're working on
  - Offline agents shown dimmed with hollow dot
  - Selected agent gets indigo highlight + checkmark
- Worktree picker: create new branch-based worktree OR use existing
- Footer: Cancel (secondary) + Assign Agent (primary, disabled until both agent + worktree selected)

**Post-assignment effects:**
- Issue row gets agent avatar badge
- Worktree card gets issue number
- Agent session starts in the assigned worktree

### Screen 2: PR Checks Panel

**Purpose:** Replace the bare "passing" badge with detailed, expandable CI checks view.

**Location:** New section in PR Detail's SummaryPanel, between StatsRow and review timeline.

**Collapsed state (default):**
- Aggregate: passed/total count + total duration
- Expand chevron

**Expanded state:**
- Each check row: status icon (✓ pass / ✗ fail / ◌ pending), name, duration, workflow name
- Failed checks: `$accent-rose` icon + text
- Pending checks: animated spinner icon
- Footer: last run time, trigger, "View on GitHub" link

### Screen 3: Review Composer

**Purpose:** Add formal review submission (approve/request changes/comment) to PR Detail.

**Location:** Replaces the bottom comment composer area in PR Detail. Shown as a variant state of the existing PR Detail screen.

**Components:**
- Three radio-style tabs: Comment (default, grey), Approve (emerald), Request Changes (rose)
- Selected tab gets colored background pill
- Markdown textarea
- Submit button color changes based on selection
- Cancel returns to normal comment-only composer
- After submit: review appears in timeline with appropriate badge

### Screen 4: New Issue Screen

**Purpose:** Create a new GitHub issue without leaving PiDash.

**Trigger:** "+ New Issue" button in GitHub Issues header.

**Layout:** Full screen (1440×900), same header pattern as GitHub Issues.

**Components:**
- Title input: single line, 18px font
- Description: markdown editor with Write/Preview toggle
- Right sidebar metadata (2-column grid):
  - Labels: chips with × remove, + Add label picker
  - Assignees: avatar + name, + Add assignee picker
  - Milestone: dropdown
  - Projects: checkbox list
- Header: Draft button + Create Issue button (disabled until title filled)
- Repo chip in header for multi-repo context

### Screen 5: Multi-Repo Overview

**Purpose:** Dashboard view showing issues/PRs across all connected repos.

**Trigger:** Sidebar nav or repo chip dropdown → "All Repos".

**Layout:** Full screen (1440×900).

**Components:**
- Top nav: repo chip becomes dropdown, "All Repos" active tab
- 4 metric cards: Open Issues, PRs Needing Review, Active Agents, Repos Tracked
- Two-column list: Recent Issues (left) + Recent PRs (right)
  - Grouped by repo with repo name as section header
  - Each item: number, title, status dot, relative time
- Agent Activity feed at bottom: which agent is working on what, across all repos

### Screen 6: Agent Session Tab in PR Detail

**Purpose:** Show agent's terminal output and tool calls linked to a specific PR.

**Location:** New tab in PR Detail's right column, alongside Timeline and Files. Only visible when an agent is assigned to the PR.

**Components:**
- Session header: agent name + avatar, start time, branch, live status dot
- Tool call log: vertical collapsible list
  - Read: file path, duration, line count
  - Edit: file path, duration, +/− stats
  - Bash: command, duration, exit code, expandable output (monospace, dark bg)
  - Write: file path, duration, line count
  - Thinking: animated spinner
- Bottom actions: Pause Agent + Open Terminal (jumps to full PiP terminal)
- Auto-scrolls to latest activity

### Screen 7: Rate Limit Warning

**Purpose:** Show when GitHub API rate limits are approaching or exhausted.

**Two banner states:**

1. **Low warning (<500 remaining):**
   - Amber background, amber left border
   - Shows remaining count
   - "Configure" expands inline to polling interval slider
   - Dismissible

2. **Exhausted:**
   - Rose background, rose left border
   - Shows countdown to reset
   - Cached data still available (same pattern as offline state)

**Also adds API Usage row to GitHub Settings** (unified with Sync Settings below).

### Screen 8: Sync Settings

**Purpose:** Configure what data PiDash syncs from GitHub and how.

**Location:** New section in GitHub Settings right column, below repos card.

**Components:**
- **Repositories**: checkbox list of connected repos, each showing synced data types. "+ Add repository" opens search picker.
- **Sync mode**: two radio cards — Polling (default, interval dropdown: 15s/30s/60s/5m/15m) vs Webhooks (advanced, requires public URL).
- **Data types**: 2-column checkbox grid (Issues, PRs, Checks/CI, Discussions, Notifications, Projects). Unchecked items don't consume API quota.
- **API Usage**: progress bar (green → amber → rose), remaining/total count, reset countdown.
- **Cache**: toggle + clear button + last synced timestamp.

## Design Patterns

All new screens follow existing conventions from the design system:
- Dark theme with `$bg`, `$card`, `$border` tokens
- Lucide icons throughout
- Monospace for paths, branches, numbers
- Color-coded status: emerald (success/open), amber (warning/pending), rose (error/closed), indigo (accent/active), blue (info)
- Pill badges with dot indicators for status
- Card components with 8px corner radius, 1px border
- 1440×900 screen frames with 56px header bars

## Implementation Notes

- All 8 screens are additions to the existing `GitHub Integration Flow` frame in `design/pidash-ui.pen`
- Screens 2, 3, 6 are variants/extensions of existing screens (PR Detail), not standalone frames
- Screen 7 has both banner states (contextual overlays) and a settings section
- Screen 8 extends the existing GitHub Settings screen's right column
- The flow subtitle should be updated to: `settings → dashboard → issues → worktrees → pull request → multi-repo → new issue → sync`
