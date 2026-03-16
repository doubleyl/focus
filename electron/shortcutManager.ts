import { globalShortcut } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import { getSettings } from './dataStore';
import { toggleQuickWindow, getOverlayWindow } from './windowManager';

export function updateGlobalShortcut() {
    globalShortcut.unregisterAll();
    const settings = getSettings();

    // Quick panel shortcut
    if (settings.globalShortcutEnabled && settings.globalShortcut) {
        try {
            const ok = globalShortcut.register(settings.globalShortcut, () => {
                toggleQuickWindow();
            });
            if (!ok) {
                console.warn(`Failed to register shortcut ${settings.globalShortcut}`);
            }
        } catch (e) {
            console.error('Error registering global shortcut:', e);
        }
    }

    // Mascot enlarge shortcut
    if (settings.mascotEnlargeShortcut) {
        try {
            const ok = globalShortcut.register(settings.mascotEnlargeShortcut, () => {
                const overlay = getOverlayWindow();
                if (overlay && !overlay.isDestroyed()) {
                    overlay.webContents.send(IPC_CHANNELS.OVERLAY_TOGGLE_ENLARGE);
                }
            });
            if (!ok) {
                console.warn(`Failed to register mascot enlarge shortcut ${settings.mascotEnlargeShortcut}`);
            }
        } catch (e) {
            console.error('Error registering mascot enlarge shortcut:', e);
        }
    }
}
