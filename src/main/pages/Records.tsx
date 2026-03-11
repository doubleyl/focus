import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import type { FocusRecord } from '../../../shared/types';
import '../styles/Records.css';

function getDateStr(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatHHMM(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function formatDateDisplay(date: Date): string {
    const today = new Date();
    const todayStr = getDateStr(today);
    const dateStr = getDateStr(date);
    if (dateStr === todayStr) return '今天';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === getDateStr(yesterday)) return '昨天';
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function Records() {
    const { records, setRecords } = useAppStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ startTime: '09:00', endTime: '09:25', date: '', durationMins: 25 });

    const [editingRecord, setEditingRecord] = useState<FocusRecord | null>(null);
    const [editForm, setEditForm] = useState({ date: '', startTime: '', endTime: '', durationMins: 0 });

    const dateStr = getDateStr(currentDate);

    useEffect(() => {
        window.electronAPI.recordsGetAll().then(setRecords);
    }, []);

    useEffect(() => {
        setAddForm(prev => ({ ...prev, date: dateStr }));
    }, [dateStr]);

    const dayRecords = records
        .filter(r => getDateStr(new Date(r.startTime)) === dateStr)
        .sort((a, b) => b.startTime - a.startTime);

    const navigateDay = (offset: number) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + offset);
        setCurrentDate(d);
    };

    const handleDelete = async (id: string) => {
        await window.electronAPI.recordsDelete(id);
        const updated = await window.electronAPI.recordsGetAll();
        setRecords(updated);
    };

    const handleAdd = async () => {
        const { date, startTime, endTime, durationMins } = addForm;
        const start = new Date(`${date}T${startTime}:00`).getTime();
        const end = new Date(`${date}T${endTime}:00`).getTime();
        if (end <= start || durationMins <= 0) return;

        await window.electronAPI.recordsAdd({
            startTime: start,
            endTime: end,
            duration: durationMins * 60,
            plannedDuration: durationMins * 60,
            completed: true,
        });

        const updated = await window.electronAPI.recordsGetAll();
        setRecords(updated);
        setShowAddModal(false);
    };

    const handleEditClick = (record: FocusRecord) => {
        const start = new Date(record.startTime);
        const end = new Date(record.endTime);
        setEditForm({
            date: getDateStr(start),
            startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
            endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
            durationMins: Math.max(1, Math.round(record.duration / 60))
        });
        setEditingRecord(record);
    };

    const handleEditSave = async () => {
        if (!editingRecord) return;
        const { date, startTime, endTime, durationMins } = editForm;
        const start = new Date(`${date}T${startTime}:00`).getTime();
        const end = new Date(`${date}T${endTime}:00`).getTime();

        if (end <= start || durationMins <= 0) return;

        const updatedRecord = {
            ...editingRecord,
            startTime: start,
            endTime: end,
            duration: durationMins * 60,
        };

        await window.electronAPI.recordsUpdate(updatedRecord);
        const updated = await window.electronAPI.recordsGetAll();
        setRecords(updated);
        setEditingRecord(null);
    };

    return (
        <div className="records-page">
            <div className="page-header">
                <h1 className="page-title">记录</h1>
                <p className="page-subtitle">查看和管理你的专注记录</p>
            </div>

            {/* Toolbar */}
            <div className="records-toolbar">
                <div className="records-date-nav">
                    <button className="btn btn-ghost btn-icon" onClick={() => navigateDay(-1)}>
                        <ChevronLeft size={18} />
                    </button>
                    <span className="records-date-text">{formatDateDisplay(currentDate)}</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => navigateDay(1)}>
                        <ChevronRight size={18} />
                    </button>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} /> 添加记录
                </button>
            </div>

            {/* Record List */}
            <div className="records-list">
                {dayRecords.length > 0 ? (
                    dayRecords.map((r, i) => (
                        <div key={r.id} className="glass record-item" style={{ animationDelay: `${i * 0.05}s` }}>
                            <div className="record-left">
                                <div className={`record-status ${r.completed ? 'completed' : 'incomplete'}`} />
                                <div>
                                    <div className="record-time">{r.completed ? '✅ 完成' : '⏸ 中途结束'}</div>
                                    <div className="record-time-range">
                                        {formatHHMM(r.startTime)} — {formatHHMM(r.endTime)}
                                    </div>
                                </div>
                            </div>
                            <div className="record-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="record-duration" style={{ marginRight: '8px' }}>{formatDuration(r.duration)}</span>
                                <button
                                    className="btn btn-ghost btn-icon record-edit"
                                    onClick={() => handleEditClick(r)}
                                    title="编辑记录"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    className="btn btn-ghost btn-icon record-delete"
                                    onClick={() => handleDelete(r.id)}
                                    title="删除记录"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="records-empty">
                        <p>这一天没有专注记录</p>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="glass modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">手动添加记录</h3>
                        <div className="form-group">
                            <label className="form-label">日期</label>
                            <input
                                type="date"
                                className="form-input"
                                value={addForm.date}
                                onChange={e => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">开始时间</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={addForm.startTime}
                                    onChange={e => setAddForm(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">结束时间</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={addForm.endTime}
                                    onChange={e => setAddForm(prev => ({ ...prev, endTime: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">实际专注时间 (分钟)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={addForm.durationMins}
                                min={1}
                                onChange={e => setAddForm(prev => ({ ...prev, durationMins: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleAdd}>添加</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingRecord && (
                <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
                    <div className="glass modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">编辑记录</h3>
                        <div className="form-group">
                            <label className="form-label">日期</label>
                            <input
                                type="date"
                                className="form-input"
                                value={editForm.date}
                                onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">开始时间</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={editForm.startTime}
                                    onChange={e => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">结束时间</label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={editForm.endTime}
                                    onChange={e => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">实际专注时间 (分钟)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={editForm.durationMins}
                                min={1}
                                onChange={e => setEditForm(prev => ({ ...prev, durationMins: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setEditingRecord(null)}>取消</button>
                            <button className="btn btn-primary" onClick={handleEditSave}>保存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
