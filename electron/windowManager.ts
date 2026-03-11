import { app, BrowserWindow, screen } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let breakWindow: BrowserWindow | null = null;
let quickWindow: BrowserWindow | null = null;

const devServerUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_RENDERER_URL || '';
const isDev = Boolean(devServerUrl);
const preloadPath = path.join(__dirname, 'preload.js');

function getRendererDistPath() {
    return app.isPackaged
        ? path.join(app.getAppPath(), 'dist')
        : path.join(__dirname, '../dist');
}

function wireLoadDiagnostics(window: BrowserWindow, label: string) {
    window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        console.error(`[${label}] failed to load`, {
            errorCode,
            errorDescription,
            validatedURL,
            isDev,
            devServerUrl,
        });
    });

    window.webContents.on('render-process-gone', (_event, details) => {
        console.error(`[${label}] renderer process gone`, details);
    });
}

function loadRenderer(window: BrowserWindow, htmlFile: 'index.html' | 'overlay.html' | 'break.html' | 'quick.html', devPath: string) {
    wireLoadDiagnostics(window, htmlFile);

    if (isDev) {
        const baseUrl = devServerUrl.endsWith('/') ? devServerUrl : `${devServerUrl}/`;
        window.loadURL(new URL(devPath.replace(/^\//, ''), baseUrl).toString());
        return;
    }

    const rendererDistPath = getRendererDistPath();
    const entryPath = path.join(rendererDistPath, htmlFile);

    if (!path.isAbsolute(entryPath)) {
        throw new Error(`Renderer entry path is not absolute: ${entryPath}`);
    }

    window.loadFile(entryPath);
}

export function createMainWindow(): BrowserWindow {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 650,
        minWidth: 780,
        minHeight: 550,
        title: 'Focus',
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window',
        visualEffectState: 'active',
        backgroundColor: '#00000000',
        show: false,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.on('close', (e) => {
        // Hide instead of close, keep app in tray
        e.preventDefault();
        mainWindow?.hide();
    });

    loadRenderer(mainWindow, 'index.html', '/');

    return mainWindow;
}

export function createOverlayWindow(): BrowserWindow {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().size;

    overlayWindow = new BrowserWindow({
        width: screenWidth,
        height: screenHeight,
        x: 0,
        y: 0,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        focusable: false,
        show: false,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setVisibleOnAllWorkspaces(true);

    loadRenderer(overlayWindow, 'overlay.html', '/overlay.html');

    return overlayWindow;
}

export function createBreakWindow(): BrowserWindow {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().size;

    breakWindow = new BrowserWindow({
        width: screenWidth,
        height: screenHeight,
        x: 0,
        y: 0,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        fullscreenable: true,
        show: false,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    breakWindow.setAlwaysOnTop(true, 'screen-saver');

    loadRenderer(breakWindow, 'break.html', '/break.html');

    return breakWindow;
}

export function createQuickWindow(): BrowserWindow {
    quickWindow = new BrowserWindow({
        width: 320,
        height: 190,
        resizable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        frame: false,
        transparent: true,
        hasShadow: true,
        show: false,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    loadRenderer(quickWindow, 'quick.html', '/quick.html');

    return quickWindow;
}

export function showOverlay() {
    overlayWindow?.show();
}

export function hideOverlay() {
    overlayWindow?.hide();
}

export function showBreakWindow() {
    breakWindow?.show();
    breakWindow?.setIgnoreMouseEvents(false);
}

export function hideBreakWindow() {
    breakWindow?.hide();
}

export function showMainWindow() {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
}

export function showQuickWindow() {
    quickWindow?.show();
    quickWindow?.focus();
}

export function hideQuickWindow() {
    quickWindow?.hide();
}

export function toggleQuickWindow() {
    if (!quickWindow || quickWindow.isDestroyed()) return;
    if (quickWindow.isVisible()) {
        quickWindow.hide();
    } else {
        quickWindow.show();
        quickWindow.focus();
    }
}

export function getMainWindow() { return mainWindow; }
export function getOverlayWindow() { return overlayWindow; }
export function getBreakWindow() { return breakWindow; }
export function getQuickWindow() { return quickWindow; }

export function getAllWindows() {
    return [mainWindow, overlayWindow, breakWindow, quickWindow].filter(Boolean) as BrowserWindow[];
}
