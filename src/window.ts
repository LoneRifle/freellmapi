import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow } from 'electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dashboardWindow: BrowserWindow | null = null;

// One window at a time, destroyed on close — the app lives in the tray, the
// window is an on-demand view. The session token rides in via
// additionalArguments so the CJS preload can seed localStorage before any
// page script runs (no login flash, no reload).
export function openDashboard(port: number, token: string): void {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }

  dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: 'FreeLLMAPI',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      additionalArguments: [`--freeapi-token=${token}`],
    },
  });

  dashboardWindow.loadURL(`http://127.0.0.1:${port}`);
  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
  });
}
