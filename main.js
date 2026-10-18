const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { walkDir, diffTrees, copyFiles } = require('./lib/backup');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

function throttled(fn, minIntervalMs) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= minIntervalMs) {
      last = now;
      fn(...args);
    }
  };
}

ipcMain.handle('backup:analyze', async (event, { sourcePath, targetPath }) => {
  const sendScanProgress = throttled((count) => {
    event.sender.send('backup:analyze-progress', { phase: 'scan', count });
  }, 80);

  const sourceFiles = await walkDir(sourcePath, sendScanProgress);
  event.sender.send('backup:analyze-progress', { phase: 'scan', count: sourceFiles.length });

  const sendCompareProgress = throttled((progress) => {
    event.sender.send('backup:analyze-progress', { phase: 'compare', ...progress });
  }, 80);

  const pending = await diffTrees(sourceFiles, targetPath, (progress) => {
    sendCompareProgress(progress);
    if (progress.done === progress.total) {
      event.sender.send('backup:analyze-progress', { phase: 'compare', ...progress });
    }
  });

  const totalSize = pending.reduce((sum, f) => sum + f.size, 0);
  return {
    files: pending.map((f) => ({ relPath: f.relPath, size: f.size, mtimeMs: f.mtimeMs })),
    totalSize,
    totalCount: pending.length,
  };
});

ipcMain.handle('backup:copy', async (event, { sourcePath, targetPath, files }) => {
  const pendingFiles = files.map((f) => ({
    ...f,
    absPath: path.join(sourcePath, f.relPath),
  }));

  const summary = await copyFiles(pendingFiles, sourcePath, targetPath, (progress) => {
    event.sender.send('backup:progress', progress);
  });

  return summary;
});
