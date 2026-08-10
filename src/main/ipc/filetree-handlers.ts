import { ipcMain, shell, clipboard } from 'electron';
import fs from 'fs';
import path from 'path';
import { getGitStatus, getDiffStats } from '../git-operations';
import type { FileEntry, FileContentResult, GitStatusEntry } from '../../shared/filetree-types';

const MAX_ENTRIES = 256;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function registerFiletreeHandlers(): void {
  ipcMain.handle('filetree:listDir', async (_event, { path: dirPath }: { path: string }): Promise<{ entries: FileEntry[] }> => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) {
          return a.isDirectory() ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      const result: FileEntry[] = [];
      let count = 0;

      for (const entry of entries) {
        if (count >= MAX_ENTRIES) break;
        
        result.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: path.join(dirPath, entry.name),
          hasChildren: entry.isDirectory(),
        });
        count++;
      }

      if (entries.length > MAX_ENTRIES) {
        result.push({
          name: `${entries.length - MAX_ENTRIES}+ more entries`,
          type: 'file',
          path: '',
          hasChildren: false,
        });
      }

      return { entries: result };
    } catch (error) {
      console.error('filetree:listDir error:', error);
      throw error;
    }
  });

  ipcMain.handle('filetree:getGitStatus', async (_event, { repoPath }: { repoPath: string }): Promise<{ status: Record<string, GitStatusEntry> }> => {
    try {
      const status = await getGitStatus(repoPath);
      const diffStats = await getDiffStats(repoPath);

      const merged: Record<string, GitStatusEntry> = {};
      
      for (const [key, value] of Object.entries(status)) {
        merged[key] = value;
      }
      
      for (const [key, value] of Object.entries(diffStats)) {
        if (merged[key]) {
          merged[key].additions = value.additions;
          merged[key].deletions = value.deletions;
          merged[key].untrackedCount = value.untrackedCount;
        } else {
          merged[key] = value;
        }
      }

      return { status: merged };
    } catch (error) {
      console.error('filetree:getGitStatus error:', error);
      return { status: {} };
    }
  });

  ipcMain.handle('filetree:getFileContent', async (_event, { path: filePath }: { path: string }): Promise<FileContentResult> => {
    try {
      const stats = await fs.promises.stat(filePath);
      
      if (stats.size > MAX_FILE_SIZE) {
        return { content: '', size: stats.size, isBinary: true };
      }

      const buffer = await fs.promises.readFile(filePath);
      
      let isBinary = false;
      for (let i = 0; i < Math.min(8192, buffer.length); i++) {
        if (buffer[i] === 0) {
          isBinary = true;
          break;
        }
      }

      return {
        content: isBinary ? '' : buffer.toString('utf-8'),
        size: stats.size,
        isBinary,
      };
    } catch (error) {
      console.error('filetree:getFileContent error:', error);
      throw error;
    }
  });

  ipcMain.handle('filetree:copyPath', async (_event, { path: filePath, relative = false }: { path: string; relative?: boolean }): Promise<{ success: boolean }> => {
    try {
      const text = relative ? filePath.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', '') : filePath;
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('filetree:copyPath error:', error);
      return { success: false };
    }
  });

  ipcMain.handle('filetree:getActiveFiles', async (_event, { projectPath, agentCwds }: { projectPath: string; agentCwds: string[] }): Promise<{ files: Array<{ path: string; relativePath: string; modifiedAt: number }> }> => {
    try {
      const now = Date.now();
      const threshold = 30000; // 30 seconds
      const result: Array<{ path: string; relativePath: string; modifiedAt: number }> = [];

      const dirsToScan = agentCwds.length > 0 ? agentCwds : [projectPath];

      for (const dir of dirsToScan) {
        try {
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile() && !entry.name.startsWith('.')) {
              const fullPath = path.join(dir, entry.name);
              const stats = await fs.promises.stat(fullPath);
              if (now - stats.mtimeMs < threshold) {
                const relPath = fullPath.replace(projectPath + '/', '').replace(projectPath + '\\', '');
                result.push({ path: fullPath, relativePath: relPath, modifiedAt: stats.mtimeMs });
              }
            }
          }
        } catch {
          // Skip directories that don't exist (agent CWD may be invalid)
        }
      }

      // Sort by modification time, most recent first
      result.sort((a, b) => b.modifiedAt - a.modifiedAt);
      return { files: result.slice(0, 10) }; // Cap at 10 active files
    } catch (error) {
      console.error('filetree:getActiveFiles error:', error);
      return { files: [] };
    }
  });

  ipcMain.handle('filetree:revealInFileManager', async (_event, { path: filePath }: { path: string }): Promise<{ success: boolean }> => {
    try {
      if (process.platform === 'win32') {
        shell.showItemInFolder(filePath);
      } else {
        shell.openPath(filePath);
      }
      return { success: true };
    } catch (error) {
      console.error('filetree:revealInFileManager error:', error);
      return { success: false };
    }
  });

  ipcMain.handle('filetree:openInTerminal', async (_event, { path: dirPath }: { path: string }): Promise<{ success: boolean }> => {
    try {
      shell.openPath(dirPath);
      return { success: true };
    } catch (error) {
      console.error('filetree:openInTerminal error:', error);
      return { success: false };
    }
  });
}