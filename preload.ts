import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  savePDF: (htmlContent: string, fileName: string, userName: string, year: number, month: number) =>
    ipcRenderer.invoke('save-pdf', { htmlContent, fileName, userName, year, month }),
  getCurrentPeriod: () =>
    ipcRenderer.invoke('get-current-period'),
});
