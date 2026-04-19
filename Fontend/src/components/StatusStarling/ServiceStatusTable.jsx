import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

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
          className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i + 1)}
            className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${
              current === i + 1 
                ? 'bg-[#1565C0] text-white shadow-sm' 
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onPageChange(current + 1)}
          disabled={current === totalPages}
          className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}

/* ─── summary chips ─────────────────────────────────────────────── */
function SummaryChips({ services }) {
  const counts = useMemo(() => ({
    operational: services.filter(s => s.is_operational).length,
    down: services.filter(s => !s.is_operational).length
  }), [services]);

  return (
    <div className="flex gap-2 px-5 py-3 border-b border-gray-100 bg-white items-center">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Status:</span>
      <span className="text-[11px] font-bold px-3 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-100">
        {counts.operational} Operational
      </span>
      {counts.down > 0 && (
        <span className="text-[11px] font-bold px-3 py-0.5 rounded-full border text-red-700 bg-red-50 border-red-100">
          {counts.down} Outage
        </span>
      )}
    </div>
  );
}

export default function ServiceStatusTable({ services, loading }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = s.service_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'operational' ? s.is_operational : !s.is_operational;
      return matchesSearch && matchesStatus;
    });
  }, [services, search, statusFilter]);

  const paginatedServices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, page, pageSize]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-8 mb-12">
        <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm bg-white">
          <div className="bg-[#1565C0] px-4 py-3">
            <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="p-12 flex flex-col items-center gap-4">
            <RefreshCw size={32} className="animate-spin text-blue-200" />
            <p className="text-sm text-gray-400 font-medium">Loading system status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 mt-8 mb-12">
      <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm bg-white">
        {/* Header */}
        <div className="bg-[#1565C0] px-4 py-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-100" />
            <span className="text-white font-semibold text-sm">Services Uptime Status</span>
          </div>
          <span className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">
            Real-time
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/30">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search services…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="text-xs border border-gray-200 rounded pl-8 pr-3 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white transition-all shadow-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1565C0] bg-white shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="down">Degraded</option>
          </select>
        </div>

        {/* Summary */}
        <SummaryChips services={services} />

        {/* Body */}
        <div className="bg-white min-h-[200px]">
          {filteredServices.length === 0 ? (
            <div className="text-center py-20 px-4">
               <Filter size={32} className="mx-auto text-gray-200 mb-2" />
               <p className="text-sm text-gray-400 font-medium">No services match your criteria.</p>
            </div>
          ) : (
            paginatedServices.map((svc) => (
              <div
                key={svc.id}
                className="border-b border-gray-100 last:border-b-0 px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {svc.is_operational ? (
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    ) : (
                      <XCircle size={22} className="text-red-500" />
                    )}
                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${svc.is_operational ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-800 block group-hover:text-[#1565C0] transition-colors">
                      {svc.service_name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                      Checked {svc.last_checked_at ? new Date(svc.last_checked_at).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-base font-black ${svc.uptime_percentage >= 99 ? 'text-emerald-600' : svc.uptime_percentage >= 95 ? 'text-amber-600' : 'text-red-600'}`}>
                      {svc.uptime_percentage}%
                    </span>
                    <span className="text-[10px] font-bold text-gray-300 uppercase">Uptime</span>
                  </div>
                  {/* Progress bar preview */}
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${svc.is_operational ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${svc.uptime_percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <Pagination 
          total={filteredServices.length}
          current={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
