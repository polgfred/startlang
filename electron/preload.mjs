import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('startlangDesktop', {
  isDesktop: true,
  engine: {
    run(source) {
      return ipcRenderer.invoke('engine:run', source);
    },
    moveToSnapshot(index) {
      return ipcRenderer.invoke('engine:moveToSnapshot', index);
    },
    exportTrace() {
      return ipcRenderer.invoke('engine:exportTrace');
    },
  },
  files: {
    open() {
      return ipcRenderer.invoke('files:open');
    },
    readRecent(filePath) {
      return ipcRenderer.invoke('files:readRecent', filePath);
    },
    save(filePath, content) {
      return ipcRenderer.invoke('files:save', filePath, content);
    },
    saveAs(content) {
      return ipcRenderer.invoke('files:saveAs', content);
    },
    listRecent() {
      return ipcRenderer.invoke('files:listRecent');
    },
    saveTraceBundle(json) {
      return ipcRenderer.invoke('files:saveTraceBundle', json);
    },
  },
});
