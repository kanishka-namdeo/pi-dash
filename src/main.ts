import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './main/ipc-handlers'
import { SessionManager } from './main/session/session-manager'
import { registerSessionHandlers } from './main/ipc/session-handlers'

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

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  }
}
app.whenReady().then(() => {
  registerIpcHandlers()
  registerSessionHandlers(sessionManager)
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
