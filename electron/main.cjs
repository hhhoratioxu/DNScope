'use strict';

const path = require('node:path');
const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const {
  benchmarkDns,
  resolveRecords,
  getSystemInfo,
} = require('./dns-core.cjs');

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);

function installSecurityHeaders() {
  const scriptSource = isDevelopment ? "'self' 'unsafe-inline'" : "'self'";
  const connectSource = isDevelopment
    ? "'self' ws://127.0.0.1:5173 http://127.0.0.1:5173"
    : "'self'";
  const policy = [
    "default-src 'self'",
    `script-src ${scriptSource}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${connectSource}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...(details.responseHeaders || {}),
        'Content-Security-Policy': [policy],
      },
    });
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1060,
    minHeight: 700,
    show: false,
    title: 'DNScope',
    backgroundColor: '#0b0e12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDevelopment,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    const currentUrl = window.webContents.getURL();
    if (url !== currentUrl) event.preventDefault();
  });

  if (isDevelopment) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('dnscope:benchmark', (_event, payload) => benchmarkDns(payload));
ipcMain.handle('dnscope:resolve-records', (_event, payload) => resolveRecords(payload));
ipcMain.handle('dnscope:system-info', () => getSystemInfo());
ipcMain.handle('dnscope:app-version', () => app.getVersion());

app.whenReady().then(() => {
  installSecurityHeaders();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
