import { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Clock, RefreshCw, Filter, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { useIncidentLogs } from '../../hooks/useStatusData';

/* ─── helpers ───────────────────────────────────────────────────── */
function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── individual incident row ───────────────────────────────────── */
function IncidentRow({ incident }) {
  const [open, setOpen] = useState(false);
  const isResolved = incident.status === 'resolved';

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex-shrink-0">
          {isResolved
            ? <CheckCircle2 size={18} className="text-emerald-500" />
            : <AlertCircle size={18} className="text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800 block truncate">
            {incident.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
              {incident.service_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isResolved ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
            {isResolved ? 'Resolved' : 'Active'}
          </span>
          <span className="text-xs text-gray-400">
            {relativeTime(incident.created_at)}
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 pl-12 bg-gray-50/30">
          <p className="text-xs text-gray-500 mb-2">
            Started: <strong>{new Date(incident.created_at).toLocaleString()}</strong>
            {incident.resolved_at && (
              <> &nbsp;·&nbsp; Resolved: <strong>{new Date(incident.resolved_at).toLocaleString()}</strong></>
            )}
          </p>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {incident.description}
          </div>

          {isResolved && incident.resolution_description && (
            <div className="mt-3 bg-white p-3 rounded border border-gray-100 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-tight">
                Resolution Details
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {incident.resolution_description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── grouped incident row ───────────────────────────────────────── */
function GroupRow({ groupName, incidents }) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = incidents.filter(i => i.status === 'active').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="bg-gray-50/80 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{groupName}</span>
          <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-md">
            {incidents.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              {activeCount} Active
            </span>
          )}
          {resolvedCount > 0 && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {resolvedCount} Resolved
            </span>
          )}
        </div>
      </div>
      {expanded && (
        <div>
          {incidents.map(incident => (
            <IncidentRow key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── filter bar ────────────────────────────────────────────────── */
function FilterBar({ query, setQuery }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
      <div className="relative">
        <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter by service…"
          value={query.service_name}
          onChange={e => setQuery({ ...query, service_name: e.target.value })}
          className="text-xs border border-gray-200 rounded pl-8 pr-3 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white text-gray-700"
        />
      </div>
      <select
        value={query.status}
        onChange={e => setQuery({ ...query, status: e.target.value })}
        className="text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white text-gray-700"
      >
        <option value="">All Statuses</option>
        <option value="active">Active Only</option>
        <option value="resolved">Resolved Only</option>
      </select>
      <select
        value={query.limit}
        onChange={e => setQuery({ ...query, limit: e.target.value })}
        className="text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white text-gray-700"
      >
        <option value="20">Last 20</option>
        <option value="50">Last 50</option>
        <option value="100">Last 100</option>
      </select>
    </div>
  );
}

/* ─── summary chips ─────────────────────────────────────────────── */
function SummaryChips({ incidents }) {
  const counts = useMemo(() => ({
    active: incidents.filter(i => i.status === 'active').length,
    resolved: incidents.filter(i => i.status === 'resolved').length
  }), [incidents]);

  return (
    <div className="flex gap-2 px-4 py-2.5 border-b border-gray-100 bg-white items-center">
      <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Summary:</span>
      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border text-red-700 bg-red-50 border-red-200">
        {counts.active} Active
      </span>
      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
        {counts.resolved} Resolved
      </span>
    </div>
  );
}

/* ─── pagination ────────────────────────────────────────────────── */
function Pagination({ total, current, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
      <span className="text-[11px] text-gray-500 font-medium tracking-tight">
        Showing {(current - 1) * pageSize + 1} to {Math.min(current * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(current - 1)}
          disabled={current === 1}
          className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors shadow-sm"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i + 1)}
            className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all shadow-sm ${
              current === i + 1 
                ? 'bg-[#1565C0] text-white' 
                : 'text-gray-500 hover:bg-gray-200 bg-white'
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(current + 1)}
          disabled={current === totalPages}
          className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors shadow-sm"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────── */
export default function IncidentHistoryTable() {
  const [query, setQuery] = useState({ status: '', service_name: '', limit: '50' });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const { incidents, loading, error, refetch, lastFetched } = useIncidentLogs(query, 30_000);

  // Client-side pagination & grouping
  const paginatedIncidents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return incidents.slice(start, start + pageSize);
  }, [incidents, page, pageSize]);

  const groups = useMemo(() => {
    const map = new Map();
    paginatedIncidents.forEach(incident => {
      if (!map.has(incident.service_name)) map.set(incident.service_name, []);
      map.get(incident.service_name).push(incident);
    });
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [paginatedIncidents]);

  return (
    <div className="max-w-2xl mx-auto px-4 mt-8 mb-12">
      <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm bg-white">
        {/* Header */}
        <div className="bg-[#1565C0] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-100" />
            <span className="text-white font-semibold text-sm">Incident History</span>
          </div>
          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-blue-200 text-[10px] hidden sm:block uppercase tracking-wider font-bold">
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
        <FilterBar query={query} setQuery={(q) => { setQuery(q); setPage(1); }} />

        {/* Summary chips */}
        {!loading && !error && incidents.length > 0 && <SummaryChips incidents={incidents} />}

        {/* Body */}
        <div className="bg-white min-h-[300px]">
          {loading && incidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse text-gray-400">
               <RefreshCw size={32} className="animate-spin mb-4 opacity-20" />
               <p className="text-sm font-medium">Loading history...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <XCircle size={40} className="text-red-400 mb-3" />
              <p className="text-sm font-semibold text-red-600 mb-1">Failed to load incidents</p>
              <p className="text-xs text-gray-400 mb-6">{error}</p>
              <button
                onClick={refetch}
                className="text-xs bg-[#1565C0] text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-[#0d47a1] transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && incidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 size={40} className="text-emerald-400 mb-3 opacity-50" />
              <p className="text-sm font-semibold text-gray-600">No incidents found.</p>
              <p className="text-xs text-gray-400 mt-1">Everything looks healthy.</p>
            </div>
          )}

          {!error && groups.length > 0 && (
            <div>
              {groups.map(group => (
                <GroupRow key={group.name} groupName={group.name} incidents={group.items} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && incidents.length > 0 && (
          <Pagination 
            total={incidents.length} 
            current={page} 
            pageSize={pageSize} 
            onPageChange={setPage} 
          />
        )}
      </div>
    </div>
  );
}
