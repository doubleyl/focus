import { app, BrowserWindow, protocol, net, powerMonitor, globalShortcut } from 'electron';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createMainWindow, createOverlayWindow, createBreakWindow, createQuickWindow, showMainWindow, getAllWindows, toggleQuickWindow, getOverlayWindow } from './windowManager';
import { createTray } from './trayManager';
import { registerIpcHandlers } from './ipcHandlers';
import { pauseTimer, getTimerState, resumeTimer } from './timerService';
import { getSettings } from './dataStore';
import { IPC_CHANNELS } from '../shared/types';

app.setName('Focus');
app.setPath('userData', path.join(app.getPath('appData'), 'focus'));

const IDLE_THRESHOLD_SECONDS = 5 * 60;
const IDLE_POLL_INTERVAL_MS = 10 * 1000;
let idleInterval: ReturnType<typeof setInterval> | null = null;
function startIdleMonitor() {
    if (idleInterval) {
        clearInterval(idleInterval);
    }

    // System events for sleeping/locking
    powerMonitor.on('suspend', () => {
        const state = getTimerState();
        if (state.phase === 'focusing' && state.isRunning) {
            pauseTimer(true);
        }
    });

    powerMonitor.on('lock-screen', () => {
        const state = getTimerState();
        if (state.phase === 'focusing' && state.isRunning) {
            pauseTimer(true);
        }
    });

    powerMonitor.on('resume', () => {
        const state = getTimerState();
        if (state.phase === 'focusing' && !state.isRunning && state.isAwayPaused) {
            resumeTimer(true);
        }
    });

    powerMonitor.on('unlock-screen', () => {
        const state = getTimerState();
        if (state.phase === 'focusing' && !state.isRunning && state.isAwayPaused) {
            resumeTimer(true);
        }
    });

    // Polling for idle states
    idleInterval = setInterval(() => {
        const idleSeconds = powerMonitor.getSystemIdleTime();
        const state = getTimerState();

        // Auto pause on idle
        if (state.phase === 'focusing' && state.isRunning && idleSeconds >= IDLE_THRESHOLD_SECONDS) {
            pauseTimer(true);
            return;
        }

        // Auto resume when we become active and it was an away suspension
        if (idleSeconds < IDLE_THRESHOLD_SECONDS) {
            if (state.phase === 'focusing' && !state.isRunning && state.isAwayPaused) {
                resumeTimer(true);
            }
        }
    }, IDLE_POLL_INTERVAL_MS);
}

import { updateGlobalShortcut } from './shortcutManager';

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'focus-local',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            bypassCSP: true,
        }
    }
]);

import { screen } from 'electron';

let mousePollInterval: NodeJS.Timeout | null = null;
const MOUSE_POLL_INTERVAL_MS = 100;

function startMousePolling() {
    if (mousePollInterval) return;
    mousePollInterval = setInterval(() => {
        const overlay = getOverlayWindow();
        if (overlay && !overlay.isDestroyed()) {
            const point = screen.getCursorScreenPoint();
            overlay.webContents.send(IPC_CHANNELS.OVERLAY_MOUSE_POSITION, point);
        }
    }, MOUSE_POLL_INTERVAL_MS);
}

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (idleInterval) {
        clearInterval(idleInterval);
        idleInterval = null;
    }
    if (mousePollInterval) {
        clearInterval(mousePollInterval);
        mousePollInterval = null;
    }
});

app.whenReady().then(() => {
    // Handle the focus-local custom protocol
    protocol.handle('focus-local', (request) => {
        const url = new URL(request.url);
        const pathFromQuery = url.searchParams.get('path');
        const filePath = pathFromQuery || decodeURIComponent(url.pathname || request.url.slice('focus-local://'.length));

        if (!filePath || !fs.existsSync(filePath)) {
            return new Response('File not found', { status: 404 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
    });

    registerIpcHandlers();

    // Existing window creations
    createMainWindow();
    createOverlayWindow();
    createBreakWindow();
    createQuickWindow();
    createTray();
    updateGlobalShortcut();
    startIdleMonitor();

    // Start polling mouse for mascot edge-transparency
    startMousePolling();
});

app.on('window-all-closed', () => {
    // On macOS, keep the app running in the tray
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (getAllWindows().length === 0) {
        createMainWindow();
    } else {
        showMainWindow();
    }
});

// Prevent the app from quitting when the last window is closed
app.on('before-quit', () => {
    // Force all windows to actually close
    BrowserWindow.getAllWindows().forEach(win => {
        win.removeAllListeners('close');
        win.close();
    });
});
