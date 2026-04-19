import { useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locatesApi } from '../../../../../api/services/locatesApi';
import { parseDashboardAddress } from '../utils/addressUtils';
import {
  calculateExpirationDate,
  isTimerExpired,
  formatDate,
  formatTimeRemaining
} from '../utils/dateUtils';
import { useTimer } from './useTimer';

export const useLocates = (currentUserName = '', currentUserEmail = '') => {
  const queryClient = useQueryClient();
  const currentTime = useTimer();

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['locates-all'],
    queryFn: async () => {
      const res = await locatesApi.getAll();
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: deletedHistoryData = [], isLoading: isRecycleBinLoading } = useQuery({
    queryKey: ['locates-deleted-history'],
    queryFn: async () => {
      const res = await locatesApi.getAll();
      const allData = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return allData.filter(item => item.is_deleted === true);
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const invalidateAndRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['locates-all'] });
    queryClient.invalidateQueries({ queryKey: ['locates-deleted-history'] });
  };

  const markCalledMutation = useMutation({
    mutationFn: async ({ id, callType }) => {
      return locatesApi.markCalled(id, {
        locates_called: true,
        call_type: callType === 'STANDARD' ? 'Standard' : 'Emergency',
        called_at: new Date().toISOString(),
        called_by: currentUserName,
        called_by_email: currentUserEmail,
        timer_started: true,
        timer_expired: false,
        time_remaining: callType === 'STANDARD' ? '2 days' : '4 hours',
      });
    },
    onSuccess: invalidateAndRefetch,
  });

  const softDeleteBulkMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = Array.from(ids).map(id =>
        locatesApi.update(id, {
          is_deleted: true,
          deleted_date: new Date().toISOString(),
          deleted_by: currentUserName,
          deleted_by_email: currentUserEmail,
        })
      );
      await Promise.all(promises);
    },
    onSuccess: invalidateAndRefetch,
  });

  const completeWorkOrderManuallyMutation = useMutation({
    mutationFn: async (id) => {
      return locatesApi.update(id, {
        timer_expired: true,
        time_remaining: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: invalidateAndRefetch,
  });

  const bulkCompleteWorkOrdersMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = Array.from(ids).map(id =>
        locatesApi.update(id, {
          timer_expired: true,
          time_remaining: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
      );
      await Promise.all(promises);
    },
    onSuccess: invalidateAndRefetch,
  });

  const restoreFromRecycleBinMutation = useMutation({
    mutationFn: async (id) => {
      return locatesApi.update(id, {
        is_deleted: false,
        deleted_date: null,
        deleted_by: '',
        deleted_by_email: '',
      });
    },
    onSuccess: invalidateAndRefetch,
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map(id =>
        locatesApi.update(id, {
          is_deleted: false,
          deleted_date: null,
          deleted_by: '',
          deleted_by_email: '',
        })
      );
      await Promise.all(promises);
    },
    onSuccess: invalidateAndRefetch,
  });

  const permanentDeleteFromRecycleBinMutation = useMutation({
    mutationFn: async (id) => {
      return locatesApi.delete(id);
    },
    onSuccess: invalidateAndRefetch,
  });

  const bulkPermanentDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map(id => locatesApi.delete(id));
      return Promise.all(promises);
    },
    onSuccess: invalidateAndRefetch,
  });

  const markSeenMutation = useMutation({
    mutationFn: async (data) => locatesApi.markSeen(data),
    onSuccess: invalidateAndRefetch,
  });

  // ✅ NEW: Auto-expire mutation — writes completed_at to DB when timer runs out
  const autoExpireMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map(id =>
        locatesApi.update(id, {
          timer_expired: true,
          time_remaining: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
      );
      await Promise.all(promises);
    },
    onSuccess: invalidateAndRefetch,
  });

  const processed = useMemo(() => {
    return rawData
      .filter(item => !item.is_deleted)
      .map(item => {
        const addr = parseDashboardAddress(item.customer_address || '');
        const isEmergency = (item.call_type || '').toUpperCase().includes('EMERGENCY');
        const type = isEmergency ? 'EMERGENCY' : 'STANDARD';

        let timeRemainingText = '';
        let timeRemainingDetail = '';
        let timeRemainingColor = '#0F1115';
        let isExpired = false;

        const calledByName = item.called_by || '';
        const calledByEmail = item.called_by_email || '';

        const isAlreadyExpired = item.timer_expired === true;
        const shouldBeExpired = item.locates_called && item.called_at && item.call_type
          ? isTimerExpired(item.called_at, item.call_type)
          : false;

        isExpired = isAlreadyExpired || shouldBeExpired;

        if (item.locates_called && item.called_at && item.call_type) {
          const expirationDate = calculateExpirationDate(item.called_at, item.call_type);

          if (expirationDate) {
            const remainingMs = expirationDate.getTime() - currentTime.getTime();

            if (isExpired) {
              timeRemainingText = 'EXPIRED';
              timeRemainingDetail = `Expired on: ${formatDate(expirationDate)}`;
              timeRemainingColor = '#ef4444';
            } else {
              timeRemainingText = formatTimeRemaining(remainingMs);
              timeRemainingDetail = `Expires at: ${formatDate(expirationDate)}`;

              if (isEmergency) {
                if (remainingMs <= 60 * 60 * 1000) {
                  timeRemainingColor = '#ef4444';
                } else if (remainingMs <= 2 * 60 * 60 * 1000) {
                  timeRemainingColor = '#ed6c02';
                } else {
                  timeRemainingColor = '#1976d2';
                }
              } else {
                if (remainingMs <= 24 * 60 * 60 * 1000) {
                  timeRemainingColor = '#ed6c02';
                } else {
                  timeRemainingColor = '#1976d2';
                }
              }
            }
          }
        }

        const targetWorkDate = item.scheduled_date ?? "ASAP";

        return {
          id: item.id?.toString() || Math.random().toString(),
          workOrderId: item.id,
          jobId: item.work_order_number || 'N/A',
          workOrderNumber: item.work_order_number || '',
          customerName: item.customer_name || 'Unknown',
          ...addr,
          type,
          techName: item.tech_name || 'Unassigned',
          requestedDate: item.created_date,
          locatesCalled: !!item.locates_called,
          callType: item.call_type || null,
          calledByName,
          calledByEmail,
          calledAt: item.called_at,
          isExpired,
          timeRemainingText,
          timeRemainingDetail,
          timeRemainingColor,
          timerStarted: !!item.timer_started,
          timerExpired: !!item.timer_expired, // DB value
          timeRemainingApi: item.time_remaining || '',
          locateTriggeredDate: item.scraped_at,
          locateCalledInDate: item.called_at || '',
          clearToDigDate: item.completed_at || '',
          targetWorkDate,
          scheduledDateRaw: item.scheduled_date || 'ASAP',
          isEmergency,
        };
      });
  }, [rawData, currentTime]);

  // ✅ NEW: Auto-sync — when timer expires client-side, write completed_at to DB
  useEffect(() => {
    const unsyncedExpired = processed.filter(
      item =>
        item.isExpired &&       // timer has run out client-side
        !item.timerExpired &&   // but DB hasn't been updated yet
        item.locatesCalled      // only for items that were actually called
    );

    if (unsyncedExpired.length > 0) {
      const ids = unsyncedExpired.map(item => item.workOrderId);
      autoExpireMutation.mutate(ids);
    }
  }, [processed]);

  const recycleBinItems = useMemo(() => {
    if (!Array.isArray(deletedHistoryData)) return [];

    return deletedHistoryData
      .filter(item => item.is_deleted === true)
      .map(item => {
        const addr = parseDashboardAddress(item.customer_address || '');
        return {
          id: item.id?.toString() || Math.random().toString(),
          workOrderId: item.id,
          workOrderNumber: item.work_order_number || 'N/A',
          customerName: item.customer_name || 'Unknown',
          deletedBy: item.deleted_by || 'Unknown',
          deletedByEmail: item.deleted_by_email || '',
          deletedAt: item.deleted_date,
          type: (item.call_type || '').toUpperCase().includes('EMERGENCY') ? 'EMERGENCY' : 'STANDARD',
          ...addr,
        };
      });
  }, [deletedHistoryData]);

  const allPending = useMemo(() => {
    return processed.filter(l => !l.locatesCalled);
  }, [processed]);

  const inProgress = useMemo(() => {
    return processed.filter(l => l.locatesCalled && !l.isExpired);
  }, [processed]);

  const completed = useMemo(() => {
    return processed.filter(l => l.locatesCalled && l.isExpired);
  }, [processed]);

  return {
    rawData,
    isLoading,
    deletedHistoryData,
    isRecycleBinLoading,
    processed,
    recycleBinItems,
    allPending,
    inProgress,
    completed,
    mutations: {
      markCalledMutation,
      softDeleteBulkMutation,
      completeWorkOrderManuallyMutation,
      bulkCompleteWorkOrdersMutation,
      restoreFromRecycleBinMutation,
      bulkRestoreMutation,
      permanentDeleteFromRecycleBinMutation,
      bulkPermanentDeleteMutation,
      markSeenMutation,
    },
    invalidateAndRefetch,
  };
};