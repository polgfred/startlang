import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import { EngineManager } from './engine/manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preloadPath = path.join(__dirname, 'preload.mjs');

const RECENT_FILES_LIMIT = 10;
const engineManager = new EngineManager();
let mainWindow = null;

function getStartUrl() {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }
  return 'http://127.0.0.1:3000';
}

function getRecentFilesPath() {
  return path.join(app.getPath('userData'), 'recent-files.json');
}

async function readRecentFiles() {
  try {
    const filePath = getRecentFilesPath();
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value) => typeof value === 'string');
  } catch {
    return [];
  }
}

async function writeRecentFiles(files) {
  const filePath = getRecentFilesPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(files, null, 2), 'utf8');
}

async function addRecentFile(filePath) {
  const recentFiles = await readRecentFiles();
  const updated = [filePath, ...recentFiles.filter((item) => item !== filePath)];
  await writeRecentFiles(updated.slice(0, RECENT_FILES_LIMIT));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 960,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(getStartUrl());
}

ipcMain.handle('engine:run', async (_event, source) => {
  return engineManager.request('run', { source });
});

ipcMain.handle('engine:moveToSnapshot', async (_event, index) => {
  return engineManager.request('moveToSnapshot', { index });
});

ipcMain.handle('engine:exportTrace', async () => {
  return engineManager.request('exportTrace');
});

ipcMain.handle('files:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'StartLang files', extensions: ['start'] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, 'utf8');
  await addRecentFile(filePath);
  return { filePath, content };
});

ipcMain.handle('files:readRecent', async (_event, filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  await addRecentFile(filePath);
  return { filePath, content };
});

ipcMain.handle('files:save', async (_event, filePath, content) => {
  await fs.writeFile(filePath, content, 'utf8');
  await addRecentFile(filePath);
  return { filePath };
});

ipcMain.handle('files:saveAs', async (_event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'StartLang files', extensions: ['start'] }],
  });
  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.writeFile(result.filePath, content, 'utf8');
  await addRecentFile(result.filePath);
  return { filePath: result.filePath };
});

ipcMain.handle('files:listRecent', async () => {
  return readRecentFiles();
});

ipcMain.handle('files:saveTraceBundle', async (_event, json) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  await fs.writeFile(result.filePath, json, 'utf8');
  return { filePath: result.filePath };
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  engineManager.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
