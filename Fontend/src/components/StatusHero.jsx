import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

const StatusHero = ({ status, loading }) => {
    // Determine the theme based on the current status
    const getTheme = (statusStr) => {
        const s = (statusStr || '').toLowerCase();
        if (loading) {
            return {
                bg: 'bg-gray-100',
                border: 'border-gray-200',
                text: 'text-gray-500',
                icon: <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-500 rounded-full" />,
                title: 'Checking System Status...',
                subtitle: 'Fetching the latest metrics'
            };
        }
        
        switch (s) {
            case 'operational':
                return {
                    bg: 'bg-emerald-50',
                    border: 'border-emerald-200',
                    text: 'text-emerald-700',
                    icon: <CheckCircle className="w-10 h-10 text-emerald-500" />,
                    title: 'All Systems Operational',
                    subtitle: 'Our systems are running smoothly without any issues.'
                };
            case 'degraded':
                return {
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-200',
                    text: 'text-yellow-700',
                    icon: <AlertCircle className="w-10 h-10 text-yellow-500" />,
                    title: 'Degraded Performance',
                    subtitle: 'Some services are experiencing delays or minor issues.'
                };
            case 'partial_outage':
                return {
                    bg: 'bg-orange-50',
                    border: 'border-orange-200',
                    text: 'text-orange-700',
                    icon: <AlertTriangle className="w-10 h-10 text-orange-500" />,
                    title: 'Partial System Outage',
                    subtitle: 'One or more non-critical features are currently unavailable.'
                };
            case 'major_outage':
                return {
                    bg: 'bg-rose-50',
                    border: 'border-rose-200',
                    text: 'text-rose-700',
                    icon: <XCircle className="w-10 h-10 text-rose-500" />,
                    title: 'Major System Outage',
                    subtitle: 'We are currently experiencing a significant disruption. Our engineers are investigating.'
                };
            default:
                return {
                    bg: 'bg-gray-50',
                    border: 'border-gray-200',
                    text: 'text-gray-700',
                    icon: <CheckCircle className="w-10 h-10 text-gray-400" />,
                    title: 'System Status Unknown',
                    subtitle: 'We are unable to verify the status at this moment.'
                };
        }
    };

    const theme = getTheme(status);

    return (
        <div className={`w-full p-8 md:p-12 border rounded-xl shadow-sm transition-colors duration-500 flex flex-col md:flex-row items-center gap-6 ${theme.bg} ${theme.border}`}>
            <div className="flex-shrink-0 bg-white p-3 rounded-full shadow-sm">
                {theme.icon}
            </div>
            <div className="text-center md:text-left flex-1">
                <h1 className={`text-2xl md:text-3xl font-bold mb-2 tracking-tight ${theme.text}`}>
                    {theme.title}
                </h1>
                <p className="text-gray-600 font-medium">
                    {theme.subtitle}
                </p>
            </div>
            {!loading && (
                <div className="flex-shrink-0 text-sm text-gray-500 font-medium bg-white/60 px-4 py-2 rounded-lg border border-gray-200">
                    Refreshes automatically
                </div>
            )}
        </div>
    );
};

export default StatusHero;
