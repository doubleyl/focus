import { Tray, Menu, nativeImage, app } from 'electron';
import { showMainWindow, toggleQuickWindow } from './windowManager';
import { startFocus, pauseTimer, resumeTimer, stopTimer, getTimerState, onTimerStateChange } from './timerService';

let tray: Tray | null = null;

export function createTray() {
    // Create a simple tray icon using emoji-based nativeImage
    const iconSize = 18;
    const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}">
      <circle cx="9" cy="9" r="7.5" fill="black" />
      <circle cx="9" cy="9" r="5.5" fill="none" stroke="black" stroke-width="1.5" />
      <line x1="9" y1="4" x2="9" y2="9" stroke="black" stroke-width="1.5" stroke-linecap="round" />
      <line x1="9" y1="9" x2="12" y2="11" stroke="black" stroke-width="1.2" stroke-linecap="round" />
    </svg>
  `;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
    const icon = nativeImage.createFromDataURL(dataUrl).resize({ width: iconSize, height: iconSize });
    if (process.platform === 'darwin') {
        icon.setTemplateImage(true);
    }

    tray = new Tray(icon);
    tray.setToolTip('Focus - 专注');
    if (process.platform === 'darwin') {
        tray.setTitle('Focus');
    }

    updateTrayMenu();
    onTimerStateChange(() => updateTrayMenu());

    tray.on('click', () => {
        tray?.popUpContextMenu();
    });
    tray.on('right-click', () => {
        tray?.popUpContextMenu();
    });
}

export function updateTrayMenu() {
    if (!tray) return;
    const state = getTimerState();

    const contextMenu = Menu.buildFromTemplate([
        { label: '打开 Focus', click: showMainWindow },
        { label: '快捷面板', click: toggleQuickWindow },
        { type: 'separator' },
        {
            label: '开始专注',
            click: startFocus,
            enabled: state.phase === 'idle',
        },
        {
            label: state.isRunning ? '暂停' : '继续',
            click: () => {
                if (state.isRunning) pauseTimer();
                else resumeTimer();
            },
            enabled: state.phase !== 'idle',
        },
        {
            label: '停止',
            click: stopTimer,
            enabled: state.phase !== 'idle',
        },
        { type: 'separator' },
        { label: '退出', click: () => { app.exit(0); } },
    ]);

    tray.setContextMenu(contextMenu);
}

export function getTray() { return tray; }
