const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const pty = require('node-pty');
const fs = require('fs');
const child_process = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: false,
    vibrancy: 'ultra-dark'
  });

  mainWindow.loadFile(path.join(__dirname, 'docs', 'desktop.html'));
  mainWindow.once('ready-to-show', () => { mainWindow.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });

/* PTY */
ipcMain.handle('pty.spawn', (event, shellPath, cols, rows) => {
  const sh = shellPath || (process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash');
  const env = Object.assign({}, process.env);
  const term = pty.spawn(sh, [], {
    name: 'xterm-color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: process.cwd(),
    env
  });

  const id = Date.now().toString() + Math.floor(Math.random()*1000);
  if (!mainWindow._terms) mainWindow._terms = {};
  mainWindow._terms[id] = term;

  term.onData(data => {
    mainWindow.webContents.send(`pty.data.${id}`, data);
  });

  term.onExit(() => {
    mainWindow.webContents.send(`pty.exit.${id}`);
  });

  return { id };
});

ipcMain.on('pty.write', (event, id, data) => {
  const term = mainWindow._terms && mainWindow._terms[id];
  if (term) term.write(data);
});

ipcMain.on('pty.resize', (event, id, cols, rows) => {
  const term = mainWindow._terms && mainWindow._terms[id];
  if (term) term.resize(cols, rows);
});

ipcMain.on('pty.kill', (event, id) => {
  const term = mainWindow._terms && mainWindow._terms[id];
  if (term) {
    try { term.kill(); } catch (e) {}
    delete mainWindow._terms[id];
  }
});

/* FS helpers */
ipcMain.handle('fs.readdir', async (event, dir) => {
  try { const files = await fs.promises.readdir(dir, { withFileTypes: true }); return files.map(f => ({ name: f.name, isDirectory: f.isDirectory() })); }
  catch (e) { return { error: e.message }; }
});
ipcMain.handle('fs.readFile', async (event, filePath) => {
  try { const content = await fs.promises.readFile(filePath, { encoding: 'utf8' }); return { content }; }
  catch (e) { return { error: e.message }; }
});

/* System helpers: open path / external */
ipcMain.handle('sys.openPath', async (event, p) => { try { return await shell.openPath(p); } catch(e) { return { error: e.message }; } });
ipcMain.handle('sys.openExternal', async (event, url) => { try { return await shell.openExternal(url); } catch(e) { return { error: e.message }; } });

ipcMain.handle('sys.exec', async (event, command, args = []) => {
  try {
    const child = child_process.spawn(command, args, { detached: false });
    child.unref && child.unref();
    return { pid: child.pid };
  } catch (e) { return { error: e.message }; }
});

/* Game scanning helpers: check common Steam / Epic folders */
function commonSteamPaths() {
  const home = os.homedir();
  if (process.platform === 'win32') return [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common',
    path.join(process.env.PROGRAMFILES, 'Steam', 'steamapps', 'common')
  ].filter(Boolean);
  if (process.platform === 'darwin') return [
    path.join(home, 'Library', 'Application Support', 'Steam', 'steamapps', 'common')
  ];
  // linux
  return [
    path.join(home, '.steam', 'steam', 'steamapps', 'common'),
    path.join(home, '.local', 'share', 'Steam', 'steamapps', 'common')
  ];
}
function commonEpicPaths() {
  const home = os.homedir();
  if (process.platform === 'win32') return [
    'C:\\Program Files\\Epic Games',
    'C:\\Program Files (x86)\\Epic Games'
  ];
  if (process.platform === 'darwin') return [
    path.join('/Applications')
  ];
  return [
    path.join(home, 'Games'),
    path.join('/usr', 'local', 'games')
  ];
}

function scanDirForExecutables(dir) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const exes = [];
    items.forEach(it => {
      if (it.isFile()) {
        const name = it.name.toLowerCase();
        if (process.platform === 'win32' && name.endsWith('.exe')) exes.push(path.join(dir, it.name));
        if (process.platform === 'darwin' && name.endsWith('.app')) exes.push(path.join(dir, it.name));
        if (process.platform === 'linux' && (name.endsWith('.sh') || name.indexOf('.')===-1)) exes.push(path.join(dir, it.name));
      }
      if (it.isDirectory()) {
        // mac .app bundles or nested exes
        if (process.platform === 'darwin' && it.name.endsWith('.app')) exes.push(path.join(dir, it.name));
      }
    });
    return exes;
  } catch(e){ return []; }
}

ipcMain.handle('sys.scanGames', async () => {
  const results = [];
  // Steam
  for (const p of commonSteamPaths()) {
    try {
      if (fs.existsSync(p)) {
        const entries = fs.readdirSync(p, { withFileTypes: true });
        entries.forEach(en => {
          if (en.isDirectory()) {
            const full = path.join(p, en.name);
            const exes = scanDirForExecutables(full);
            results.push({ source: 'steam', name: en.name, folder: full, executables: exes });
          }
        });
      }
    } catch(e){}
  }
  // Epic
  for (const p of commonEpicPaths()) {
    try {
      if (fs.existsSync(p)) {
        const entries = fs.readdirSync(p, { withFileTypes: true });
        entries.forEach(en => {
          if (en.isDirectory()) {
            const full = path.join(p, en.name);
            const exes = scanDirForExecutables(full);
            results.push({ source: 'epic', name: en.name, folder: full, executables: exes });
          }
        });
      }
    } catch(e){}
  }
  return results;
});

ipcMain.handle('sys.launchGame', async (event, entry) => {
  try {
    if (entry.url) {
      await shell.openExternal(entry.url);
      return { launched: true };
    }
    if (entry.execPath) {
      // try openPath first
      const res = await shell.openPath(entry.execPath);
      if (res && res.length) {
        // openPath returns empty string on success
        // if non-empty -> error
        return { error: res };
      }
      return { launched: true };
    }
    if (entry.folder) {
      // attempt to find an exe
      const exes = scanDirForExecutables(entry.folder);
      if (exes.length) {
        const exe = exes[0];
        child_process.spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
        return { launched: true, path: exe };
      }
    }
    return { error: 'No launchable target found' };
  } catch (e) {
    return { error: e.message };
  }
});

/* small helper for opening folders */
ipcMain.handle('sys.openFolder', async (event, folder) => {
  try { await shell.openPath(folder); return { ok: true }; } catch(e) { return { error: e.message }; }
});

