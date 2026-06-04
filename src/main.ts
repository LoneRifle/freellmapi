import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, dialog } from 'electron';
import { startServer, ensureSessionToken } from './server.mjs';
import { loadConfig, saveConfig } from './config.js';
import { buildTray } from './tray.js';
import { openDashboard } from './window.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 31415;

// Lean posture: no GPU process, one instance, menu-bar only.
app.setName('FreeLLMAPI');
app.setPath('userData', path.join(app.getPath('appData'), 'FreeLLMAPI'));
app.disableHardwareAcceleration();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let resolvedPort = DEFAULT_PORT;
  let sessionToken = '';

  app.on('second-instance', () => {
    if (sessionToken) openDashboard(resolvedPort, sessionToken);
  });

  // The app lives in the tray; closing the dashboard window must not quit.
  app.on('window-all-closed', () => {});

  app.whenReady().then(async () => {
    if (process.platform === 'darwin') app.dock?.hide();

    const cfg = loadConfig();
    const dbPath = path.join(app.getPath('userData'), 'freeapi.db');
    // Packaged: client/dist ships in extraResources (Resources/client-dist).
    // Dev (electron . from desktop/): use the repo's client/dist.
    const clientDist = app.isPackaged
      ? path.join(process.resourcesPath, 'client-dist')
      : path.resolve(__dirname, '../../client/dist');

    try {
      const { port } = await startServer({
        dbPath,
        clientDist,
        host: '127.0.0.1',
        preferredPort: cfg.port ?? DEFAULT_PORT,
      });
      resolvedPort = port;
      saveConfig({ ...cfg, port });
      sessionToken = ensureSessionToken();
      buildTray(port, sessionToken);
      console.log(`[desktop] FreeLLMAPI running on http://127.0.0.1:${port}`);
    } catch (err: any) {
      dialog.showErrorBox(
        'FreeLLMAPI failed to start',
        err?.message ?? String(err),
      );
      app.quit();
    }
  });
}
