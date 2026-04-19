import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    LayoutDashboard,
    Users,
    MapPin,
    ClipboardCheck,
    Search,
    Wrench,
    UserCog,
    BarChart3,
    Star,
} from 'lucide-react';

import { useNotifications } from '../../../hooks/useNotifications';
import { workOrdersApi } from '../../../api/services/workOrders';
import { dispatchKpiApi } from '../../../api/services/dispatchKpi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/AuthProvider';

const NOTIFICATION_PATHS = [
    '/super-admin-dashboard/locates/work-orders',
    '/super-admin-dashboard/rme/work-orders',
    '/super-admin-dashboard/customer-center',
    '/super-admin-dashboard/dispatch-kpi',
];

const MARK_SEEN_TIMEOUT = 5000;
const DEBOUNCE_DELAY = 500;

const getOneMonthAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
};

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const isValidDate = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

export const SuperAdminMenuComponent = ({ onMenuItemClick }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const pendingMarkSeen = useRef(new Set());
    const timeoutRefs = useRef(new Map());

    const { notifications, refetch, clearLocalCache } = useNotifications();

    const [optimisticallyCleared, setOptimisticallyCleared] = useState(new Set());

    const markNotificationsAsSeenForPath = useCallback(async (path) => {
        if (!notifications || !NOTIFICATION_PATHS.includes(path)) return;
        if (pendingMarkSeen.current.has(path)) return;

        const oneMonthAgo = getOneMonthAgo();
        let ids = [];
        let endpoint = '';
        let isWorkOrderPath = false;

        if (path === '/super-admin-dashboard/locates/work-orders') {
            ids = (notifications.locates || [])
                .filter(l => {
                    const dateValue = l.created_at || l.created_date;
                    return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !l.is_seen;
                })
                .map(l => l.id);
            endpoint = '/locates/mark-seen/';
        }
        else if (path === '/super-admin-dashboard/rme/work-orders') {
            ids = (notifications.workOrders || [])
                .filter(w => {
                    const dateValue = w.elapsed_time;
                    return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !w.is_seen;
                })
                .map(w => w.id);
            endpoint = '/work-orders-today/mark-seen/';
        }
        else if (path === '/super-admin-dashboard/customer-center') {
            const now = Date.now();
            const WO_STALE_THRESHOLD = 24 * 60 * 60 * 1000;

            ids = (notifications.allWorkOrders || [])
                .filter(wo => {
                    if (wo.is_deleted) return false;
                    const ts = wo.createdAt ? new Date(wo.createdAt).getTime() : null;
                    const isRecent = ts === null || (!isNaN(ts) && (now - ts) <= WO_STALE_THRESHOLD);
                    const isUnseen = Array.isArray(wo.user_seen_records) && wo.user_seen_records.length === 0;
                    return isRecent && isUnseen;
                })
                .map(wo => wo.id);

            isWorkOrderPath = true;
        }
        else if (path === '/super-admin-dashboard/dispatch-kpi') {
            const now = Date.now();
            const WO_STALE_THRESHOLD = 24 * 60 * 60 * 1000;

            ids = (notifications.dispatchKpi || [])
                .filter(dkpi => {
                    if (dkpi.is_deleted) return false;
                    const ts = dkpi.date ? new Date(dkpi.date).getTime() : null;
                    const isRecent = ts === null || (!isNaN(ts) && (now - ts) <= WO_STALE_THRESHOLD);
                    const isUnseen = Array.isArray(dkpi.user_seen_records) && dkpi.user_seen_records.length === 0;
                    return isRecent && isUnseen;
                })
                .map(dkpi => dkpi.id);
        }

        if (ids.length === 0) return;

        setOptimisticallyCleared(prev => new Set([...prev, path]));
        pendingMarkSeen.current.add(path);

        const timeoutId = setTimeout(() => {
            pendingMarkSeen.current.delete(path);
            setOptimisticallyCleared(prev => {
                const next = new Set(prev);
                next.delete(path);
                return next;
            });
        }, MARK_SEEN_TIMEOUT);

        timeoutRefs.current.set(path, timeoutId);

        try {
            if (isWorkOrderPath) {
                await Promise.all(
                    ids.map(id =>
                        workOrdersApi.markSeen({
                            user: user?.id,
                            work_order: id,
                        })
                    )
                );

                clearLocalCache?.();
                queryClient.setQueryData(['notifications', user?.role], (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        allWorkOrders: old.allWorkOrders.map(wo =>
                            ids.includes(wo.id)
                                ? { ...wo, user_seen_records: [{ user: user?.id }] }
                                : wo
                        ),
                    };
                });
            } else if (path === '/super-admin-dashboard/dispatch-kpi') {
                await Promise.all(
                    ids.map(id =>
                        dispatchKpiApi.markSeen({
                            user: user?.id,
                            dispatcher_booked: id,
                        })
                    )
                );

                clearLocalCache?.();
                queryClient.setQueryData(['notifications', user?.role], (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        dispatchKpi: (old.dispatchKpi || []).map(dkpi =>
                            ids.includes(dkpi.id)
                                ? { ...dkpi, user_seen_records: [{ user: user?.id }] }
                                : dkpi
                        ),
                    };
                });
            } else {
                await workOrdersApi.post(endpoint, { ids });
            }

            clearTimeout(timeoutId);
            timeoutRefs.current.delete(path);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            await refetch();
        } catch (error) {
            clearTimeout(timeoutId);
            timeoutRefs.current.delete(path);
            setOptimisticallyCleared(prev => {
                const next = new Set(prev);
                next.delete(path);
                return next;
            });
        } finally {
            pendingMarkSeen.current.delete(path);
        }
    }, [notifications, queryClient, refetch, clearLocalCache, user]);

    const debouncedMarkSeen = useMemo(
        () => debounce(markNotificationsAsSeenForPath, DEBOUNCE_DELAY),
        [markNotificationsAsSeenForPath]
    );

    useEffect(() => {
        if (!notifications) return;

        const oneMonthAgo = getOneMonthAgo();
        const now = Date.now();
        const WO_STALE_THRESHOLD = 24 * 60 * 60 * 1000;

        setOptimisticallyCleared(prev => {
            const next = new Set(prev);
            for (const path of prev) {
                let hasUnseen = false;

                if (path === '/super-admin-dashboard/locates/work-orders') {
                    hasUnseen = (notifications.locates || []).some(l => {
                        const dateValue = l.created_at || l.created_date;
                        return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !l.is_seen;
                    });
                } else if (path === '/super-admin-dashboard/rme/work-orders') {
                    hasUnseen = (notifications.workOrders || []).some(w => {
                        const dateValue = w.elapsed_time;
                        return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !w.is_seen;
                    });
                } else if (path === '/super-admin-dashboard/customer-center') {
                    hasUnseen = (notifications.allWorkOrders || []).some(wo => {
                        if (wo.is_deleted) return false;
                        const ts = wo.createdAt ? new Date(wo.createdAt).getTime() : null;
                        const isRecent = ts === null || (!isNaN(ts) && (now - ts) <= WO_STALE_THRESHOLD);
                        const isUnseen = Array.isArray(wo.user_seen_records) && wo.user_seen_records.length === 0;
                        return isRecent && isUnseen;
                    });
                } else if (path === '/super-admin-dashboard/dispatch-kpi') {
                    hasUnseen = (notifications.dispatchKpi || []).some(dkpi => {
                        if (dkpi.is_deleted) return false;
                        const ts = dkpi.date ? new Date(dkpi.date).getTime() : null;
                        const isRecent = ts === null || (!isNaN(ts) && (now - ts) <= WO_STALE_THRESHOLD);
                        const isUnseen = Array.isArray(dkpi.user_seen_records) && dkpi.user_seen_records.length === 0;
                        return isRecent && isUnseen;
                    });
                }

                if (!hasUnseen) next.delete(path);
            }
            return next;
        });
    }, [notifications]);

    useEffect(() => {
        if (NOTIFICATION_PATHS.includes(location.pathname)) {
            debouncedMarkSeen(location.pathname);
        }
    }, [location.pathname, debouncedMarkSeen]);

    useEffect(() => {
        return () => {
            timeoutRefs.current.forEach(id => clearTimeout(id));
            timeoutRefs.current.clear();
        };
    }, []);

    const handleMenuItemClick = useCallback((path) => {
        if (path.startsWith('http')) {
            window.open(path, '_blank');
        } else {
            navigate(path);
        }
        onMenuItemClick?.(path);
    }, [navigate, onMenuItemClick]);

    const itemCounts = useMemo(() => {
        if (!notifications) return {};

        const oneMonthAgo = getOneMonthAgo();
        const now = Date.now();
        const WO_STALE_THRESHOLD = 24 * 60 * 60 * 1000;

        const locatesPath = '/super-admin-dashboard/locates/work-orders';
        const rmePath = '/super-admin-dashboard/rme/work-orders';
        const ccPath = '/super-admin-dashboard/customer-center';
        const dkpiPath = '/super-admin-dashboard/dispatch-kpi';

        return {
            [locatesPath]: optimisticallyCleared.has(locatesPath)
                ? 0
                : (notifications.locates || []).filter(l => {
                    const dateValue = l.created_at || l.created_date;
                    return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !l.is_seen;
                }).length,

            [rmePath]: optimisticallyCleared.has(rmePath)
                ? 0
                : (notifications.workOrders || []).filter(w => {
                    const dateValue = w.elapsed_time;
                    return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !w.is_seen;
                }).length,

            [ccPath]: optimisticallyCleared.has(ccPath)
                ? 0
                : (notifications.allWorkOrders || []).filter(wo => {
                    if (wo.is_deleted) return false;
                    const ts = wo.createdAt ? new Date(wo.createdAt).getTime() : null;
                    const isRecent = ts === null || (!isNaN(ts) && (now - ts) <= WO_STALE_THRESHOLD);
                    const isUnseen = Array.isArray(wo.user_seen_records) && wo.user_seen_records.length === 0;
                    return isRecent && isUnseen;
                }).length,
                
            [dkpiPath]: optimisticallyCleared.has(dkpiPath)
                ? 0
                : (notifications.dispatchKpi || []).filter(dkpi => {
                    if (dkpi.is_deleted) return false;
                    const ts = dkpi.date ? new Date(dkpi.date).getTime() : null;
                    const isRecent = ts === null || (!isNaN(ts) && (now - ts) <= WO_STALE_THRESHOLD);
                    const isUnseen = Array.isArray(dkpi.user_seen_records) && dkpi.user_seen_records.length === 0;
                    return isRecent && isUnseen;
                }).length,
        };
    }, [notifications, optimisticallyCleared]);

    const menuItems = [
        // /super-admin-dashboard → DASHBOARD
        {
            text: 'Dashboard',
            icon: <LayoutDashboard size={18} />,
            path: '/super-admin-dashboard',
            section: 'DASHBOARD',
        },

        // /super-admin-dashboard/locates/... and /repairs → OPERATIONS
        {
            text: 'Locates',
            icon: <MapPin size={18} />,
            path: '/super-admin-dashboard/locates/work-orders',
            parent: 'Operations',
            indent: 1,
            section: 'OPERATIONS',
        },
        {
            text: 'Tank Repairs',
            icon: <Wrench size={18} />,
            path: '/super-admin-dashboard/repairs',
            parent: 'Work Orders',
            indent: 1,
            section: 'OPERATIONS',
        },

        // /super-admin-dashboard/users → MANAGEMENT
        {
            text: 'Users',
            icon: <Users size={18} />,
            path: '/super-admin-dashboard/users',
            section: 'MANAGEMENT',
        },

        // /super-admin-dashboard/rme/..., /customer-center, /dispatch-kpi, /review-tracking → SYSTEM
        {
            text: 'RME Reports',
            icon: <ClipboardCheck size={18} />,
            path: '/super-admin-dashboard/rme/work-orders',
            parent: 'Health Dept Reports',
            grandparent: 'Reports',
            indent: 2,
            section: 'SYSTEM',
        },
        {
            text: 'Customer Center',
            icon: <UserCog size={18} />,
            path: '/super-admin-dashboard/customer-center',
            section: 'SYSTEM',
        },
        {
            text: 'Dispatch KPI',
            icon: <BarChart3 size={18} />,
            path: '/super-admin-dashboard/dispatch-kpi',
            section: 'SYSTEM',
        },
        {
            text: 'Review Tracking',
            icon: <Star size={18} />,
            path: '/super-admin-dashboard/review-tracking',
            section: 'SYSTEM',
        },

        // external URL → RESOURCES
        {
            text: 'Lookup',
            icon: <Search size={18} />,
            path: 'https://dashboard.sterlingsepticandplumbing.com/lookup',
            section: 'RESOURCES',
        },
    ];

    return Object.entries(
        menuItems.reduce((acc, item) => {
            if (!acc[item.section]) acc[item.section] = [];
            acc[item.section].push(item);
            return acc;
        }, {})
    ).map(([sectionName, items]) => ({
        sectionName,
        items: items.map(item => {
            const count = itemCounts[item.path] ?? 0;
            return {
                ...item,
                onClick: () => handleMenuItemClick(item.path),
                count,
                hasCount: count > 0,
            };
        }),
    }));
};