import React from 'react';
import { formatRelativeDate, formatDate } from '../../utils/dateFormats';
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/services/notifications';
import { locatesApi } from '../../api/services/locatesApi';
import { rmeApi } from '../../api/services/rmeApi';
import { workOrdersApi } from '../../api/services/workOrders';
import { dispatchKpiApi } from '../../api/services/dispatchKpi';
import { useAuth } from '../../auth/AuthProvider';
import { Bell, X, Clock, MapPin, Wrench, ArrowRight, Check, BarChart3, Star, FileText } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { reviewsApi } from '../../api/services/reviews';

const GREEN_COLOR = '#10b981';
const BLUE_COLOR = '#1976d2';
const ORANGE_COLOR = '#f59e0b';
const PURPLE_COLOR = '#8b5cf6';
const TEAL_COLOR = '#0891b2';
const RED_COLOR = '#ef4444';

const TAG_CONFIG = {
    'FOLLOWUP-ASAP': { label: 'Follow-Up ASAP', color: RED_COLOR },
    'JOB NOT COMPLETED': { label: 'Job Not Completed', color: ORANGE_COLOR },
    'OFFICE QUOTE NEEDED': { label: 'Office Quote Needed', color: PURPLE_COLOR },
    'QUOTE-CREATED': { label: 'Quote Created', color: TEAL_COLOR },
    'QUOTE CREATED': { label: 'Quote Created', color: TEAL_COLOR },
    'ROUTINE SERVICE REQUESTED': { label: 'Routine Service', color: GREEN_COLOR },
    'LOCATES': { label: 'Locates', color: BLUE_COLOR },
};

const NOTIFICATION_COLORS = {
    primary: '#1976d2',
    success: '#10b981',
    bg: '#ffffff',
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    textTertiary: '#a0aec0',
    borderLight: '#e2e8f0',
    gray: '#6b7280',
    grayLight: '#f8fafc',
};

const NotificationScrollableBox = styled(Box)({
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-track': { background: '#f1f5f9', borderRadius: '4px' },
    '&::-webkit-scrollbar-thumb': {
        background: '#cbd5e0',
        borderRadius: '4px',
        '&:hover': { background: '#94a3b8' },
    },
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const formatDateLabel = (dateString) => formatRelativeDate(dateString);

const formatGroupDateLabel = (dateString) => formatDate(dateString);

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
    return { street, city: cityState[0] || '', state: cityState[1] || '', zip, original: fullAddress };
};

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════════════════ */
const NotificationDrawer = ({ onClose }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { notifications, isLoading, error, clearLocalCache } = useNotifications();

    /* ── Optimistic: mark single notification as seen ── */
    const markAsSeenMutation = useMutation({
        mutationFn: async (notification) => {
            if (notification.type === 'RME') {
                await rmeApi.markSeen({ ids: [notification.entityId] });
            } else if (notification.type === 'locate') {
                await locatesApi.markSeen({ ids: [notification.entityId] });
            } else if (notification.type === 'work-order') {
                await workOrdersApi.markSeen({ user: user?.id, work_order: notification.entityId });
            } else if (notification.type === 'dispatch-kpi') {
                await dispatchKpiApi.markSeen({ user: user?.id, dispatcher_booked: notification.entityId });
            } else if (notification.type === 'review') {
                await reviewsApi.markSeen(notification.entityId);
            } else if (notification.type === 'invoice') {
                await rmeApi.markSeenInvoiceProficiency(notification.entityId);
            }
        },
        onMutate: async (notification) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueryData(['notifications', user?.role]);

            queryClient.setQueryData(['notifications', user?.role], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    locates:
                        notification.type === 'locate'
                            ? old.locates.map(item => item.id === notification.entityId ? { ...item, is_seen: true } : item)
                            : old.locates,
                    workOrders:
                        notification.type === 'RME'
                            ? old.workOrders.map(item => item.id === notification.entityId ? { ...item, is_seen: true } : item)
                            : old.workOrders,
                    allWorkOrders:
                        notification.type === 'work-order'
                            ? old.allWorkOrders.map(item => item.id === notification.entityId ? { ...item, user_seen_records: [{ user: user?.id }] } : item)
                            : old.allWorkOrders,
                    dispatchKpi:
                        notification.type === 'dispatch-kpi'
                            ? (old.dispatchKpi || []).map(item => item.id === notification.entityId ? { ...item, user_seen_records: [{ user: user?.id }] } : item)
                            : old.dispatchKpi,
                    reviews:
                        notification.type === 'review'
                            ? (old.reviews || []).map(item => item.id === notification.entityId ? { ...item, is_seen: true } : item)
                            : old.reviews,
                    invoiceProficiency:
                        notification.type === 'invoice'
                            ? (old.invoiceProficiency || []).map(item => item.id === notification.entityId ? { ...item, is_seen: true } : item)
                            : old.invoiceProficiency,
                };
            });

            clearLocalCache();
            return { previous };
        },
        onError: (_, __, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['notifications', user?.role], ctx.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    /* ── Optimistic: mark ALL as seen ── */
    const markAllAsSeenMutation = useMutation({
        mutationFn: async (notificationsArray) => {
            const locateIds = notificationsArray.filter(n => n.type === 'locate').map(n => n.entityId);
            const workOrderIds = notificationsArray.filter(n => n.type === 'RME').map(n => n.entityId);
            const allWoIds = notificationsArray.filter(n => n.type === 'work-order').map(n => n.entityId);
            const dkpiIds = notificationsArray.filter(n => n.type === 'dispatch-kpi').map(n => n.entityId);
            const reviewIds = notificationsArray.filter(n => n.type === 'review');
            const invoiceIds = notificationsArray.filter(n => n.type === 'invoice');

            const promises = [];
            if (locateIds.length > 0) promises.push(locatesApi.markSeen({ ids: locateIds }));
            if (workOrderIds.length > 0) promises.push(rmeApi.markSeen({ ids: workOrderIds }));
            if (allWoIds.length > 0) {
                allWoIds.forEach(id => promises.push(workOrdersApi.markSeen({ user: user?.id, work_order: id })));
            }
            if (dkpiIds.length > 0) {
                dkpiIds.forEach(id => promises.push(dispatchKpiApi.markSeen({ user: user?.id, dispatcher_booked: id })));
            }
            if (reviewIds.length > 0) {
                promises.push(reviewsApi.markAllSeen());
            }
            if (invoiceIds.length > 0) {
                promises.push(rmeApi.markAllSeenInvoiceProficiency());
            }
            await Promise.all(promises);
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previous = queryClient.getQueryData(['notifications', user?.role]);

            queryClient.setQueryData(['notifications', user?.role], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    locates: old.locates.map(item => ({ ...item, is_seen: true })),
                    workOrders: old.workOrders.map(item => ({ ...item, is_seen: true })),
                    allWorkOrders: old.allWorkOrders.map(item => ({
                        ...item,
                        user_seen_records:
                            Array.isArray(item.user_seen_records) && item.user_seen_records.length > 0
                                ? item.user_seen_records
                                : [{ user: user?.id }],
                    })),
                    dispatchKpi: (old.dispatchKpi || []).map(item => ({
                        ...item,
                        user_seen_records:
                            Array.isArray(item.user_seen_records) && item.user_seen_records.length > 0
                                ? item.user_seen_records
                                : [{ user: user?.id }],
                    })),
                    reviews: (old.reviews || []).map(item => ({ ...item, is_seen: true })),
                    invoiceProficiency: (old.invoiceProficiency || []).map(item => ({ ...item, is_seen: true })),
                };
            });

            clearLocalCache();
            return { previous };
        },
        onError: (_, __, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['notifications', user?.role], ctx.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    /* ── Build notification list from all three sources ── */
    const latestNotifications = React.useMemo(() => {
        if (!notifications) return [];
        const { locates = [], workOrders = [], allWorkOrders = [], dispatchKpi = [], reviews = [], invoiceProficiency = [] } = notifications;
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const all = [];

        // Locates
        locates.forEach((locate) => {
            const createdAt = locate.created_at;
            if (!createdAt) return;
            const createdDate = new Date(createdAt);
            if (createdDate >= oneMonthAgo) {
                const addr = parseDashboardAddress(locate.customer_address || '');
                all.push({
                    id: `locate-${locate.id}`,
                    type: 'locate',
                    title: 'Locate Request',
                    description: `New locate request — ${locate.customer_name || 'Customer'}`,
                    address: addr.original || 'Unknown address',
                    workOrderNumber: locate.work_order_number || 'N/A',
                    customerName: locate.customer_name || 'Unknown',
                    timestamp: createdDate,
                    formattedTime: formatDateLabel(createdAt),
                    icon: MapPin,
                    color: NOTIFICATION_COLORS.primary,
                    rawData: locate,
                    entityId: locate.id,
                    is_seen: locate.is_seen || false,
                });
            }
        });

        // RME work orders
        workOrders.forEach((workOrder) => {
            const elapsedTime = workOrder.elapsed_time;
            if (!elapsedTime) return;
            const elapsedDate = new Date(elapsedTime);
            if (elapsedDate >= oneMonthAgo) {
                const addr = parseDashboardAddress(workOrder.full_address || '');
                all.push({
                    id: `rme-${workOrder.id}`,
                    type: 'RME',
                    title: 'RME Added',
                    description: `New RME request — ${workOrder.customer_name || 'Customer'}`,
                    address: addr.original || 'Unknown address',
                    rmeNumber: workOrder.wo_number || workOrder.id || 'N/A',
                    customerName: workOrder.customer_name || 'Unknown',
                    timestamp: elapsedDate,
                    formattedTime: formatDate(elapsedTime),
                    icon: Wrench,
                    color: NOTIFICATION_COLORS.success,
                    rawData: workOrder,
                    entityId: workOrder.id,
                    is_seen: workOrder.is_seen || false,
                });
            }
        });

        // All work orders (Customer Center)
        // FIXED: Handle null createdAt - use current timestamp as fallback
        allWorkOrders.forEach((workOrder) => {
            let createdAt = workOrder?.createdAt;
            if (!createdAt) {
                // Fallback to current date if createdAt is null
                createdAt = new Date().toISOString();
            }
            if (workOrder.is_deleted) return;

            const createdDate = new Date(createdAt);
            if (createdDate >= oneMonthAgo) {
                const addr = parseDashboardAddress(workOrder.workOrderAddress || '');
                const isSeen = Array.isArray(workOrder.user_seen_records) && workOrder.user_seen_records.length > 0;

                // Handle tag - it can be an array or single value
                const tagArray = Array.isArray(workOrder.tag) ? workOrder.tag : workOrder.tag ? [workOrder.tag] : [];
                const tagName = tagArray[0] || null;
                const tagLabel = tagName ? (TAG_CONFIG[tagName]?.label || tagName) : null;
                const tagColor = tagName ? (TAG_CONFIG[tagName]?.color || ORANGE_COLOR) : ORANGE_COLOR;

                const displayAddress = addr.street || addr.original || null;
                all.push({
                    id: `wo-${workOrder.id}`,
                    type: 'work-order',
                    title: 'Work Order Request',
                    description: `New work order — ${workOrder.customerName || 'Customer'}${displayAddress ? `, ${displayAddress}` : ''}`,
                    address: addr.original || 'Unknown address',
                    workOrderNumber: workOrder.wo || 'N/A',
                    customerName: workOrder.customerName || 'Unknown',
                    timestamp: createdDate,
                    formattedTime: formatDateLabel(createdAt),
                    icon: Wrench,
                    color: NOTIFICATION_COLORS.primary,
                    rawData: workOrder,
                    entityId: workOrder.id,
                    is_seen: isSeen,
                    tag: tagName,
                    tagLabel,
                    tagColor,
                });
            }
        });

        // Dispatch KPI
        dispatchKpi.forEach((dkpi) => {
            const createdAt = dkpi.date;
            if (!createdAt || dkpi.is_deleted) return;
            const createdDate = new Date(createdAt);
            if (createdDate >= oneMonthAgo) {
                const isSeen = Array.isArray(dkpi.user_seen_records) && dkpi.user_seen_records.length > 0;
                all.push({
                    id: `dkpi-${dkpi.id}`,
                    type: 'dispatch-kpi',
                    title: 'Dispatch KPI Updated',
                    description: `Dispatch KPI updated for ${formatDate(createdAt)}`,
                    address: 'System',
                    workOrderNumber: 'N/A',
                    customerName: 'System',
                    timestamp: createdDate,
                    formattedTime: formatDateLabel(createdAt),
                    icon: BarChart3,
                    color: GREEN_COLOR,
                    rawData: dkpi,
                    entityId: dkpi.id,
                    is_seen: isSeen,
                });
            }
        });

        // Reviews
        reviews.forEach((review) => {
            const createdAt = review.created_at || review.review_date;
            if (!createdAt || review.is_deleted) return;
            const createdDate = new Date(createdAt);
            if (createdDate >= oneMonthAgo) {
                all.push({
                    id: `review-${review.id}`,
                    type: 'review',
                    title: `New ${review.rating}-Star Review`,
                    description: `${review.reviewer_name} Left A ${review.rating_value} Star Review From ${review.business_name || 'Customer'}`,
                    address: review.platform || 'Google',
                    workOrderNumber: 'N/A',
                    customerName: review.author_name || 'Customer',
                    timestamp: createdDate,
                    formattedTime: formatDateLabel(createdAt),
                    icon: Star,
                    color: ORANGE_COLOR,
                    rawData: review,
                    entityId: review.id,
                    is_seen: review.is_seen || false,
                });
            }
        });

        // Invoice Proficiency
        invoiceProficiency.forEach((inv) => {
            const createdAt = inv.createdAt || inv.completedDate;
            if (!createdAt || inv.is_deleted) return;
            const createdDate = new Date(createdAt);
            if (createdDate >= oneMonthAgo) {
                const profValue = inv.proficiency ? `${(inv.proficiency * 100).toFixed(0)}%` : '—';
                all.push({
                    id: `invoice-${inv.id}`,
                    type: 'invoice',
                    title: 'Invoice Added',
                    description: `New invoice for ${inv.customerName || inv.workOrderNumber} by ${inv.technician || 'Unknown'} (${profValue})`,
                    address: inv.customerName || 'N/A',
                    workOrderNumber: inv.workOrderNumber || 'N/A',
                    customerName: inv.customerName || 'Unknown',
                    timestamp: createdDate,
                    formattedTime: formatDateLabel(createdAt),
                    icon: FileText,
                    color: TEAL_COLOR,
                    rawData: inv,
                    entityId: inv.id,
                    is_seen: inv.is_seen || false,
                });
            }
        });

        // Sort newest first, return top 10
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    }, [notifications]);

    /* ── Unseen count (badge) ── */
    const totalNotificationCount = React.useMemo(() => {
        return latestNotifications.filter(n => !n.is_seen).length;
    }, [latestNotifications]);

    /* ── Group by date ── */
    const groupedNotifications = React.useMemo(() => {
        const groups = {};
        latestNotifications.forEach((n) => {
            const dateKey = formatGroupDateLabel(n.timestamp);
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(n);
        });
        return groups;
    }, [latestNotifications]);

    const getDashboardBasePath = () => {
        switch (user?.role?.toUpperCase()) {
            case 'SUPER-ADMIN':
            case 'SUPERADMIN': return '/super-admin-dashboard';
            case 'MANAGER': return '/manager-dashboard';
            case 'TECH': return '/tech-dashboard';
            default: return '/';
        }
    };

    const handleViewAll = () => {
        onClose();
        navigate(`${getDashboardBasePath()}/notifications`);
    };

    const handleMarkAllSeen = () => {
        const unseen = latestNotifications.filter(n => !n.is_seen);
        if (unseen.length) markAllAsSeenMutation.mutate(unseen);
    };

    const handleSingleSeen = (notification, e) => {
        e.stopPropagation();
        if (!notification.is_seen) markAsSeenMutation.mutate(notification);
    };

    const handleNotificationClick = (notification) => {
        if (!notification.is_seen) markAsSeenMutation.mutate(notification);

        const basePath = getDashboardBasePath();
        onClose();

        if (notification.type === 'locate') {
            navigate(`${basePath}/locates/work-orders`, { state: { highlightLocateId: notification.entityId, fromNotifications: true } });
        } else if (notification.type === 'RME') {
            navigate(`${basePath}/rme/work-orders`, { state: { highlightWorkOrderId: notification.entityId, fromNotifications: true } });
        } else if (notification.type === 'work-order') {
            navigate(`${basePath}/customer-center`, { state: { highlightWorkOrderId: notification.entityId, fromNotifications: true } });
        } else if (notification.type === 'dispatch-kpi') {
            navigate(`${basePath}/dispatch-kpi`, { state: { highlightDispatchKpiId: notification.entityId, fromNotifications: true } });
        } else if (notification.type === 'review') {
            navigate(`${basePath}/review-tracking`, { state: { highlightReviewId: notification.entityId, fromNotifications: true } });
        } else if (notification.type === 'invoice') {
            navigate(`${basePath}/invoice-proficiency`, { state: { highlightInvoiceId: notification.entityId, fromNotifications: true } });
        }
    };

    /* ── Loading / error states ── */
    if (isLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
            <CircularProgress size={32} />
        </Box>
    );

    if (error) return (
        <Box sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>Error loading notifications: {error.message}</Alert>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })} variant="outlined" size="small" fullWidth>Retry</Button>
        </Box>
    );

    /* ── Render ── */
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: NOTIFICATION_COLORS.bg, color: NOTIFICATION_COLORS.textPrimary }}>

            {/* ── Header ── */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${NOTIFICATION_COLORS.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(NOTIFICATION_COLORS.primary, 0.1), color: NOTIFICATION_COLORS.primary }}>
                        <Bell size={20} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NOTIFICATION_COLORS.textPrimary, fontSize: '0.85rem' }}>
                            Recent Notifications
                        </Typography>
                        {totalNotificationCount > 0 && (
                            <Typography variant="caption" sx={{ color: NOTIFICATION_COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: NOTIFICATION_COLORS.primary }} />
                                {totalNotificationCount} new
                            </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: NOTIFICATION_COLORS.textTertiary, display: 'block', fontSize: '0.7rem', mt: 0.25 }}>
                            Showing 10 most recent
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {totalNotificationCount > 0 && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Check size={14} />}
                            onClick={handleMarkAllSeen}
                            disabled={markAllAsSeenMutation.isPending}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                color: GREEN_COLOR,
                                borderColor: alpha(GREEN_COLOR, 0.3),
                                '&:hover': { borderColor: GREEN_COLOR, backgroundColor: alpha(GREEN_COLOR, 0.05) },
                                '&.Mui-disabled': { color: alpha(GREEN_COLOR, 0.5), borderColor: alpha(GREEN_COLOR, 0.2) },
                            }}
                        >
                            Mark all read
                        </Button>
                    )}
                    <IconButton onClick={onClose} size="small" sx={{ color: NOTIFICATION_COLORS.textSecondary, '&:hover': { backgroundColor: alpha(NOTIFICATION_COLORS.gray, 0.1) } }}>
                        <X size={18} />
                    </IconButton>
                </Box>
            </Box>

            {/* ── List ── */}
            <NotificationScrollableBox sx={{ backgroundColor: NOTIFICATION_COLORS.bg }}>
                {latestNotifications.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Bell size={48} color={alpha(NOTIFICATION_COLORS.gray, 0.3)} />
                        <Typography variant="body1" sx={{ mt: 2, color: NOTIFICATION_COLORS.textSecondary, fontWeight: 600 }}>No notifications</Typography>
                        <Typography variant="caption" sx={{ color: NOTIFICATION_COLORS.textTertiary, mt: 1, display: 'block', maxWidth: '80%' }}>
                            No locates, RMEs, work orders, reviews, or invoices found in the last 30 days.
                        </Typography>
                    </Box>
                ) : (
                    Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
                        <Box key={date}>
                            {/* Date header */}
                            <Box sx={{ p: 1, bgcolor: NOTIFICATION_COLORS.grayLight, borderBottom: `1px solid ${alpha(NOTIFICATION_COLORS.gray, 0.1)}`, position: 'sticky', top: 0, zIndex: 1 }}>
                                <Typography variant="caption" sx={{ color: NOTIFICATION_COLORS.textSecondary, fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                                                onClick={() => handleNotificationClick(notification)}
                                                sx={{
                                                    p: 2,
                                                    backgroundColor: notification.is_seen ? NOTIFICATION_COLORS.bg : alpha(notification.color, 0.03),
                                                    cursor: 'pointer',
                                                    '&:hover': { bgcolor: alpha(notification.color, notification.is_seen ? 0.03 : 0.06) },
                                                    transition: 'background-color 0.2s ease',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* Icon */}
                                                <ListItemIcon sx={{ minWidth: 44 }}>
                                                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(notification.color, 0.1), color: notification.color }}>
                                                        <Icon size={16} />
                                                    </Box>
                                                </ListItemIcon>

                                                {/* Text */}
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
                                                            <Typography variant="body2" sx={{ color: notification.is_seen ? NOTIFICATION_COLORS.textSecondary : NOTIFICATION_COLORS.textPrimary, fontWeight: notification.is_seen ? 500 : 600, fontSize: '0.75rem', lineHeight: 1.3 }}>
                                                                {notification.description}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                                {notification.tag && notification.type === 'work-order' && (
                                                                    <Chip
                                                                        label={notification.tagLabel || notification.tag}
                                                                        size="small"
                                                                        sx={{ height: '20px', fontSize: '0.65rem', fontWeight: 600, backgroundColor: alpha(notification.tagColor || ORANGE_COLOR, 0.1), color: notification.tagColor || ORANGE_COLOR, border: `1px solid ${alpha(notification.tagColor || ORANGE_COLOR, 0.2)}` }}
                                                                    />
                                                                )}
                                                                <Chip
                                                                    label={
                                                                        notification.type === 'locate' ? 'Locate' :
                                                                            notification.type === 'RME' ? 'RME' :
                                                                                notification.type === 'dispatch-kpi' ? 'KPI' :
                                                                                    notification.type === 'review' ? 'Review' :
                                                                                        notification.type === 'invoice' ? 'Inv' :
                                                                                            'WO'
                                                                    }
                                                                    size="small"
                                                                    sx={{ height: '20px', fontSize: '0.65rem', fontWeight: 600, backgroundColor: alpha(notification.color, 0.1), color: notification.color, border: `1px solid ${alpha(notification.color, 0.2)}` }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" sx={{ color: notification.is_seen ? NOTIFICATION_COLORS.textTertiary : NOTIFICATION_COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem' }}>
                                                            <Clock size={12} />
                                                            {notification.type === 'locate'
                                                                ? `WO: ${notification.workOrderNumber}`
                                                                : notification.type === 'RME'
                                                                    ? `WO: ${notification.rmeNumber}`
                                                                    : notification.type === 'dispatch-kpi'
                                                                        ? `KPI`
                                                                        : notification.type === 'invoice'
                                                                            ? `INV: ${notification.workOrderNumber}`
                                                                            : `WO: ${notification.workOrderNumber}`}
                                                            <Box sx={{ mx: 0.5 }}>•</Box>
                                                            {notification.formattedTime}
                                                        </Typography>
                                                    }
                                                    sx={{ m: 0 }}
                                                />

                                                {/* Unread dot */}
                                                {!notification.is_seen && (
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: notification.color, ml: 1, flexShrink: 0 }} />
                                                )}

                                                {/* Mark-as-read X button */}
                                                {!notification.is_seen && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleSingleSeen(notification, e)}
                                                        disabled={markAsSeenMutation.isPending}
                                                        sx={{
                                                            ml: 0.5,
                                                            color: NOTIFICATION_COLORS.textTertiary,
                                                            '&:hover': { color: NOTIFICATION_COLORS.textPrimary, backgroundColor: alpha(NOTIFICATION_COLORS.gray, 0.1) },
                                                            '&.Mui-disabled': { color: alpha(NOTIFICATION_COLORS.textTertiary, 0.5) },
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </IconButton>
                                                )}
                                            </ListItem>

                                            {!isLast && <Divider sx={{ mx: 2, borderColor: alpha(NOTIFICATION_COLORS.borderLight, 0.5) }} />}
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        </Box>
                    ))
                )}
            </NotificationScrollableBox>

            {/* ── Footer ── */}
            <Box sx={{ p: 2, borderTop: `1px solid ${NOTIFICATION_COLORS.borderLight}`, flexShrink: 0, backgroundColor: NOTIFICATION_COLORS.grayLight }}>
                <Button
                    onClick={handleViewAll}
                    variant="outlined"
                    fullWidth
                    endIcon={<ArrowRight size={14} />}
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: NOTIFICATION_COLORS.primary,
                        borderColor: NOTIFICATION_COLORS.borderLight,
                        '&:hover': { borderColor: NOTIFICATION_COLORS.primary, backgroundColor: alpha(NOTIFICATION_COLORS.primary, 0.04) },
                    }}
                >
                    View All Notifications
                </Button>
            </Box>
        </Box>
    );
};

export default NotificationDrawer;