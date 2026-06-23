const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aether', {
  spawnPty: (shell, cols, rows) => ipcRenderer.invoke('pty.spawn', shell, cols, rows),
  onPtyData: (id, cb) => ipcRenderer.on(`pty.data.${id}`, (e, d) => cb(d)),
  onPtyExit: (id, cb) => ipcRenderer.on(`pty.exit.${id}`, (e) => cb()),
  writePty: (id, data) => ipcRenderer.send('pty.write', id, data),
  resizePty: (id, cols, rows) => ipcRenderer.send('pty.resize', id, cols, rows),
  killPty: (id) => ipcRenderer.send('pty.kill', id),
  fs: {
    readdir: (dir) => ipcRenderer.invoke('fs.readdir', dir),
    readFile: (file) => ipcRenderer.invoke('fs.readFile', file)
  },
  sys: {
    openPath: (p) => ipcRenderer.invoke('sys.openPath', p),
    openExternal: (url) => ipcRenderer.invoke('sys.openExternal', url),
    exec: (cmd, args) => ipcRenderer.invoke('sys.exec', cmd, args),
    scanGames: () => ipcRenderer.invoke('sys.scanGames'),
    launchGame: (entry) => ipcRenderer.invoke('sys.launchGame', entry),
    openFolder: (folder) => ipcRenderer.invoke('sys.openFolder', folder)
  }
});
