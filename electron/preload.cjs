'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dnscope', {
  benchmark: (payload) => ipcRenderer.invoke('dnscope:benchmark', payload),
  resolveRecords: (payload) => ipcRenderer.invoke('dnscope:resolve-records', payload),
  getSystemInfo: () => ipcRenderer.invoke('dnscope:system-info'),
  getAppVersion: () => ipcRenderer.invoke('dnscope:app-version'),
});
