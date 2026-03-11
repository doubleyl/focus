import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { DEFAULT_SETTINGS, type AppSettings, type MascotSkin } from '../../../shared/types';
import MascotVisual from '../../components/MascotVisual';
import { getAllMascotSkins, isBuiltInMascotSkin } from '../../../shared/mascotSkins';
import '../styles/Settings.css';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className={`setting-toggle ${value ? 'active' : ''}`} onClick={() => onChange(!value)}>
            <div className="setting-toggle-knob" />
        </div>
    );
}

export default function Settings() {
    const { settings, setSettings } = useAppStore();
    const [pendingSkinPath, setPendingSkinPath] = useState<string | null>(null);
    const [pendingSkinName, setPendingSkinName] = useState('');
    const [imageError, setImageError] = useState('');
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);

    useEffect(() => {
        window.electronAPI.settingsGet().then(setSettings);
        const unsub = window.electronAPI.onSettingsUpdate(setSettings);
        return () => {
            unsub();
        };
    }, []);

    const update = async (partial: Partial<AppSettings>) => {
        await window.electronAPI.settingsUpdate(partial);
    };

    const handleReset = async () => {
        const updated = await window.electronAPI.settingsUpdate(DEFAULT_SETTINGS);
        setSettings(updated);
    };

    const formatShortcut = (shortcut: string) => {
        if (!shortcut) return '无';
        const isMac = navigator.userAgent.includes('Mac');

        const parts = shortcut.split('+');
        const formattedParts = parts.map(part => {
            if (isMac) {
                switch (part) {
                    case 'CommandOrControl':
                    case 'Command':
                    case 'Cmd':
                        return '⌘';
                    case 'Control':
                    case 'Ctrl':
                        return '⌃';
                    case 'Alt':
                    case 'Option':
                        return '⌥';
                    case 'Shift':
                        return '⇧';
                    default:
                        return part;
                }
            } else {
                switch (part) {
                    case 'CommandOrControl':
                        return 'Ctrl';
                    case 'Command':
                    case 'Cmd':
                        return 'Win';
                    default:
                        return part;
                }
            }
        });

        return formattedParts.join(isMac ? '' : ' + ');
    };

    const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
            setIsRecordingShortcut(false);
            return;
        }

        const keys: string[] = [];
        if (e.metaKey) keys.push('Command');
        if (e.ctrlKey) keys.push('Control');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');

        const key = e.key.toUpperCase();
        if (['META', 'CONTROL', 'ALT', 'SHIFT'].includes(key)) {
            // Just modifier pressed, wait for the actual key
            return;
        }

        // Map some keys to Electron standard
        let mappedKey = key;
        if (key === ' ') mappedKey = 'Space';
        else if (key === '+') mappedKey = 'Plus';
        else if (key.length === 1) mappedKey = key;

        if (keys.length === 0 && mappedKey.length === 1 && mappedKey >= 'A' && mappedKey <= 'Z') {
            // Prevent binding simple letter keys without modifiers as global shortcuts
            return;
        }

        keys.push(mappedKey);

        if (keys.length > 0) {
            const finalShortcut = keys.join('+');
            update({ globalShortcut: finalShortcut });
            setIsRecordingShortcut(false);
        }
    };

    const allSkins = getAllMascotSkins(settings.customSkins);

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1 className="page-title">设置</h1>
                <p className="page-subtitle">自定义你的专注体验</p>
            </div>

            {/* Timer Settings */}
            <div className="glass settings-section">
                <h3 className="settings-section-title">⏱ 时间设置</h3>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">专注时长</div>
                        <div className="setting-desc">每个专注周期的时间</div>
                    </div>
                    <div className="setting-slider-group">
                        <input
                            type="range"
                            className="setting-slider"
                            min={1}
                            max={120}
                            value={settings.focusDuration}
                            onChange={e => update({ focusDuration: +e.target.value })}
                        />
                        <span className="setting-slider-value">{settings.focusDuration}分</span>
                    </div>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">短休息时长</div>
                        <div className="setting-desc">每个专注周期后的休息</div>
                    </div>
                    <div className="setting-slider-group">
                        <input
                            type="range"
                            className="setting-slider"
                            min={1}
                            max={30}
                            value={settings.shortBreakDuration}
                            onChange={e => update({ shortBreakDuration: +e.target.value })}
                        />
                        <span className="setting-slider-value">{settings.shortBreakDuration}分</span>
                    </div>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">长休息时长</div>
                        <div className="setting-desc">多轮专注后的长休息</div>
                    </div>
                    <div className="setting-slider-group">
                        <input
                            type="range"
                            className="setting-slider"
                            min={5}
                            max={60}
                            value={settings.longBreakDuration}
                            onChange={e => update({ longBreakDuration: +e.target.value })}
                        />
                        <span className="setting-slider-value">{settings.longBreakDuration}分</span>
                    </div>
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">长休息间隔</div>
                        <div className="setting-desc">几轮专注后进入长休息</div>
                    </div>
                    <div className="setting-slider-group">
                        <input
                            type="range"
                            className="setting-slider"
                            min={2}
                            max={8}
                            value={settings.roundsBeforeLongBreak}
                            onChange={e => update({ roundsBeforeLongBreak: +e.target.value })}
                        />
                        <span className="setting-slider-value">{settings.roundsBeforeLongBreak}轮</span>
                    </div>
                </div>
            </div>

            {/* Behavior Settings */}
            <div className="glass settings-section">
                <h3 className="settings-section-title">⚙️ 行为设置</h3>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">自动开始休息</div>
                        <div className="setting-desc">专注结束后自动进入休息</div>
                    </div>
                    <Toggle value={settings.autoStartBreak} onChange={v => update({ autoStartBreak: v })} />
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">自动开始下一轮</div>
                        <div className="setting-desc">休息结束后自动开始专注</div>
                    </div>
                    <Toggle value={settings.autoStartFocus} onChange={v => update({ autoStartFocus: v })} />
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">提示音</div>
                        <div className="setting-desc">专注/休息切换时播放声音</div>
                    </div>
                    <Toggle value={settings.soundEnabled} onChange={v => update({ soundEnabled: v })} />
                </div>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">显示桌面玩偶</div>
                        <div className="setting-desc">专注时在屏幕边缘显示玩偶</div>
                    </div>
                    <Toggle value={settings.showMascot} onChange={v => update({ showMascot: v })} />
                </div>
            </div>

            {/* Shortcut Settings */}
            <div className="glass settings-section">
                <h3 className="settings-section-title">⌨️ 快捷键配置</h3>

                <div className="setting-row">
                    <div>
                        <div className="setting-label">启用迷你面板快捷键</div>
                        <div className="setting-desc">使用快捷键快速唤起/隐藏悬浮控制面板</div>
                    </div>
                    <Toggle value={settings.globalShortcutEnabled ?? true} onChange={v => update({ globalShortcutEnabled: v })} />
                </div>

                <div className="setting-row" style={{ opacity: settings.globalShortcutEnabled ? 1 : 0.5, pointerEvents: settings.globalShortcutEnabled ? 'auto' : 'none' }}>
                    <div>
                        <div className="setting-label">自定义快捷键</div>
                        <div className="setting-desc">点击右侧按钮后按下组合键</div>
                    </div>
                    <div className="setting-slider-group" style={{ flex: '1', maxWidth: '300px' }}>
                        <div
                            tabIndex={0}
                            onClick={() => setIsRecordingShortcut(true)}
                            onBlur={() => setIsRecordingShortcut(false)}
                            onKeyDown={isRecordingShortcut ? handleShortcutKeyDown : undefined}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                border: `1px solid ${isRecordingShortcut ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)'}`,
                                background: isRecordingShortcut ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.2)',
                                color: isRecordingShortcut ? 'var(--primary-color)' : 'white',
                                textAlign: 'center',
                                outline: 'none',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isRecordingShortcut
                                ? '请按下快捷键 (Esc 取消)'
                                : formatShortcut(settings.globalShortcut || 'CommandOrControl+Shift+F')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mascot Skin */}
            <div className="glass settings-section">
                <h3 className="settings-section-title">🎨 玩偶皮肤</h3>
                <div className="setting-row">
                    <div>
                        <div className="setting-label">桌面玩偶大小</div>
                        <div className="setting-desc">调整屏幕四周进度条上玩偶的显示尺寸</div>
                    </div>
                    <div className="setting-slider-group">
                        <input
                            type="range"
                            className="setting-slider"
                            min={20}
                            max={64}
                            value={settings.mascotSize}
                            onChange={e => update({ mascotSize: +e.target.value })}
                        />
                        <span className="setting-slider-value">{settings.mascotSize}px</span>
                    </div>
                </div>
                <div className="skin-grid">
                    {allSkins.map(skin => (
                        <button
                            key={skin.id}
                            className={`skin-card ${settings.mascotSkin === skin.id ? 'active' : ''}`}
                            onClick={() => update({ mascotSkin: skin.id })}
                            style={{ position: 'relative' }}
                        >
                            <MascotVisual
                                skin={skin}
                                className="skin-image"
                                style={{ width: 32, height: 32, objectFit: 'contain' }}
                                emojiClassName="skin-emoji"
                            />
                            <span>{skin.name}</span>
                            {/* Allow deleting custom skins */}
                            {!isBuiltInMascotSkin(skin.id) && (
                                <div
                                    style={{
                                        position: 'absolute', top: 4, right: 4, width: 16, height: 16,
                                        background: 'rgba(255,0,0,0.5)', borderRadius: '50%', color: 'white',
                                        fontSize: 10, lineHeight: '16px', textAlign: 'center'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newSkins = (settings.customSkins || []).filter(s => s.id !== skin.id);
                                        const nextActive = settings.mascotSkin === skin.id ? 'cat' : settings.mascotSkin;
                                        update({ customSkins: newSkins, mascotSkin: nextActive });
                                    }}
                                >
                                    ✕
                                </div>
                            )}
                        </button>
                    ))}
                    {/* Add Custom Skin Button or Name Input */}
                    {pendingSkinPath ? (
                        <div className="skin-card" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', padding: '8px' }}>
                            <MascotVisual
                                skin={{ id: 'pending', name: 'preview', image: pendingSkinPath, frameCount: 1, frameWidth: 48, frameHeight: 48 }}
                                className="skin-image"
                                style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: '8px' }}
                                emojiClassName="skin-emoji"
                            />
                            <input
                                type="text"
                                autoFocus
                                placeholder="输入名称"
                                value={pendingSkinName}
                                onChange={e => setPendingSkinName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && pendingSkinName.trim()) {
                                        const newSkin: MascotSkin = {
                                            id: `custom_${Date.now()}`,
                                            name: pendingSkinName.trim(),
                                            image: pendingSkinPath,
                                            frameCount: 1,
                                            frameWidth: 48,
                                            frameHeight: 48,
                                        };
                                        update({
                                            customSkins: [...(settings.customSkins || []), newSkin],
                                            mascotSkin: newSkin.id
                                        });
                                        setPendingSkinPath(null);
                                        setPendingSkinName('');
                                        setImageError('');
                                    } else if (e.key === 'Escape') {
                                        setPendingSkinPath(null);
                                        setPendingSkinName('');
                                        setImageError('');
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '4px', fontSize: '12px',
                                    borderRadius: '4px', border: '1px solid #ccc',
                                    background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', width: '100%' }}>
                                <button
                                    onClick={() => { setPendingSkinPath(null); setPendingSkinName(''); }}
                                    style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '12px' }}
                                >取消</button>
                                <button
                                    onClick={() => {
                                        if (pendingSkinName.trim()) {
                                            const newSkin: MascotSkin = {
                                                id: `custom_${Date.now()}`,
                                                name: pendingSkinName.trim(),
                                                image: pendingSkinPath,
                                                frameCount: 1,
                                                frameWidth: 48,
                                                frameHeight: 48,
                                            };
                                            update({
                                                customSkins: [...(settings.customSkins || []), newSkin],
                                                mascotSkin: newSkin.id
                                            });
                                            setPendingSkinPath(null);
                                            setPendingSkinName('');
                                            setImageError('');
                                        }
                                    }}
                                    style={{ background: 'var(--primary-color)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
                                >保存</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="skin-card"
                            onClick={async () => {
                                try {
                                    const imagePath = await window.electronAPI.settingsSelectImage();
                                    if (imagePath) {
                                        setPendingSkinPath(imagePath);
                                        setPendingSkinName('自定义皮肤');
                                        setImageError('');
                                    }
                                } catch (error) {
                                    console.error('Error selecting custom skin image:', error);
                                    setImageError(error instanceof Error ? error.message : '图片导入失败，请换一张图片重试。');
                                }
                            }}
                        >
                            <span className="skin-emoji" style={{ fontSize: 24, paddingBottom: 4 }}>+</span>
                            <span>添加自定义</span>
                        </button>
                    )}
                </div>
                {imageError && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#fca5a5' }}>
                        {imageError}
                    </div>
                )}
            </div>

            {/* Reset */}
            <div className="settings-reset">
                <button className="btn btn-danger" onClick={handleReset}>
                    恢复默认设置
                </button>
            </div>
        </div>
    );
}
