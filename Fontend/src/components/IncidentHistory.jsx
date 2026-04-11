import React from 'react';
import { AlertTriangle, Info, CheckCircle2, AlertCircle, AlertOctagon } from 'lucide-react';
import moment from 'moment';

const IncidentHistory = ({ incidents, loading }) => {
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!incidents || incidents.length === 0) {
        return (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center mt-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">No Incidents Reported</h3>
                <p className="text-gray-500 mt-2">All systems have been fully operational over the history period.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Past Incidents</h2>
            
            <div className="relative border-l-2 border-gray-200 ml-4 space-y-10 py-2">
                {incidents.map((incident) => {
                    const isResolved = incident.is_resolved;
                    const Icon = isResolved ? CheckCircle2 : AlertTriangle;
                    
                    return (
                        <div key={incident.id} className="relative pl-8">
                            {/* Timeline marker */}
                            <div className={`absolute -left-[17px] top-1 p-1 rounded-full border-4 border-white ${isResolved ? 'bg-emerald-500' : 'bg-red-500'} flex items-center justify-center`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between gap-3">
                                    <h3 className="text-lg font-bold text-gray-900">{incident.title}</h3>
                                    <span className={`self-start text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                        {isResolved ? 'Resolved' : 'Active'}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <p className="text-gray-700 whitespace-pre-wrap">{incident.description || 'No detailed description provided.'}</p>
                                    
                                    <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-gray-500">
                                        <div>
                                            <strong className="text-gray-700 font-medium block mb-1">Incident Started</strong>
                                            {moment(incident.started_at).format('MMM D, YYYY - h:mm A z')}
                                        </div>
                                        {isResolved && (
                                            <div>
                                                <strong className="text-gray-700 font-medium block mb-1">Resolved At</strong>
                                                {moment(incident.resolved_at).format('MMM D, YYYY - h:mm A z')}
                                            </div>
                                        )}
                                        {incident.duration_display && (
                                            <div>
                                                <strong className="text-gray-700 font-medium block mb-1">Downtime Duration</strong>
                                                {incident.duration_display}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default IncidentHistory;
