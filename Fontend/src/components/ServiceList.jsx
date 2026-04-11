import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';

const StatusLabel = ({ status }) => {
    switch ((status || '').toLowerCase()) {
        case 'operational': return <span className="text-[#1565C0] font-semibold text-[15px]">Operational</span>;
        case 'degraded': return <span className="text-yellow-600 font-semibold text-[15px]">Degraded</span>;
        case 'partial_outage': return <span className="text-orange-600 font-semibold text-[15px]">Partial Outage</span>;
        case 'major_outage': return <span className="text-red-600 font-semibold text-[15px]">Major Outage</span>;
        default: return <span className="text-gray-500 font-semibold text-[15px]">Unknown</span>;
    }
};

const ServiceList = ({ services, loading }) => {
    if (loading) {
        return (
            <div className="bg-white border text-left rounded-md shadow-sm divide-y divide-gray-100 animate-pulse mt-4">
                <div className="bg-[#1565C0] p-4 flex items-center">
                    <div className="h-5 bg-blue-400/50 rounded w-24"></div>
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-gray-200 rounded"></div>
                            <div className="h-5 bg-gray-200 rounded w-48"></div>
                        </div>
                        <div className="h-5 bg-gray-200 rounded w-24"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!services || services.length === 0) {
        return (
            <div className="bg-white border rounded-md p-10 text-center mt-4">
                <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="text-gray-900 font-medium">No services monitored</h3>
                <p className="text-gray-500 text-sm mt-1">Check back later or configure some services.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden mt-4">
            {/* Header */}
            <div className="bg-[#1565C0] text-white px-5 py-3.5 font-bold text-lg">
                Services
            </div>
            
            {/* List */}
            <div className="divide-y divide-gray-200">
                {services.map((service) => (
                    <div key={service.id} className="px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center text-gray-700 group-hover:text-gray-900">
                            <span className="text-gray-400 mr-3">
                                <ChevronRight className="w-4 h-4" />
                            </span>
                            <span className="text-[15px] font-sans">
                                {service.name}
                            </span>
                        </div>
                        <div className="flex items-center text-right">
                            <StatusLabel status={service.current_status} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ServiceList;
