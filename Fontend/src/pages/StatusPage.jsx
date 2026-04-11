import React, { useState, useEffect } from 'react';
import api from '../api';
import StatusHero from '../components/StatusHero';
import ServiceList from '../components/ServiceList';
import IncidentHistory from '../components/IncidentHistory';
import { Shield } from 'lucide-react';

const StatusPage = () => {
    const [activeTab, setActiveTab] = useState('live');
    
    // State
    const [overallStatus, setOverallStatus] = useState(null);
    const [services, setServices] = useState([]);
    const [incidents, setIncidents] = useState([]);
    
    const [loadingHero, setLoadingHero] = useState(true);
    const [loadingServices, setLoadingServices] = useState(true);
    const [loadingIncidents, setLoadingIncidents] = useState(true);

    const fetchData = async () => {
        try {
            // Fetch overall status
            api.get('').then(res => {
                setOverallStatus(res.data.overall_status);
                setLoadingHero(false);
            }).catch(err => {
                console.error("Error fetching overall status:", err);
                setLoadingHero(false);
            });

            // Fetch services
            api.get('services/').then(res => {
                setServices(res.data);
                setLoadingServices(false);
            }).catch(err => {
                console.error("Error fetching services:", err);
                setLoadingServices(false);
            });

            // Fetch incidents
            api.get('incidents/history/').then(res => {
                setIncidents(res.data);
                setLoadingIncidents(false);
            }).catch(err => {
                console.error("Error fetching incidents:", err);
                setLoadingIncidents(false);
            });

        } catch (error) {
            console.error("Error in fetching status data:", error);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Polling every 60 seconds
        const intervalId = setInterval(fetchData, 60000);
        return () => clearInterval(intervalId);
    }, []);

    const TabButton = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`pb-4 px-6 font-bold text-sm tracking-widest uppercase transition-colors border-b-[3px] ${
                activeTab === id 
                ? 'border-[#1565C0] text-[#1565C0]' 
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <Shield className="w-8 h-8 text-indigo-600" />
                            <span className="font-bold text-xl tracking-tight text-gray-900">
                                Sterling Status
                            </span>
                        </div>
                        <div>
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                Subscribe to Updates
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Hero Section */}
                <StatusHero status={overallStatus} loading={loadingHero} />

                {/* Tabs */}
                <div className="mt-12">
                    <div className="border-b border-gray-200">
                        <div className="flex justify-center gap-2 sm:gap-8 overflow-x-auto">
                            <TabButton id="live" label="Live Updates" />
                            <TabButton id="history" label="History" />
                            <TabButton id="report" label="Report Issue" />
                        </div>
                    </div>

                    <div className="py-6">
                        {activeTab === 'live' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <ServiceList services={services} loading={loadingServices} />
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <IncidentHistory incidents={incidents} loading={loadingIncidents} />
                            </div>
                        )}
                        
                        {activeTab === 'report' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-center py-12">
                                <p className="text-gray-500">Please contact support at support@sterlingseptic.com to report an issue.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200 mt-12">
                <p className="text-center text-gray-400 text-sm">
                    &copy; {new Date().getFullYear()} Sterling Dashboard Health Monitor. All rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default StatusPage;
