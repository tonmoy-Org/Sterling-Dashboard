import { useState } from 'react';
import HeroBanner from '../../components/StatusStarling/HeroBanner';
import TabNavigation from '../../components/StatusStarling/TabNavigation';
import ServicesTable from '../../components/StatusStarling/ServicesTable';
import ServiceStatusTable from '../../components/StatusStarling/ServiceStatusTable';
import IncidentHistoryTable from '../../components/StatusStarling/IncidentHistoryTable';
import { useServiceStatus, useIncidentLogs } from '../../hooks/useStatusData';

export default function Home() {
    // Defaulting to HISTORY tab just to show the requested response immediately
    // or you can leave it at 'LIVE UPDATES' based on preference
    const [activeTab, setActiveTab] = useState('LIVE UPDATES');

    // Fetch live service status for the hero banner — refresh every 60s
    const { services, loading: statusLoading, lastFetched: servicesLastFetched } = useServiceStatus(60_000);
    
    // Fetch active incidents to influence the overall status
    const { incidents, loading: incidentsLoading, lastFetched: incidentsLastFetched } = useIncidentLogs({ status: 'active' }, 60_000);

    // Derive overall status: 
    // 1. If any active incident exists -> DEGRADED
    // 2. If any CORE service (Database, API) is down -> DEGRADED
    // 3. Otherwise -> OPERATIONAL
    const overallStatus = (() => {
        if (statusLoading || incidentsLoading) return null;
        
        const hasActiveIncidents = incidents.some(i => i.status === 'active');
        
        // Check for CORE service failures
        const coreServices = ['Database', 'API Endpoint'];
        const hasCoreFailure = services.some(s => 
            coreServices.includes(s.service_name) && !s.is_operational
        );

        if (hasActiveIncidents || hasCoreFailure) return 'DEGRADED';
        
        return 'OPERATIONAL';
    })();

    const lastFetched = servicesLastFetched || incidentsLastFetched;
    const updatedLabel = lastFetched
        ? `Updated ${relativeTime(lastFetched)}`
        : 'Fetching status…';

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <HeroBanner status={overallStatus} updatedAt={updatedLabel} />
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            <main className="flex-1">
                {activeTab === 'LIVE UPDATES' && <ServicesTable />}

                {activeTab === 'LIVE UPTIME' && (
                    <ServiceStatusTable services={services} loading={statusLoading} />
                )}

                {activeTab === 'HISTORY' && <IncidentHistoryTable />}

                {activeTab === 'REPORT ISSUE' && (
                    <div className="max-w-2xl mx-auto px-4 mt-8 text-gray-500 text-sm">
                        To report an issue, please contact Sterling Septic &amp; Plumbing LLC support.
                    </div>
                )}
            </main>
        </div>
    );
}

function relativeTime(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}