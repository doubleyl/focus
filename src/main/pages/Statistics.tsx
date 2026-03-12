import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/Statistics.css';

type ViewMode = 'week' | 'month';

function formatDiff(diffSeconds: number): string {
    if (diffSeconds === 0) return '持平';
    const isPositive = diffSeconds > 0;
    const absDiff = Math.abs(diffSeconds);
    const h = Math.floor(absDiff / 3600);
    const m = Math.floor((absDiff % 3600) / 60);
    if (h === 0 && m === 0) return '持平';
    const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return `${isPositive ? '+' : '-'} ${timeStr}`;
}

function formatDateDisplay(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getDateStr(today);
    if (dateStr === todayStr) return '今天';

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getDateStr(yesterday);
    if (dateStr === yesterdayStr) return '昨天';

    return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function getDateStr(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDayLabel(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Statistics() {
    const { records, setRecords } = useAppStore();
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [timelineDate, setTimelineDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [trendEndDate, setTrendEndDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    useEffect(() => {
        window.electronAPI.recordsGetAll().then(setRecords);
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getDateStr(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getDateStr(yesterday);

    const todayRecords = useMemo(
        () => records.filter((record) => getDateStr(new Date(record.startTime)) === todayStr),
        [records, todayStr]
    );

    const yesterdayRecords = useMemo(
        () => records.filter((record) => getDateStr(new Date(record.startTime)) === yesterdayStr),
        [records, yesterdayStr]
    );

    const todayTotalSeconds = todayRecords.reduce((sum, record) => sum + record.duration, 0);
    const yesterdayTotalSeconds = yesterdayRecords.reduce((sum, record) => sum + record.duration, 0);
    const diffSeconds = todayTotalSeconds - yesterdayTotalSeconds;
    const diffDisplay = formatDiff(diffSeconds);
    const isDiffPositive = diffSeconds > 0;
    const isDiffNegative = diffSeconds < 0;

    const todayCompletedCount = todayRecords.filter((record) => record.completed).length;

    const streak = useMemo(() => {
        let count = 0;
        const d = new Date(today);
        while (true) {
            const ds = getDateStr(d);
            const dayRecords = records.filter((record) => getDateStr(new Date(record.startTime)) === ds);
            if (dayRecords.length === 0) break;
            count++;
            d.setDate(d.getDate() - 1);
        }
        return count;
    }, [records, today]);

    const periodDays = viewMode === 'week' ? 7 : 30;
    const chartData = useMemo(() => {
        const data = [];
        for (let i = periodDays - 1; i >= 0; i--) {
            const d = new Date(trendEndDate);
            d.setDate(d.getDate() - i);
            const ds = getDateStr(d);
            const dayRecords = records.filter((record) => getDateStr(new Date(record.startTime)) === ds);
            const totalMinutes = Math.round(dayRecords.reduce((sum, record) => sum + record.duration, 0) / 60);
            data.push({
                date: getDayLabel(ds),
                minutes: totalMinutes,
            });
        }
        return data;
    }, [records, periodDays, trendEndDate]);

    const timelineRecords = useMemo(
        () => records.filter((record) => getDateStr(new Date(record.startTime)) === getDateStr(timelineDate)),
        [records, timelineDate]
    );

    const timelineTotalSeconds = timelineRecords.reduce((sum, record) => sum + record.duration, 0);

    const navigateTimeline = (offset: number) => {
        const d = new Date(timelineDate);
        d.setDate(d.getDate() + offset);
        setTimelineDate(d);
    };

    const navigateTrend = (offset: number) => {
        const d = new Date(trendEndDate);
        // By default, move by periodDays, but a bit of overlap can be nice, let's just shift by period
        d.setDate(d.getDate() + offset * periodDays);

        // Prevent navigating beyond today
        const maxDate = new Date();
        maxDate.setHours(0, 0, 0, 0);
        if (d > maxDate) {
            setTrendEndDate(maxDate);
        } else {
            setTrendEndDate(d);
        }
    };

    const isTrendAtLatest = getDateStr(trendEndDate) === getDateStr(new Date());

    const timelineBlocks = useMemo(() => {
        return timelineRecords.map((record) => {
            const start = new Date(record.startTime);
            // End point on timeline is actual focused duration from start time, not wall-clock end time
            const end = new Date(record.startTime + record.duration * 1000);
            const startMinutes = start.getHours() * 60 + start.getMinutes();
            const endMinutes = end.getHours() * 60 + end.getMinutes();
            const totalMinutes = 24 * 60;
            return {
                left: `${(startMinutes / totalMinutes) * 100}%`,
                width: `${Math.max(((endMinutes - startMinutes) / totalMinutes) * 100, 0.3)}%`,
            };
        });
    }, [timelineRecords]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const totalMins = payload[0].value;
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            const displayStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            return (
                <div className="glass" style={{ padding: '8px 12px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {displayStr}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="stats-page">
            <div className="page-header">
                <h1 className="page-title">统计</h1>
                <p className="page-subtitle">查看你的专注数据</p>
            </div>

            <div className="stats-cards">
                <div className="glass stats-card">
                    <div className="stats-card-label">今日专注</div>
                    <div className="stats-card-value">{formatDuration(todayTotalSeconds)}</div>
                </div>
                <div className="glass stats-card">
                    <div className="stats-card-label">今日番茄</div>
                    <div className="stats-card-value">
                        {todayCompletedCount}
                        <span className="stats-card-unit">个</span>
                    </div>
                </div>
                <div className="glass stats-card">
                    <div className="stats-card-label">较昨日</div>
                    <div className={`stats-card-value diff-value ${isDiffPositive ? 'positive' : ''} ${isDiffNegative ? 'negative' : ''}`}>
                        {diffDisplay}
                    </div>
                </div>
                <div className="glass stats-card">
                    <div className="stats-card-label">连续天数</div>
                    <div className="stats-card-value">
                        {streak}
                        <span className="stats-card-unit">天</span>
                    </div>
                </div>
            </div>

            <div className="glass stats-chart-section">
                <div className="stats-chart-header">
                    <div className="stats-chart-header-left">
                        <h2 className="stats-chart-title">专注趋势</h2>
                        <div className="stats-date-nav">
                            <button className="btn btn-ghost btn-icon" onClick={() => navigateTrend(-1)}>
                                <ChevronLeft size={16} />
                            </button>
                            <span className="stats-date-text">
                                {formatDateDisplay(getDateStr(new Date(trendEndDate.getTime() - (periodDays - 1) * 86400000)))} - {formatDateDisplay(getDateStr(trendEndDate))}
                            </span>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => navigateTrend(1)}
                                disabled={isTrendAtLatest}
                                style={{ opacity: isTrendAtLatest ? 0.3 : 1, cursor: isTrendAtLatest ? 'default' : 'pointer' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="stats-chart-tabs">
                        <button
                            className={`stats-chart-tab ${viewMode === 'week' ? 'active' : ''}`}
                            onClick={() => setViewMode('week')}
                        >
                            周
                        </button>
                        <button
                            className={`stats-chart-tab ${viewMode === 'month' ? 'active' : ''}`}
                            onClick={() => setViewMode('month')}
                        >
                            月
                        </button>
                    </div>
                </div>

                <div className="stats-chart-container">
                    {chartData.some((d) => d.minutes > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.28} />
                                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(125, 87, 58, 0.1)" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                    unit="m"
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="minutes"
                                    stroke="var(--accent-primary)"
                                    strokeWidth={2}
                                    fill="url(#chartGradient)"
                                    dot={{ fill: 'var(--accent-primary)', strokeWidth: 0, r: 3 }}
                                    activeDot={{ fill: 'var(--accent-primary)', strokeWidth: 2, stroke: 'rgba(255, 249, 242, 1)', r: 5 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="stats-empty">该区间暂无专注记录</div>
                    )}
                </div>
            </div>

            <div className="glass stats-timeline-section">
                <div className="stats-timeline-header">
                    <div>
                        <h2 className="stats-timeline-title">专注时间轴</h2>
                        <p style={{ marginTop: 6, marginBottom: 0, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
                            {formatDuration(timelineTotalSeconds)}
                        </p>
                    </div>
                    <div className="stats-date-nav">
                        <button className="btn btn-ghost btn-icon" onClick={() => navigateTimeline(-1)}>
                            <ChevronLeft size={18} />
                        </button>
                        <span className="stats-date-text" style={{ fontSize: 14 }}>{formatDateDisplay(getDateStr(timelineDate))}</span>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => navigateTimeline(1)}
                            disabled={getDateStr(timelineDate) === getDateStr(new Date())}
                            style={{ opacity: getDateStr(timelineDate) === getDateStr(new Date()) ? 0.3 : 1, cursor: getDateStr(timelineDate) === getDateStr(new Date()) ? 'default' : 'pointer' }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {timelineBlocks.length > 0 ? (
                    <>
                        <div className="stats-timeline">
                            {timelineBlocks.map((block, index) => (
                                <div
                                    key={index}
                                    className="stats-timeline-block"
                                    style={{ left: block.left, width: block.width }}
                                />
                            ))}
                        </div>
                        <div className="stats-timeline-hours">
                            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                                <span key={h}>{h}:00</span>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="stats-empty">今天没有专注记录</div>
                )}
            </div>
        </div>
    );
}
