import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { notificationsApi } from '../api/services/notifications';
import { locatesApi } from '../api/services/locatesApi';
import { rmeApi } from '../api/services/rmeApi';
import { workOrdersApi } from '../api/services/workOrders';
import { useEffect, useCallback } from 'react';

const NOTIFICATIONS_CACHE_KEY = 'notifications-cache';
const NOTIFICATIONS_LAST_UPDATE = 'notifications-last-update';
const CACHE_DURATION = 8000;
const STALE_TIME = 5000;
const REFETCH_INTERVAL = 10000;
const WO_STALE_THRESHOLD = 24 * 60 * 60 * 1000;

const ONE_MONTH_AGO = (() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
})();

const EMPTY_RESPONSE = {
    locates: [],
    workOrders: [],
    allWorkOrders: [],
    latestNotifications: [],
    locatesCount: 0,
    workOrdersCount: 0,
    allWorkOrdersCount: 0,
    totalActualCount: 0,
    unseenLocateIds: [],
    unseenRmeIds: [],
    unseenAllWoIds: [],
    unseenIds: [],
    count: 0,
};

const formatDate = (dateString) => {
    if (!dateString) return null;
    const timestamp = new Date(dateString).getTime();
    return isNaN(timestamp) ? null : timestamp;
};

const filterUnseenNotifications = (data, createdAtField) => {
    return data.filter((item) => {
        const timestamp = formatDate(item[createdAtField]);
        return timestamp !== null && timestamp >= ONE_MONTH_AGO.getTime() && item.is_seen === false;
    });
};

const processLocates = (locatesData) => {
    const unseenLocates = filterUnseenNotifications(locatesData, 'created_at');

    return {
        count: unseenLocates.length,
        ids: unseenLocates.map(locate => `locate-${locate.id}`),
        notifications: unseenLocates.map(locate => ({
            id: `locate-${locate.id}`,
            type: 'locate',
            timestamp: formatDate(locate.created_at),
            data: locate,
        })),
    };
};

const processWorkOrders = (workOrdersData) => {
    const unseenWorkOrders = filterUnseenNotifications(workOrdersData, 'elapsed_time');

    return {
        count: unseenWorkOrders.length,
        ids: unseenWorkOrders.map(wo => `rme-${wo.id}`),
        notifications: unseenWorkOrders.map(wo => ({
            id: `rme-${wo.id}`,
            type: 'RME',
            timestamp: formatDate(wo.elapsed_time),
            data: wo,
        })),
    };
};

const processAllWorkOrders = (allWorkOrdersData) => {
    const now = Date.now();

    const activeWorkOrders = allWorkOrdersData.filter(wo => {
        // Use createdAt, or fallback to other timestamp fields if createdAt is null
        const timestamp = formatDate(wo.createdAt || wo.submittedAt || wo.viewedAt);
        // If timestamp is null (no valid date found), treat it as recent (include it)
        const isRecent = timestamp === null || (now - timestamp) <= WO_STALE_THRESHOLD;
        const isNotDeleted = wo.is_deleted === false;
        return isRecent && isNotDeleted;
    });

    const unseenWorkOrders = activeWorkOrders.filter(wo => {
        const hasNoUserSeen = Array.isArray(wo.user_seen_records) && wo.user_seen_records.length === 0;
        return hasNoUserSeen;
    });

    return {
        count: unseenWorkOrders.length,
        ids: unseenWorkOrders.map(wo => `wo-${wo.id}`),
        activeCount: activeWorkOrders.length,
        notifications: unseenWorkOrders.map(wo => ({
            id: `wo-${wo.id}`,
            type: 'work-order',
            timestamp: formatDate(wo.createdAt || wo.submittedAt || wo.viewedAt),
            data: wo,
        })),
    };
};

const buildResponse = (locatesData, workOrdersData, allWorkOrdersData) => {
    const locatesResult = processLocates(locatesData);
    const workOrdersResult = processWorkOrders(workOrdersData);
    const allWorkOrdersResult = processAllWorkOrders(allWorkOrdersData);

    const latestNotifications = [
        ...locatesResult.notifications,
        ...workOrdersResult.notifications,
        ...allWorkOrdersResult.notifications,
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);

    const totalCount = locatesResult.count + workOrdersResult.count + allWorkOrdersResult.count;

    return {
        locates: locatesData,
        workOrders: workOrdersData,
        allWorkOrders: allWorkOrdersData,
        latestNotifications,
        locatesCount: locatesResult.count,
        workOrdersCount: workOrdersResult.count,
        allWorkOrdersCount: allWorkOrdersResult.count,
        totalActualCount: totalCount,
        unseenLocateIds: locatesResult.ids,
        unseenRmeIds: workOrdersResult.ids,
        unseenAllWoIds: allWorkOrdersResult.ids,
        unseenIds: [...locatesResult.ids, ...workOrdersResult.ids, ...allWorkOrdersResult.ids],
        count: totalCount,
        lastUpdated: Date.now(),
    };
};

const getLocalCache = () => {
    try {
        const cached = sessionStorage.getItem(NOTIFICATIONS_CACHE_KEY);
        const lastUpdate = sessionStorage.getItem(NOTIFICATIONS_LAST_UPDATE);

        if (!cached || !lastUpdate) return null;

        const age = Date.now() - parseInt(lastUpdate, 10);
        if (age > CACHE_DURATION) {
            sessionStorage.removeItem(NOTIFICATIONS_CACHE_KEY);
            sessionStorage.removeItem(NOTIFICATIONS_LAST_UPDATE);
            return null;
        }

        return JSON.parse(cached);
    } catch {
        return null;
    }
};

const setLocalCache = (data) => {
    try {
        sessionStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(NOTIFICATIONS_LAST_UPDATE, Date.now().toString());
    } catch {
        // Silently fail if sessionStorage unavailable
    }
};

const clearLocalCache = () => {
    try {
        sessionStorage.removeItem(NOTIFICATIONS_CACHE_KEY);
        sessionStorage.removeItem(NOTIFICATIONS_LAST_UPDATE);
    } catch {
        // Silently fail
    }
};

export const useNotifications = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['notifications', user?.role],
        queryFn: async () => {
            if (!user) return EMPTY_RESPONSE;

            const role = user.role?.toUpperCase();
            if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
                return EMPTY_RESPONSE;
            }

            const localCache = getLocalCache();
            if (localCache) return localCache;

            try {
                const [locatesResult, workOrdersResult, allWorkOrdersResult] = await Promise.allSettled([
                    locatesApi.getAll(),
                    rmeApi.getAll(),
                    workOrdersApi.getAll(),
                ]);

                const locatesData = locatesResult.status === 'fulfilled'
                    ? (Array.isArray(locatesResult.value.data)
                        ? locatesResult.value.data
                        : locatesResult.value.data?.data || [])
                    : [];

                const workOrdersData = workOrdersResult.status === 'fulfilled'
                    ? (Array.isArray(workOrdersResult.value.data)
                        ? workOrdersResult.value.data
                        : workOrdersResult.value.data?.data || [])
                    : [];

                const allWorkOrdersData = allWorkOrdersResult.status === 'fulfilled'
                    ? (Array.isArray(allWorkOrdersResult.value.data)
                        ? allWorkOrdersResult.value.data
                        : allWorkOrdersResult.value.data?.data || [])
                    : [];

                const response = buildResponse(locatesData, workOrdersData, allWorkOrdersData);
                setLocalCache(response);
                return response;
            } catch (err) {
                console.error('Error fetching notifications:', err);
                return EMPTY_RESPONSE;
            }
        },
        staleTime: STALE_TIME,
        refetchInterval: REFETCH_INTERVAL,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2,
        enabled: !!user,
    });

    const invalidateCache = useCallback(() => {
        clearLocalCache();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, [queryClient]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                invalidateCache();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [invalidateCache]);

    useEffect(() => {
        const handleOnline = () => {
            invalidateCache();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [invalidateCache]);

    return {
        notifications: data,
        isLoading,
        isFetching,
        error,
        refetch,
        invalidateCache,
        clearLocalCache,
        badgeCount: data?.count || 0,
        totalCount: data?.totalActualCount || 0,
        locatesCount: data?.locatesCount || 0,
        rmeCount: data?.workOrdersCount || 0,
        allWorkOrdersCount: data?.allWorkOrdersCount || 0,
        unseenLocateIds: data?.unseenLocateIds || [],
        unseenRmeIds: data?.unseenRmeIds || [],
        unseenAllWoIds: data?.unseenAllWoIds || [],
        unseenIds: data?.unseenIds || [],
        latestNotifications: data?.latestNotifications || [],
        allWorkOrders: data?.allWorkOrders || [],
    };
};