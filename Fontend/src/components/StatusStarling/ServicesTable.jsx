import { useState, useMemo } from 'react';
import { ChevronRight, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useScraperLogs } from '../../hooks/useStatusData';

/* ─── helpers ───────────────────────────────────────────────────── */
function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusMeta(s) {
  switch (s) {
    case 'success': return { label: 'Success',        Icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50',   dot: 'bg-emerald-500' };
    case 'error':   return { label: 'Error',           Icon: XCircle,        color: 'text-red-600',     bg: 'bg-red-50',       dot: 'bg-red-500'     };
    case 'partial': return { label: 'Partial Success', Icon: AlertTriangle,  color: 'text-amber-600',   bg: 'bg-amber-50',     dot: 'bg-amber-500'   };
    default:        return { label: s,                 Icon: Clock,          color: 'text-gray-500',    bg: 'bg-gray-50',      dot: 'bg-gray-400'    };
  }
}

function formatDuration(sec) {
  if (sec == null) return '—';
  if (sec < 60)   return `${sec.toFixed(1)}s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

/* ─── derive group status from all runs ─────────────────────────── */
function groupStatus(logs) {
  if (logs.some(l => l.status === 'error'))   return 'error';
  if (logs.some(l => l.status === 'partial')) return 'partial';
  if (logs.every(l => l.status === 'success')) return 'success';
  return logs[0]?.status ?? 'unknown';
}

/* ─── individual run row (inside expanded group) ────────────────── */
function RunRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const { label, Icon, color, bg } = statusMeta(log.status);

  return (
    <div className="border-t border-gray-100">
      {/* Run summary */}
      <div
        className="flex items-center justify-between pl-12 pr-4 py-2.5 cursor-pointer hover:bg-gray-50/80 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            size={12}
            className={`flex-shrink-0 text-gray-300 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="text-xs text-gray-500">{log.executed_at ? new Date(log.executed_at).toLocaleString() : '—'}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">{relativeTime(log.executed_at)}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${color} ${bg}`}>
            <Icon size={10} />
            {label}
          </span>
        </div>
      </div>

      {/* Run detail */}
      {expanded && (
        <div className="pl-14 pr-4 pb-3 pt-1 grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/60">
          <DetailCell label="Records Processed" value={log.records_processed ?? '—'} />
          <DetailCell label="Execution Time"     value={formatDuration(log.execution_time_seconds)} />
          <DetailCell label="ID"                 value={`#${log.id}`} />
          <DetailCell label="Duration"           value={formatDuration(log.execution_time_seconds)} />

          {log.error_message && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">Error Message</p>
              <pre className="text-xs bg-red-50 text-red-700 rounded p-3 overflow-auto whitespace-pre-wrap font-mono">
                {log.error_message}
              </pre>
            </div>
          )}

          {log.details && Object.keys(log.details).length > 0 && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">Additional Details</p>
              <pre className="text-xs bg-gray-100 text-gray-700 rounded p-3 overflow-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── grouped scraper row ───────────────────────────────────────── */
function GroupRow({ scraperName, logs }) {
  const [expanded, setExpanded] = useState(false);

  const latestLog = logs[0]; // assumed sorted newest-first
  const status    = groupStatus(logs);
  const { label, Icon, color, bg, dot } = statusMeta(status);

  // mini counts
  const counts = useMemo(() => {
    const c = { success: 0, error: 0, partial: 0 };
    logs.forEach(l => { if (c[l.status] !== undefined) c[l.status]++; });
    return c;
  }, [logs]);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Group header row */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            size={13}
            className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <span className="text-sm text-gray-800 font-medium truncate">{scraperName}</span>
          {/* run count badge */}
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {logs.length} run{logs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* mini status pills */}
          <div className="hidden sm:flex items-center gap-1">
            {counts.success > 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {counts.success}✓
              </span>
            )}
            {counts.error > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                {counts.error}✗
              </span>
            )}
            {counts.partial > 0 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                {counts.partial}~
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{relativeTime(latestLog?.executed_at)}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${color} ${bg}`}>
            <Icon size={11} />
            {label}
          </span>
        </div>
      </div>

      {/* Expanded: list all individual runs */}
      {expanded && (
        <div className="bg-gray-50/40">
          {logs.map(log => (
            <RunRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function DetailCell({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-xs text-gray-700 font-semibold">{String(value)}</p>
    </div>
  );
}

/* ─── filter bar ────────────────────────────────────────────────── */
function FilterBar({ query, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
      <input
        type="text"
        placeholder="Filter by scraper name…"
        value={query.scraper_name}
        onChange={e => onChange({ ...query, scraper_name: e.target.value })}
        className="text-xs border border-gray-200 rounded px-3 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white"
      />
      <select
        value={query.status}
        onChange={e => onChange({ ...query, status: e.target.value })}
        className="text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white"
      >
        <option value="">All statuses</option>
        <option value="success">Success</option>
        <option value="error">Error</option>
        <option value="partial">Partial</option>
      </select>
      <select
        value={query.limit}
        onChange={e => onChange({ ...query, limit: e.target.value })}
        className="text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white"
      >
        <option value="20">Last 20</option>
        <option value="50">Last 50</option>
        <option value="100">Last 100</option>
      </select>
    </div>
  );
}

/* ─── skeleton loader ───────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 last:border-b-0 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-gray-200" />
        <div className="w-2 h-2 rounded-full bg-gray-200" />
        <div className="h-3 w-44 bg-gray-200 rounded" />
        <div className="h-4 w-12 bg-gray-100 rounded-full" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 w-14 bg-gray-200 rounded" />
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

/* ─── summary chips ─────────────────────────────────────────────── */
function SummaryChips({ logs }) {
  const counts = useMemo(() => {
    const c = { success: 0, error: 0, partial: 0 };
    logs.forEach(l => { if (c[l.status] !== undefined) c[l.status]++; });
    return c;
  }, [logs]);

  return (
    <div className="flex gap-2 px-4 py-2.5 border-b border-gray-100 bg-white flex-wrap">
      <Chip label={`${counts.success} Success`}  color="text-emerald-700 bg-emerald-50 border-emerald-200" />
      <Chip label={`${counts.error} Error`}      color="text-red-700 bg-red-50 border-red-200"             />
      <Chip label={`${counts.partial} Partial`}  color="text-amber-700 bg-amber-50 border-amber-200"       />
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

/* ─── main component ────────────────────────────────────────────── */
export default function ServicesTable() {
  const [query, setQuery] = useState({ scraper_name: '', status: '', limit: '50' });

  const { logs, loading, error, refetch, lastFetched } = useScraperLogs(query, 30_000);

  // Group logs by scraper_name, preserving newest-first order within each group
  const groups = useMemo(() => {
    const map = new Map();
    logs.forEach(log => {
      if (!map.has(log.scraper_name)) map.set(log.scraper_name, []);
      map.get(log.scraper_name).push(log);
    });
    // Return as array of { scraperName, logs } sorted by latest run descending
    return Array.from(map.entries())
      .map(([scraperName, groupLogs]) => ({ scraperName, logs: groupLogs }))
      .sort((a, b) => new Date(b.logs[0]?.executed_at) - new Date(a.logs[0]?.executed_at));
  }, [logs]);

  return (
    <div className="max-w-2xl mx-auto px-4 mt-8 mb-12">
      <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm">

        {/* Header */}
        <div className="bg-[#1565C0] px-4 py-3 flex items-center justify-between">
          <span className="text-white font-semibold text-sm">Automation Execution Logs</span>
          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-blue-200 text-xs hidden sm:block">
                Updated {relativeTime(lastFetched)}
              </span>
            )}
            <button
              onClick={refetch}
              disabled={loading}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar query={query} onChange={setQuery} />

        {/* Summary chips (totals across all runs) */}
        {!loading && !error && logs.length > 0 && <SummaryChips logs={logs} />}

        {/* Body */}
        <div className="bg-white">
          {loading && (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <XCircle size={32} className="text-red-400 mb-3" />
              <p className="text-sm font-semibold text-red-600 mb-1">Failed to load logs</p>
              <p className="text-xs text-gray-400 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="text-xs bg-[#1565C0] text-white px-4 py-2 rounded hover:bg-[#0d47a1] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock size={32} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">No execution logs found.</p>
              <p className="text-xs text-gray-300 mt-1">Try adjusting your filters.</p>
            </div>
          )}

          {!loading && !error && groups.map(({ scraperName, logs: groupLogs }) => (
            <GroupRow key={scraperName} scraperName={scraperName} logs={groupLogs} />
          ))}
        </div>

      </div>
    </div>
  );
}