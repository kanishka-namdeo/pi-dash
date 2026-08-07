import { app, BrowserWindow, Menu, Tray } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './main/ipc-handlers'
import { SessionManager } from './main/session/session-manager'
import { registerSessionHandlers } from './main/ipc/session-handlers'
import { registerGitHubAuthHandlers } from './main/ipc/github-auth-handlers'
import { registerGitHubRepoHandlers } from './main/ipc/github-repo-handlers'
import { registerGitHubDataHandlers } from './main/ipc/github-data-handlers'
import { registerAgentGitHubHandlers } from './main/ipc/agent-github-handlers'
import { registerGitHubIssuesHandlers } from './main/ipc/github-issues-handlers'
import { registerGitHubPRsHandlers } from './main/ipc/github-prs-handlers'
import { SettingsService } from './main/settings/settings-service'
import { KeyboardShortcutManager } from './main/keyboard/keyboard-shortcut-manager'
import { NotificationManager } from './main/notifications/notification-manager'
import { registerSettingsHandlers } from './main/ipc/settings-handlers'

let tray: Tray | null = null
let settingsService: SettingsService

const isDev = !app.isPackaged

const sessionManager = new SessionManager()

Menu.setApplicationMenu(null)

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('close', (event) => {
    const minimizeToTray = settingsService.get('general.minimizeToTray') as boolean
    if (minimizeToTray && tray) {
      event.preventDefault()
      win.hide()
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  registerSettingsHandlers()
  registerSessionHandlers(sessionManager)
  registerGitHubAuthHandlers()
  registerGitHubRepoHandlers()
  registerGitHubDataHandlers()
  registerAgentGitHubHandlers()
  registerGitHubIssuesHandlers()
  registerGitHubPRsHandlers()
  settingsService = new SettingsService()
  const shortcutManager = new KeyboardShortcutManager(settingsService)
  shortcutManager.register()
  const notificationManager = new NotificationManager(settingsService)
  void notificationManager

  // Apply launchOnBoot setting
  const launchOnBoot = settingsService.get('general.launchOnBoot') as boolean
  app.setLoginItemSettings({ openAtLogin: launchOnBoot })

  // Apply minimizeToTray setting
  const minimizeToTray = settingsService.get('general.minimizeToTray') as boolean
  if (minimizeToTray) {
    tray = new Tray(path.join(__dirname, '..', 'renderer', 'public', 'icon.png'))
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click: () => BrowserWindow.getAllWindows()[0]?.show() },
      { label: 'Quit', click: () => app.quit() },
    ])
    tray.setToolTip('PiDash')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => BrowserWindow.getAllWindows()[0]?.show())
  }

  createWindow()
})

app.on('before-quit', () => {
  sessionManager.destroyAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
