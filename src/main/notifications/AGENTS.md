# src/main/notifications/

## Purpose

Desktop notification management for agent events, GitHub activity, and system alerts. Respects per-category notification settings and manages macOS badge count.

## Ownership

Owned by the Electron main process domain. All notification logic lives here.

## Local Contracts

- **NotificationManager** (`notification-manager.ts`): Electron desktop notifications for agent events, PR reviews, issue assignments. Respects settings per-category. Manages badge count on macOS.

## Work Guidance

- Notifications use Electron's Notification API
- Per-category settings control which notifications are shown
- Badge count is updated on macOS for unread items
- Notifications are triggered from main process events

## Verification

- `pnpm build:ts` must compile cleanly
- Notifications must appear when triggered and enabled in settings

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
