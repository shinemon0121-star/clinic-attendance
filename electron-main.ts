import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.ts'),
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// PDF 保存 IPC ハンドラー
ipcMain.handle('save-pdf', async (event, { htmlContent, fileName, userName, year, month }) => {
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop', '出勤簿記録', userName);

    // ユーザーフォルダが存在しない場合は作成
    if (!fs.existsSync(desktopPath)) {
      fs.mkdirSync(desktopPath, { recursive: true });
    }

    // ファイル名：2026年5月度藤原慎太郎出勤簿.pdf
    const pdfFileName = `${year}年${month}月度${userName}出勤簿.pdf`;
    const pdfPath = path.join(desktopPath, pdfFileName);

    // BrowserWindow の webContents.printToPDF を使用して PDF を生成
    if (mainWindow && mainWindow.webContents) {
      const pdfData = await mainWindow.webContents.printToPDF({
        marginsType: 0,
        pageSize: 'A4',
        printBackground: true,
        landscape: false,
      });

      fs.writeFileSync(pdfPath, pdfData);

      return {
        success: true,
        path: pdfPath,
        message: `PDF を保存しました: ${pdfPath}`,
      };
    } else {
      return {
        success: false,
        error: 'Main window not found',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// 年月を取得 IPC ハンドラー
ipcMain.handle('get-current-period', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return { year, month };
});
