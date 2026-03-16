import { ipcMain, dialog, app, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC_CHANNELS } from '../shared/types';
import { startFocus, pauseTimer, resumeTimer, stopTimer, skipPhase, getTimerState, endBreak } from './timerService';
import { getAllRecords, getRecordsByDate, getRecordsByRange, addRecord, deleteRecord, updateRecord, getSettings, updateSettings } from './dataStore';
import { hideBreakWindow, showMainWindow, toggleQuickWindow, getOverlayWindow } from './windowManager';
import { updateGlobalShortcut } from './shortcutManager';

const DIRECT_COPY_EXTENSIONS = new Set(['.svg']);
const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp', 'ico', 'avif'];

function toLocalProtocolPath(filePath: string): string {
    return `focus-local://local-file?path=${encodeURIComponent(filePath)}`;
}

function importCustomSkinImage(sourcePath: string): string {
    const ext = path.extname(sourcePath).toLowerCase();
    const userDataPath = app.getPath('userData');
    const customSkinsDir = path.join(userDataPath, 'custom_skins');

    if (!fs.existsSync(customSkinsDir)) {
        fs.mkdirSync(customSkinsDir, { recursive: true });
    }

    if (DIRECT_COPY_EXTENSIONS.has(ext)) {
        const destPath = path.join(customSkinsDir, `custom_skin_${Date.now()}${ext}`);
        fs.copyFileSync(sourcePath, destPath);
        return toLocalProtocolPath(destPath);
    }

    const image = nativeImage.createFromPath(sourcePath);

    if (!image.isEmpty()) {
        const destPath = path.join(customSkinsDir, `custom_skin_${Date.now()}.png`);
        fs.writeFileSync(destPath, image.toPNG());
        return toLocalProtocolPath(destPath);
    }

    throw new Error('无法解析该图片，请尝试 PNG、JPG、SVG、WebP 或 BMP 格式。');
}

export function registerIpcHandlers() {
    // Timer
    ipcMain.handle(IPC_CHANNELS.TIMER_START, () => startFocus());
    ipcMain.handle(IPC_CHANNELS.TIMER_PAUSE, () => pauseTimer());
    ipcMain.handle(IPC_CHANNELS.TIMER_RESUME, () => resumeTimer());
    ipcMain.handle(IPC_CHANNELS.TIMER_STOP, () => stopTimer());
    ipcMain.handle(IPC_CHANNELS.TIMER_SKIP, () => skipPhase());
    ipcMain.handle(IPC_CHANNELS.TIMER_GET_STATE, () => getTimerState());

    // Records
    ipcMain.handle(IPC_CHANNELS.RECORDS_GET_ALL, () => getAllRecords());
    ipcMain.handle(IPC_CHANNELS.RECORDS_GET_BY_DATE, (_e, dateStr: string) => getRecordsByDate(dateStr));
    ipcMain.handle(IPC_CHANNELS.RECORDS_GET_RANGE, (_e, startDate: string, endDate: string) => getRecordsByRange(startDate, endDate));
    ipcMain.handle(IPC_CHANNELS.RECORDS_ADD, (_e, data) => addRecord(data));
    ipcMain.handle(IPC_CHANNELS.RECORDS_DELETE, (_e, id: string) => deleteRecord(id));
    ipcMain.handle(IPC_CHANNELS.RECORDS_UPDATE, (_e, record) => updateRecord(record));

    // Settings
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => getSettings());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_e, partial) => {
        const newSettings = updateSettings(partial);
        updateGlobalShortcut();
        return newSettings;
    });
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_IMAGE, async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: '选择自定义玩偶皮肤',
            filters: [{ name: 'Images', extensions: SUPPORTED_IMAGE_EXTENSIONS }],
            properties: ['openFile'],
        });

        if (canceled || filePaths.length === 0) {
            return null;
        }

        const sourcePath = filePaths[0];
        return importCustomSkinImage(sourcePath);
    });

    // Window
    ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_MAIN, () => showMainWindow());
    ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_QUICK, () => toggleQuickWindow());

    // Break
    ipcMain.handle(IPC_CHANNELS.BREAK_HIDE, () => {
        hideBreakWindow();
    });
    ipcMain.handle(IPC_CHANNELS.BREAK_END, () => endBreak());
}
