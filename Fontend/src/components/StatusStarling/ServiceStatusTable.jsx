import { CheckCircle2, XCircle } from 'lucide-react';

export default function ServiceStatusTable({ services, loading }) {
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-8 mb-12">
        <div className="text-center text-gray-500 py-8 animate-pulse">Loading service statuses...</div>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-8 mb-12 text-center text-gray-500 text-sm">
        No services to display.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 mt-8 mb-12">
      <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <div className="bg-[#1565C0] px-4 py-3 flex items-center justify-between">
          <span className="text-white font-semibold text-sm">Services Uptime Status</span>
        </div>
        <div className="bg-white">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="border-b border-gray-100 last:border-b-0 px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {svc.is_operational ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : (
                  <XCircle size={20} className="text-red-500" />
                )}
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">{svc.service_name}</span>
                  <span className="text-xs text-gray-400 block mt-0.5">
                    Last checked: {svc.last_checked_at ? new Date(svc.last_checked_at).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-base font-bold text-gray-700">{svc.uptime_percentage}%</span>
                <span className="text-xs font-medium text-gray-400">Uptime</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
