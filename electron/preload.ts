import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type TimerState, type FocusRecord, type AppSettings, type BreakOverlayPayload } from '../shared/types';

const electronAPI = {
    // Timer
    timerStart: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_START),
    timerPause: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_PAUSE),
    timerResume: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_RESUME),
    timerStop: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_STOP),
    timerSkip: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_SKIP),
    timerGetState: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_GET_STATE),
    onTimerTick: (callback: (state: TimerState) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, state: TimerState) => callback(state);
        ipcRenderer.on(IPC_CHANNELS.TIMER_TICK, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TIMER_TICK, handler);
    },
    onTimerPhaseChange: (callback: (state: TimerState) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, state: TimerState) => callback(state);
        ipcRenderer.on(IPC_CHANNELS.TIMER_PHASE_CHANGE, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TIMER_PHASE_CHANGE, handler);
    },

    // Records
    recordsGetAll: (): Promise<FocusRecord[]> => ipcRenderer.invoke(IPC_CHANNELS.RECORDS_GET_ALL),
    recordsGetByDate: (dateStr: string): Promise<FocusRecord[]> => ipcRenderer.invoke(IPC_CHANNELS.RECORDS_GET_BY_DATE, dateStr),
    recordsGetRange: (startDate: string, endDate: string): Promise<FocusRecord[]> => ipcRenderer.invoke(IPC_CHANNELS.RECORDS_GET_RANGE, startDate, endDate),
    recordsAdd: (record: Omit<FocusRecord, 'id'>): Promise<FocusRecord> => ipcRenderer.invoke(IPC_CHANNELS.RECORDS_ADD, record),
    recordsDelete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.RECORDS_DELETE, id),
    recordsUpdate: (record: FocusRecord): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.RECORDS_UPDATE, record),

    // Settings
    settingsGet: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    settingsUpdate: (settings: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),
    settingsSelectImage: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_IMAGE),
    onSettingsUpdate: (callback: (settings: AppSettings) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, settings: AppSettings) => callback(settings);
        ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATE, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_UPDATE, handler);
    },

    // Window
    windowShowMain: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_MAIN),
    windowMinimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    windowClose: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    windowToggleQuick: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_QUICK),

    // Break
    onBreakShow: (callback: (payload: BreakOverlayPayload) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, payload: BreakOverlayPayload) => callback(payload);
        ipcRenderer.on(IPC_CHANNELS.BREAK_SHOW, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.BREAK_SHOW, handler);
    },
    breakHide: () => ipcRenderer.invoke(IPC_CHANNELS.BREAK_HIDE),
    breakEnd: () => ipcRenderer.invoke(IPC_CHANNELS.BREAK_END),

    // Overlay
    onOverlayToggleEnlarge: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on(IPC_CHANNELS.OVERLAY_TOGGLE_ENLARGE, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.OVERLAY_TOGGLE_ENLARGE, handler);
    },
    onOverlayMousePosition: (callback: (pos: { x: number, y: number }) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, pos: { x: number, y: number }) => callback(pos);
        ipcRenderer.on(IPC_CHANNELS.OVERLAY_MOUSE_POSITION, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.OVERLAY_MOUSE_POSITION, handler);
    },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
