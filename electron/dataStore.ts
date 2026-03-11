import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { getAllWindows } from './windowManager';
import { IPC_CHANNELS, type FocusRecord, type AppSettings, DEFAULT_SETTINGS } from '../shared/types';

interface StoreSchema {
    records: FocusRecord[];
    settings: AppSettings;
}

const store = new Store<StoreSchema>({
    defaults: {
        records: [],
        settings: DEFAULT_SETTINGS,
    },
});

// ── Settings ──

export function getSettings(): AppSettings {
    return { ...DEFAULT_SETTINGS, ...store.get('settings') };
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = getSettings();
    const updated = { ...current, ...partial };
    store.set('settings', updated);

    // Broadcast change so windows (like Mascot overlay) can update
    getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.SETTINGS_UPDATE, updated);
        }
    });

    return updated;
}

// ── Records ──

export function getAllRecords(): FocusRecord[] {
    return store.get('records');
}

export function getRecordsByDate(dateStr: string): FocusRecord[] {
    const records = getAllRecords();
    return records.filter(r => {
        const d = new Date(r.startTime);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return ds === dateStr;
    });
}

export function getRecordsByRange(startDate: string, endDate: string): FocusRecord[] {
    const start = new Date(startDate + 'T00:00:00').getTime();
    const end = new Date(endDate + 'T23:59:59').getTime();
    const records = getAllRecords();
    return records.filter(r => r.startTime >= start && r.startTime <= end);
}

export function addRecord(data: Omit<FocusRecord, 'id'>): FocusRecord {
    const record: FocusRecord = { id: uuidv4(), ...data };
    const records = getAllRecords();
    records.push(record);
    store.set('records', records);
    return record;
}

export function deleteRecord(id: string): void {
    const records = getAllRecords().filter(r => r.id !== id);
    store.set('records', records);
}

export function updateRecord(updated: FocusRecord): void {
    const records = getAllRecords().map(r => r.id === updated.id ? updated : r);
    store.set('records', records);
}
