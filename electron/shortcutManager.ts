import { globalShortcut } from 'electron';
import { getSettings } from './dataStore';
import { toggleQuickWindow } from './windowManager';

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
}
