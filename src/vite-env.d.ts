/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    savePDF: (htmlContent: string, fileName: string, userName: string, year: number, month: number) => Promise<any>;
    getCurrentPeriod: () => Promise<{ year: number; month: number }>;
  };
}
