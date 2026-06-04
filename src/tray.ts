import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Tray, Menu, app, clipboard, nativeImage } from 'electron';
import { todayStats, formatTokens } from './stats.js';
import { openDashboard } from './window.js';
import { getUnifiedApiKey } from './server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tray: Tray | null = null;

// The menu is rebuilt on every open (popUpContextMenu instead of a static
// setContextMenu) so the stats lines are always fresh — no polling timer.
export function buildTray(port: number, token: string): Tray {
  const iconPath = path.join(__dirname, '../assets/trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true); // auto light/dark tint in the macOS menu bar

  tray = new Tray(icon);
  tray.setToolTip('FreeLLMAPI — local LLM router');

  const show = () => tray!.popUpContextMenu(buildMenu(port, token));
  tray.on('click', show);
  tray.on('right-click', show);

  return tray;
}

function buildMenu(port: number, token: string): Menu {
  const s = todayStats();
  return Menu.buildFromTemplate([
    { label: `Running on 127.0.0.1:${port}`, enabled: false },
    { type: 'separator' },
    { label: `Requests today: ${s.requests}`, enabled: false },
    { label: `Tokens today: ${formatTokens(s.tokens)}`, enabled: false },
    { label: `Last model: ${s.lastModel}`, enabled: false },
    { type: 'separator' },
    { label: 'Open Dashboard', accelerator: 'CmdOrCtrl+D', click: () => openDashboard(port, token) },
    { label: 'Copy API Base URL', click: () => clipboard.writeText(`http://127.0.0.1:${port}/v1`) },
    { label: 'Copy API Key', click: () => clipboard.writeText(getUnifiedApiKey()) },
    { type: 'separator' },
    {
      label: 'Start at Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { label: 'Quit FreeLLMAPI', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
  ]);
}
