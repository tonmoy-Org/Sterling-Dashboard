import React, { useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  IconButton,
  Divider,
  Stack,
  alpha,
  Button,
  Tooltip,
} from '@mui/material';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Bell,
  MapPin,
  Wrench,
  Clock,
  TrendingUp,
  Check,
  X,
  BarChart3,
  Star,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { Helmet } from 'react-helmet-async';
import { notificationsApi } from '../../api/services/notifications';
import { locatesApi } from '../../api/services/locatesApi';
import { rmeApi } from '../../api/services/rmeApi';
import { workOrdersApi } from '../../api/services/workOrders';
import { dispatchKpiApi } from '../../api/services/dispatchKpi';
import { reviewsApi } from '../../api/services/reviews';
import { useNavigate } from 'react-router-dom';
import { useGlobalSnackbar } from '../../context/GlobalSnackbarContext';
import DashboardLoader from '../Loader/DashboardLoader';
import { useAuth } from '../../auth/AuthProvider';

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const GRAY_COLOR = '#6b7280';
const PURPLE_COLOR = '#8b5cf6';
const ORANGE_COLOR = '#f59e0b';
const INDIGO_COLOR = '#6366f1';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`;
    } else if (diffInDays < 7) {
      return `${date.toLocaleDateString('en-US', {
        weekday: 'short',
      })} at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(',', '');
  } catch (e) {
    return '—';
  }
};

const parseDashboardAddress = (fullAddress) => {
  if (!fullAddress) return { street: '', city: '', state: '', zip: '', original: '' };
  const parts = fullAddress.split(' - ');
  if (parts.length < 2) return { street: fullAddress, city: '', state: '', zip: '', original: fullAddress };
  const street = parts[0].trim();
  const remaining = parts[1].trim();
  const zipMatch = remaining.match(/\b\d{5}\b/);
  const zip = zipMatch ? zipMatch[0] : '';
  const withoutZip = remaining.replace(zip, '').trim();
  const cityState = withoutZip.split(',').map(s => s.trim());
  return {
    street,
    city: cityState[0] || '',
    state: cityState[1] || '',
    zip,
    original: fullAddress,
  };
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return PURPLE_COLOR;
    case 'in_progress':
      return ORANGE_COLOR;
    case 'pending':
      return INDIGO_COLOR;
    default:
      return GRAY_COLOR;
  }
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications: combinedData, isLoading, error, refetch, clearLocalCache } = useNotifications();
  const { showSnackbar } = useGlobalSnackbar();
  const prevNotificationsRef = useRef([]);

  const getDashboardBasePath = () => {
    switch (user?.role?.toUpperCase()) {
      case 'SUPER-ADMIN':
      case 'SUPERADMIN':
        return '/super-admin-dashboard';
      case 'MANAGER':
        return '/manager-dashboard';
      case 'TECH':
        return '/tech-dashboard';
      default:
        return '/';
    }
  };

  const notifications = useMemo(() => {
    if (!combinedData) return [];

    const { locates = [], workOrders = [], allWorkOrders = [], dispatchKpi = [], reviews = [] } = combinedData;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const allNotifications = [];

    // Process locates
    locates.forEach((locate) => {
      const createdAt = locate.created_at || locate.created_date;
      if (!createdAt) return;

      const createdDate = new Date(createdAt);
      if (createdDate >= oneMonthAgo) {
        const addr = parseDashboardAddress(locate.customer_address || '');
        const customerName = locate.customer_name || 'Customer';
        const displayAddress = addr.original || 'Unknown address';

        allNotifications.push({
          id: `locate-${locate.id}`,
          type: 'locate',
          title: 'New Locate Request',
          description: `New locate request — ${displayAddress}`,
          address: displayAddress,
          workOrderNumber: locate.work_order_number || 'N/A',
          customerName: customerName,
          timestamp: createdDate,
          formattedTime: formatDate(createdAt),
          icon: MapPin,
          color: BLUE_COLOR,
          rawData: locate,
          is_seen: locate.is_seen || false,
          entityId: locate.id
        });
      }
    });

    // Process RME work orders
    workOrders.forEach((workOrder) => {
      const elapsedTime = workOrder.elapsed_time;
      if (!elapsedTime) return;

      try {
        const elapsedDate = new Date(elapsedTime);

        if (elapsedDate >= oneMonthAgo) {
          const address = workOrder.full_address || 'Unknown address';
          const addr = parseDashboardAddress(address);
          const customerName = workOrder.customer_name || 'Customer';
          const displayAddress = addr.original || 'Unknown address';

          allNotifications.push({
            id: `rme-${workOrder.id}`,
            type: 'RME',
            title: 'New RME Request',
            description: `New RME request — ${displayAddress}`,
            address: displayAddress,
            rmeNumber: workOrder.wo_number || workOrder.id || 'N/A',
            customerName: customerName,
            timestamp: elapsedDate,
            formattedTime: formatDate(elapsedTime),
            icon: Wrench,
            color: GREEN_COLOR,
            rawData: workOrder,
            is_seen: workOrder.is_seen || false,
            entityId: workOrder.id
          });
        }
      } catch (e) {
        console.error('Error parsing work order elapsed_time:', e);
      }
    });

    // Process all work orders from /work-orders/ endpoint (Customer Center)
    // FIXED: Handle null createdAt with fallback to current date
    allWorkOrders.forEach((workOrder) => {
      let createdAt = workOrder?.createdAt;

      // If createdAt is null, use current date as fallback
      if (!createdAt) {
        createdAt = new Date().toISOString();
      }

      if (workOrder.is_deleted) return;

      try {
        const createdDate = new Date(createdAt);

        if (createdDate >= oneMonthAgo) {
          const addr = parseDashboardAddress(workOrder.workOrderAddress || '');
          const customerName = workOrder.customerName || 'Customer';
          const statusColor = getStatusColor(workOrder.status);

          // Handle tag - can be array or string
          const tagArray = Array.isArray(workOrder.tag) ? workOrder.tag : workOrder.tag ? [workOrder.tag] : [];
          const tagName = tagArray[0] || null;

          const isSeen = Array.isArray(workOrder.user_seen_records) && workOrder.user_seen_records.length > 0;

          allNotifications.push({
            id: `wo-${workOrder.id}`,
            type: 'work-order',
            title: 'Work Order Request',
            description: `New work order request on customer center — ${tagName || 'No tag'}`,
            address: addr.original || 'Unknown address',
            workOrderNumber: workOrder.wo || 'N/A',
            customerName: customerName,
            timestamp: createdDate,
            formattedTime: formatDate(createdAt),
            icon: Wrench,
            color: statusColor,
            status: workOrder.status,
            tag: tagName,
            technicianName: workOrder.technicianName,
            note: workOrder.note,
            rawData: workOrder,
            is_seen: isSeen,
            entityId: workOrder.id
          });
        }
      } catch (e) {
        console.error('Error parsing work order createdAt:', e);
      }
    });

    // Process Dispatch KPI
    dispatchKpi.forEach((dkpi) => {
      const createdAt = dkpi.date;
      if (!createdAt || dkpi.is_deleted) return;

      try {
        const createdDate = new Date(createdAt);

        if (createdDate >= oneMonthAgo) {
          const isSeen = Array.isArray(dkpi.user_seen_records) && dkpi.user_seen_records.length > 0;

          allNotifications.push({
            id: `dkpi-${dkpi.id}`,
            type: 'dispatch-kpi',
            title: 'Dispatch KPI Updated',
            description: `Dispatch KPI updated for ${formatDate(createdAt)}`,
            address: 'System',
            customerName: 'System',
            timestamp: createdDate,
            formattedTime: formatDate(createdAt),
            icon: BarChart3,
            color: GREEN_COLOR,
            status: 'completed',
            rawData: dkpi,
            is_seen: isSeen,
            entityId: dkpi.id
          });
        }
      } catch (e) {
        console.error('Error parsing dispatch KPI date:', e);
      }
    });

    // Process reviews
    reviews.forEach((review) => {
      const createdAt = review.created_at || review.review_date;
      if (!createdAt || review.is_deleted) return;

      try {
        const createdDate = new Date(createdAt);
        if (createdDate >= oneMonthAgo) {
          allNotifications.push({
            id: `review-${review.id}`,
            type: 'review',
            title: `New ${review.rating}-Star Review`,
            description: `${review.reviewer_name} Left A ${review.rating_value} Star Review From ${review.business_name || 'Customer'}`,
            rating: review.rating,
            customerName: review.author_name || 'Customer',
            timestamp: createdDate,
            formattedTime: formatDate(createdAt),
            icon: Star,
            color: ORANGE_COLOR,
            rawData: review,
            is_seen: review.is_seen || false,
            entityId: review.id
          });
        }
      } catch (e) {
        console.error('Error parsing review date:', e);
      }
    });

    return allNotifications.sort((a, b) => b.timestamp - a.timestamp);
  }, [combinedData]);

  useEffect(() => {
    if (notifications.length > 0) {
      const prevNotifications = prevNotificationsRef.current;

      const newNotifications = notifications.filter(notification => {
        return !prevNotifications.some(prev => prev.id === notification.id);
      });

      newNotifications.slice(0, 3).forEach((notification, index) => {
        setTimeout(() => {
          let message = '';
          if (notification.type === 'locate') {
            message = `New locate request: ${notification.workOrderNumber}`;
          } else if (notification.type === 'RME') {
            message = `New RME: ${notification.rmeNumber}`;
          } else if (notification.type === 'work-order') {
            message = `New work order: ${notification.workOrderNumber}`;
          } else if (notification.type === 'dispatch-kpi') {
            message = `Dispatch KPI updated`;
          } else if (notification.type === 'review') {
            message = `New ${notification.rating}-star review from ${notification.customerName}`;
          }

          showSnackbar(message, 'info');
        }, index * 300);
      });

      prevNotificationsRef.current = notifications;
    }
  }, [notifications, showSnackbar]);

  const groupedNotifications = useMemo(() => {
    const groups = {};

    const formatGroupDate = (dateString) => {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    };

    notifications.forEach((notification) => {
      const dateKey = formatGroupDate(notification.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });

    return groups;
  }, [notifications]);

  const counts = useMemo(() => {
    const locateCount = notifications.filter(n => n.type === 'locate').length;
    const rmeCount = notifications.filter(n => n.type === 'RME').length;
    const woCount = notifications.filter(n => n.type === 'work-order').length;
    const dkpiCount = notifications.filter(n => n.type === 'dispatch-kpi').length;
    const reviewCount = notifications.filter(n => n.type === 'review').length;
    const unseenCount = notifications.filter(n => !n.is_seen).length;
    const seenCount = notifications.filter(n => n.is_seen).length;

    return {
      total: notifications.length,
      locateCount,
      rmeCount,
      woCount,
      dkpiCount,
      reviewCount,
      unseenCount,
      seenCount
    };
  }, [notifications]);

  // ─── OPTIMISTIC: Mark single notification as seen ────────────────────────────
  const markAsSeenMutation = useMutation({
    mutationFn: async (notification) => {
      if (notification.type === 'RME') {
        await rmeApi.markSeen({
          ids: [notification.entityId],
        });
      } else if (notification.type === 'locate') {
        await locatesApi.markSeen({
          ids: [notification.entityId],
        });
      } else if (notification.type === 'work-order') {
        await workOrdersApi.markSeen({
          user: user?.id,
          work_order: notification.entityId,
        });
      } else if (notification.type === 'dispatch-kpi') {
        await dispatchKpiApi.markSeen({
          user: user?.id,
          dispatcher_booked: notification.entityId,
        });
      } else if (notification.type === 'review') {
        await reviewsApi.markSeen(notification.entityId);
      }
    },
    onMutate: async (notification) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Snapshot the current cache value so we can roll back on error
      const previous = queryClient.getQueryData(['notifications', user?.role]);

      // Immediately update the cache — UI re-renders instantly
      queryClient.setQueryData(['notifications', user?.role], (old) => {
        if (!old) return old;

        return {
          ...old,
          locates:
            notification.type === 'locate'
              ? old.locates.map((item) =>
                item.id === notification.entityId ? { ...item, is_seen: true } : item
              )
              : old.locates,
          workOrders:
            notification.type === 'RME'
              ? old.workOrders.map((item) =>
                item.id === notification.entityId ? { ...item, is_seen: true } : item
              )
              : old.workOrders,
          allWorkOrders:
            notification.type === 'work-order'
              ? old.allWorkOrders.map((item) =>
                item.id === notification.entityId
                  ? { ...item, user_seen_records: [{ user: user?.id }] }
                  : item
              )
              : old.allWorkOrders,
          dispatchKpi:
            notification.type === 'dispatch-kpi'
              ? (old.dispatchKpi || []).map((item) =>
                item.id === notification.entityId
                  ? { ...item, user_seen_records: [{ user: user?.id }] }
                  : item
              )
              : old.dispatchKpi,
          reviews:
            notification.type === 'review'
              ? (old.reviews || []).map((item) =>
                item.id === notification.entityId ? { ...item, is_seen: true } : item
              )
              : old.reviews,
        };
      });

      // Also clear the sessionStorage cache so next refetch hits the server
      clearLocalCache();

      return { previous };
    },
    onError: (err, notification, context) => {
      // Roll back to the snapshot if the API call failed
      if (context?.previous) {
        queryClient.setQueryData(['notifications', user?.role], context.previous);
      }
      showSnackbar('Failed to mark notification as read', 'error');
    },
    onSettled: () => {
      // After success or failure, sync with server in background
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // ─── OPTIMISTIC: Mark ALL notifications as seen ───────────────────────────────
  const markAllAsSeenMutation = useMutation({
    mutationFn: async () => {
      const locateIds = notifications
        .filter((n) => n.type === 'locate' && !n.is_seen)
        .map((n) => n.entityId);

      const workOrderIds = notifications
        .filter((n) => n.type === 'RME' && !n.is_seen)
        .map((n) => n.entityId);

      const allWoIds = notifications
        .filter((n) => n.type === 'work-order' && !n.is_seen)
        .map((n) => n.entityId);

      const dkpiIds = notifications
        .filter((n) => n.type === 'dispatch-kpi' && !n.is_seen)
        .map((n) => n.entityId);

      const reviewIds = notifications
        .filter((n) => n.type === 'review' && !n.is_seen)
        .map((n) => n.entityId);

      const promises = [];

      if (locateIds.length > 0) {
        promises.push(locatesApi.markSeen({ ids: locateIds }));
      }

      if (workOrderIds.length > 0) {
        promises.push(rmeApi.markSeen({ ids: workOrderIds }));
      }

      if (allWoIds.length > 0) {
        allWoIds.forEach((id) =>
          promises.push(
            workOrdersApi.markSeen({ user: user?.id, work_order: id })
          )
        );
      }

      if (dkpiIds.length > 0) {
        dkpiIds.forEach((id) =>
          promises.push(
            dispatchKpiApi.markSeen({ user: user?.id, dispatcher_booked: id })
          )
        );
      }

      if (reviewIds.length > 0) {
        promises.push(reviewsApi.markAllSeen());
      }

      await Promise.all(promises);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previous = queryClient.getQueryData(['notifications', user?.role]);

      // Optimistically mark every item as seen in the cache
      queryClient.setQueryData(['notifications', user?.role], (old) => {
        if (!old) return old;
        return {
          ...old,
          locates: old.locates.map((item) => ({ ...item, is_seen: true })),
          workOrders: old.workOrders.map((item) => ({ ...item, is_seen: true })),
          allWorkOrders: old.allWorkOrders.map((item) => ({
            ...item,
            user_seen_records:
              Array.isArray(item.user_seen_records) && item.user_seen_records.length > 0
                ? item.user_seen_records
                : [{ user: user?.id }],
          })),
          dispatchKpi: (old.dispatchKpi || []).map((item) => ({
            ...item,
            user_seen_records:
              Array.isArray(item.user_seen_records) && item.user_seen_records.length > 0
                ? item.user_seen_records
                : [{ user: user?.id }],
          })),
          reviews: (old.reviews || []).map((item) => ({ ...item, is_seen: true })),
        };
      });

      clearLocalCache();

      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', user?.role], context.previous);
      }
      showSnackbar('Failed to mark notifications as read', 'error');
    },
    onSuccess: (_, __, context) => {
      // Use the snapshot count before optimistic update for the message
      const unseenBefore = context?.previous
        ? (() => {
          const { locates = [], workOrders = [], allWorkOrders = [], dispatchKpi = [], reviews = [] } = context.previous;
          const unseenLocates = locates.filter((i) => !i.is_seen).length;
          const unseenWO = workOrders.filter((i) => !i.is_seen).length;
          const unseenAllWO = allWorkOrders.filter(
            (i) => Array.isArray(i.user_seen_records) && i.user_seen_records.length === 0
          ).length;
          const unseenDkpi = dispatchKpi.filter(
            (i) => Array.isArray(i.user_seen_records) && i.user_seen_records.length === 0
          ).length;
          const unseenReviews = reviews.filter((i) => !i.is_seen).length;
          return unseenLocates + unseenWO + unseenAllWO + unseenDkpi + unseenReviews;
        })()
        : counts.unseenCount;

      showSnackbar(`Marked ${unseenBefore} notification(s) as read`, 'success');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleRefresh = () => {
    clearLocalCache();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    refetch();
    showSnackbar('Notifications refreshed', 'success');
  };

  const handleMarkAllSeen = () => {
    if (counts.unseenCount > 0) {
      markAllAsSeenMutation.mutate();
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_seen) {
      markAsSeenMutation.mutate(notification);
    }

    const dashboardBasePath = getDashboardBasePath();
    scrollToTop();

    if (notification.type === 'locate') {
      navigate(`${dashboardBasePath}/locates/work-orders`, {
        state: {
          highlightLocateId: notification.entityId,
          fromNotifications: true,
          scrollToTop: true,
        },
      });
    } else if (notification.type === 'RME') {
      navigate(`${dashboardBasePath}/rme/work-orders`, {
        state: {
          highlightWorkOrderId: notification.entityId,
          fromNotifications: true,
          scrollToTop: true,
        },
      });
    } else if (notification.type === 'work-order') {
      navigate(`${dashboardBasePath}/customer-center`, {
        state: {
          highlightWorkOrderId: notification.entityId,
          fromNotifications: true,
          scrollToTop: true,
        },
      });
    } else if (notification.type === 'dispatch-kpi') {
      navigate(`${dashboardBasePath}/dispatch-kpi`, {
        state: {
          highlightDispatchKpiId: notification.entityId,
          fromNotifications: true,
          scrollToTop: true,
        },
      });
    } else if (notification.type === 'review') {
      navigate(`${dashboardBasePath}/review-tracking`, {
        state: {
          highlightReviewId: notification.entityId,
          fromNotifications: true,
          scrollToTop: true,
        },
      });
    }
  };

  const handleMarkNotificationSeen = (notification, event) => {
    event.stopPropagation();
    markAsSeenMutation.mutate(notification);
  };

  React.useEffect(() => {
    scrollToTop();
  }, []);

  if (isLoading) {
    return <DashboardLoader />;
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ mt: 2, fontSize: '0.85rem' }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => refetch()}
            sx={{ fontSize: '0.8rem' }}
          >
            Retry
          </Button>
        }
      >
        Error loading notifications: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Helmet>
        <title>Notifications | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="View and manage notifications" />
      </Helmet>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography
              sx={{
                fontWeight: 600,
                mb: 0.5,
                fontSize: '1rem',
                color: TEXT_COLOR,
                letterSpacing: '-0.01em',
              }}
            >
              Notifications
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: GRAY_COLOR, fontSize: '0.85rem', fontWeight: 400 }}
            >
              Last 30 days activity
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {counts.unseenCount > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Check size={16} />}
                onClick={handleMarkAllSeen}
                disabled={markAllAsSeenMutation.isPending}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  color: GREEN_COLOR,
                  borderColor: alpha(GREEN_COLOR, 0.3),
                  '&:hover': {
                    borderColor: GREEN_COLOR,
                    backgroundColor: alpha(GREEN_COLOR, 0.05),
                  },
                  '&.Mui-disabled': {
                    color: alpha(GREEN_COLOR, 0.5),
                    borderColor: alpha(GREEN_COLOR, 0.2),
                  },
                }}
              >
                Mark all read
              </Button>
            )}

            <Tooltip title="Refresh">
              <IconButton
                onClick={handleRefresh}
                size="small"
                sx={{
                  color: GRAY_COLOR,
                  '&:hover': { backgroundColor: alpha(GRAY_COLOR, 0.1) },
                }}
              >
                <TrendingUp size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              borderRadius: '6px',
              border: `1px solid ${alpha(BLUE_COLOR, 0.2)}`,
              bgcolor: alpha(BLUE_COLOR, 0.05),
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: GRAY_COLOR, fontWeight: 500, display: 'block', mb: 0.5, fontSize: '0.75rem' }}
            >
              Total Notifications
            </Typography>
            <Typography variant="h5" sx={{ color: TEXT_COLOR, fontWeight: 600, fontSize: '1.5rem' }}>
              {counts.total}
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              borderRadius: '6px',
              border: `1px solid ${alpha(GREEN_COLOR, 0.2)}`,
              bgcolor: alpha(GREEN_COLOR, 0.05),
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: GRAY_COLOR, fontWeight: 500, display: 'block', mb: 0.5, fontSize: '0.75rem' }}
            >
              New (Unread)
            </Typography>
            <Typography variant="h5" sx={{ color: TEXT_COLOR, fontWeight: 600, fontSize: '1.5rem' }}>
              {counts.unseenCount}
            </Typography>
          </Paper>
        </Stack>
      </Box>

      {notifications.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: '6px',
            border: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
          }}
        >
          <Bell size={48} color={alpha(GRAY_COLOR, 0.3)} />
          <Typography variant="h6" sx={{ mt: 2, color: GRAY_COLOR, fontWeight: 500, fontSize: '1rem' }}>
            No recent activity
          </Typography>
          <Typography variant="body2" sx={{ color: GRAY_COLOR, mt: 1, fontSize: '0.85rem' }}>
            No new locates, RME, or work orders in the last 30 days
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '6px',
            border: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
            overflow: 'hidden',
          }}
        >
          {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <Box key={date}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: alpha(GRAY_COLOR, 0.03),
                  borderBottom: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
                  borderTop: `1px solid ${alpha(GRAY_COLOR, 0.1)}`,
                  '&:first-of-type': { borderTop: 'none' },
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: GRAY_COLOR,
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {date}
                </Typography>
              </Box>

              <List disablePadding>
                {dateNotifications.map((notification, index) => {
                  const Icon = notification.icon;
                  const isLast = index === dateNotifications.length - 1;

                  return (
                    <React.Fragment key={notification.id}>
                      <ListItem
                        button
                        onClick={() => handleNotificationClick(notification)}
                        disabled={markAsSeenMutation.isPending && markAsSeenMutation.variables?.id === notification.id}
                        sx={{
                          p: 2,
                          backgroundColor: notification.is_seen
                            ? 'transparent'
                            : alpha(notification.color, 0.04),
                          '&:hover': {
                            bgcolor: notification.is_seen
                              ? alpha(notification.color, 0.08)
                              : alpha(notification.color, 0.12),
                          },
                          transition: 'background-color 0.2s ease',
                          cursor: 'pointer',
                          position: 'relative',
                          '&.Mui-disabled': { opacity: 0.7, cursor: 'not-allowed' },
                          '&:hover .close-button': { opacity: 1 },
                        }}
                      >
                        {!notification.is_seen && (
                          <Tooltip title="Mark as read" placement="top">
                            <IconButton
                              size="small"
                              className="close-button"
                              onClick={(e) => handleMarkNotificationSeen(notification, e)}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 24,
                                height: 24,
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                                backgroundColor: alpha(GRAY_COLOR, 0.1),
                                color: GRAY_COLOR,
                                '&:hover': { backgroundColor: alpha(GRAY_COLOR, 0.2) },
                                zIndex: 2,
                              }}
                            >
                              <X size={16} />
                            </IconButton>
                          </Tooltip>
                        )}

                        <ListItemIcon sx={{ minWidth: 48 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: alpha(notification.color, 0.1),
                              color: notification.color,
                            }}
                          >
                            <Icon size={20} />
                          </Box>
                        </ListItemIcon>

                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                mb: 0.5,
                                pr: notification.is_seen ? 0 : 3,
                                gap: 1,
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="body2"
                                  component="span"
                                  sx={{
                                    color: TEXT_COLOR,
                                    fontWeight: notification.is_seen ? 500 : 600,
                                    fontSize: '0.85rem',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {notification.description}
                                </Typography>
                              </Box>

                              {notification.tag && notification.type === 'work-order' && (
                                <Chip
                                  label={notification.tag}
                                  size="small"
                                  sx={{
                                    height: '22px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    backgroundColor: alpha(ORANGE_COLOR, 0.1),
                                    color: ORANGE_COLOR,
                                    border: `1px solid ${alpha(ORANGE_COLOR, 0.2)}`,
                                    flexShrink: 0,
                                    '& .MuiChip-label': { px: 0.75 },
                                  }}
                                />
                              )}

                              <Chip
                                label={
                                  notification.type === 'locate'
                                    ? 'Locate'
                                    : notification.type === 'RME'
                                      ? 'RME'
                                      : notification.type === 'dispatch-kpi'
                                        ? 'KPI'
                                        : 'WO'
                                }
                                size="small"
                                sx={{
                                  height: '22px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  backgroundColor: alpha(notification.color, 0.1),
                                  color: notification.color,
                                  border: `1px solid ${alpha(notification.color, 0.2)}`,
                                  flexShrink: 0,
                                  '& .MuiChip-label': { px: 0.75 },
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: GRAY_COLOR,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                }}
                              >
                                <Clock size={14} />
                                {notification.workOrderNumber || notification.rmeNumber}
                                <Box sx={{ mx: 0.5, color: alpha(GRAY_COLOR, 0.5) }}>•</Box>
                                {notification.formattedTime}
                              </Typography>
                            </Box>
                          }
                          sx={{ m: 0 }}
                        />

                        {!notification.is_seen && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: notification.color,
                              ml: 1,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </ListItem>

                      {!isLast && (
                        <Divider sx={{ mx: 2, borderColor: alpha(GRAY_COLOR, 0.1) }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          ))}
        </Paper>
      )}

      {notifications.length > 0 && (
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            px: 1,
            gap: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: GRAY_COLOR, fontSize: '0.75rem', fontWeight: 500 }}
          >
            Showing {notifications.length} notifications from the last 30 days
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: GRAY_COLOR,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: BLUE_COLOR }} />
              <span>{counts.locateCount} Locates</span>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: GREEN_COLOR }} />
              <span>{counts.rmeCount} RME</span>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: INDIGO_COLOR }} />
              <span>{counts.woCount} Work Orders</span>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: GREEN_COLOR }} />
              <span>{counts.dkpiCount} KPI</span>
            </Box>
          </Typography>
        </Box>
      )}
    </Box>
  );
}