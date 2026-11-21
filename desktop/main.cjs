// Gacha Garage desktop shell (Electron). Serves the Vite build from app://game/ so
// ES modules, fetch() of glb/json and localStorage saves all behave like the web build.
const { app, BrowserWindow, protocol, net, Menu, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// GPU: use the discrete GPU and don't fall back to software on blocklisted drivers.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

const ROOT = path.join(__dirname, 'game');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 540,
    backgroundColor: '#1b1712', show: false, autoHideMenuBar: true,
    title: 'Gacha Garage', icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, spellcheck: false },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // F11 fullscreen, F12 devtools (debugging on players' machines), Ctrl+R reload.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
    else if (input.key.toLowerCase() === 'r' && input.control) { win.webContents.reload(); e.preventDefault(); }
  });
  // External links open in the real browser, never inside the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadURL('app://game/index.html');
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
