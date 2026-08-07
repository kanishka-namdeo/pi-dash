// src/main/notifications/notification-manager.ts

import { Notification, app } from 'electron';
import type { SettingsService } from '../settings/settings-service';

interface NotificationSettings {
  desktop: boolean;
  sound: boolean;
  badgeCount: boolean;
  agentStarted: boolean;
  agentCompleted: boolean;
  agentError: boolean;
  prReviewRequested: boolean;
  issueAssigned: boolean;
  prMerged: boolean;
  [key: string]: boolean;
}

export class NotificationManager {
  constructor(private settingsService: SettingsService) {}

  notifyAgentStarted(agentName: string): void {
    if (!this.isEnabled('agentStarted')) return;
    this.fire('Agent Started', `${agentName} has started`);
  }

  notifyAgentCompleted(agentName: string): void {
    if (!this.isEnabled('agentCompleted')) return;
    this.fire('Agent Completed', `${agentName} has finished its task`);
  }

  notifyAgentError(agentName: string, error: string): void {
    if (!this.isEnabled('agentError')) return;
    this.fire('Agent Error', `${agentName}: ${error}`);
  }

  notifyPRReviewRequested(repo: string, prNumber: number): void {
    if (!this.isEnabled('prReviewRequested')) return;
    this.fire('PR Review Requested', `Review requested on ${repo}#${prNumber}`);
  }

  notifyIssueAssigned(repo: string, issueNumber: number): void {
    if (!this.isEnabled('issueAssigned')) return;
    this.fire('Issue Assigned', `You were assigned to ${repo}#${issueNumber}`);
  }

  notifyPRMerged(repo: string, prNumber: number): void {
    if (!this.isEnabled('prMerged')) return;
    this.fire('PR Merged', `${repo}#${prNumber} has been merged`);
  }

  private isEnabled(key: string): boolean {
    const notifications = this.settingsService.get('notifications') as unknown as NotificationSettings;
    if (!notifications || !('desktop' in notifications)) return false;
    if (!notifications.desktop) return false;
    return notifications[key] ?? false;
  }

  private fire(title: string, body: string): void {
    const notifications = this.settingsService.get('notifications') as unknown as NotificationSettings;
    const silent = !(notifications?.sound ?? false);

    const notification = new Notification({
      title,
      body,
      silent,
    });
    notification.show();

    // Badge count (macOS only)
    if (notifications?.badgeCount && process.platform === 'darwin') {
      const current = app.getBadgeCount();
      app.setBadgeCount(current + 1);
    }
  }
}
