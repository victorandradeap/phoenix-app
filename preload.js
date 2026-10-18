const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('phoenix', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  analyze: (sourcePath, targetPath) =>
    ipcRenderer.invoke('backup:analyze', { sourcePath, targetPath }),
  copyFiles: (sourcePath, targetPath, files) =>
    ipcRenderer.invoke('backup:copy', { sourcePath, targetPath, files }),
  onCopyProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('backup:progress', listener);
    return () => ipcRenderer.removeListener('backup:progress', listener);
  },
  onAnalyzeProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('backup:analyze-progress', listener);
    return () => ipcRenderer.removeListener('backup:analyze-progress', listener);
  },
});
