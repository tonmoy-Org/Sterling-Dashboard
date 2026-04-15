import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Clock, RefreshCw } from 'lucide-react';
import { useIncidentLogs } from '../../hooks/useStatusData';

function relativeTime(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function IncidentRow({ incident }) {
  const [open, setOpen] = useState(false);
  const isResolved = incident.status === 'resolved';

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Clickable header */}
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

        <span className="text-sm font-semibold text-gray-800 flex-1">
          {incident.title}
        </span>

        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${isResolved ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
          {isResolved ? 'Resolved' : 'Active'}
        </span>

        <span className="text-xs text-gray-400 flex-shrink-0">
          {relativeTime(incident.created_at)}
        </span>

        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-5 pb-4 pl-12">
          <p className="text-xs text-gray-500 mb-2">
            Service: <strong>{incident.service_name}</strong>
            &nbsp;·&nbsp;
            {new Date(incident.created_at).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {incident.description}
          </p>

          {isResolved && incident.resolution_description && (
            <div className="mt-3 bg-gray-50 p-3 rounded border border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-1">
                Resolution Details:
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

export default function IncidentHistoryTable() {
  const [query, setQuery] = useState({ status: '', service_name: '' });
  const { incidents, loading, error, refetch, lastFetched } = useIncidentLogs(query, 30_000);

  return (
    <div className="max-w-2xl mx-auto px-4 mt-8 mb-12">
      <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-[#1565C0] px-4 py-3 flex items-center justify-between">
          <span className="text-white font-semibold text-sm">Incident History</span>
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
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <select
            value={query.status}
            onChange={e => setQuery({ ...query, status: e.target.value })}
            className="text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white"
          >
            <option value="">All Incidents</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Body */}
        <div className="bg-white min-h-[200px]">
          {loading && incidents.length === 0 && (
            <div className="text-center text-gray-500 py-12 animate-pulse text-sm">Loading incident history...</div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <AlertCircle size={32} className="text-red-400 mb-3" />
              <p className="text-sm font-semibold text-red-600 mb-1">Failed to load incidents</p>
              <p className="text-xs text-gray-400 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="text-xs bg-[#1565C0] text-white px-4 py-2 rounded hover:bg-[#0d47a1] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && incidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
              <p className="text-sm font-semibold text-gray-600">No incidents to display.</p>
              <p className="text-xs text-gray-400 mt-1">Systems are operating smoothly.</p>
            </div>
          )}

          {!error && incidents.length > 0 && (
            <div>
              {incidents.map(incident => (
                <IncidentRow key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
