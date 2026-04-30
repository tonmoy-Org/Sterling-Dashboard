import { addHours, addDays, format, parseISO, isAfter } from 'date-fns';

export const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return format(date, "MM/dd/yy hh:mm a");
};

export const formatDateShort = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return format(date, "MM/dd/yy hh:mm a");
};

export const formatMonthDay = (dateString) => {
    if (!dateString) return '—';
    try {
        const date = parseISO(dateString);
        return format(date, 'MM/dd/yy');
    } catch (e) {
        return '—';
    }
};

export const formatTimeRemaining = (remainingMs) => {
    if (remainingMs <= 0) return 'EXPIRED';

    if (remainingMs > 24 * 60 * 60 * 1000) {
        const hours = Math.round(remainingMs / (60 * 60 * 1000));
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days > 0) {
            return `${days}d ${remainingHours}h`;
        } else {
            return `${hours}h`;
        }
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
};

export const calculateExpirationDate = (calledAt, callType) => {
    if (!calledAt || !callType) return null;

    try {
        const calledDate = parseISO(calledAt);
        if (!calledDate) return null;

        if (callType === 'EMERGENCY' || callType === 'Emergency') {
            return addHours(calledDate, 4);
        } else if (callType === 'STANDARD' || callType === 'Standard') {
            return addDays(calledDate, 2);
        }

        return null;
    } catch (e) {
        console.error('Error calculating expiration:', e);
        return null;
    }
};

export const isTimerExpired = (calledAt, callType) => {
    if (!calledAt || !callType) return true;

    const expirationDate = calculateExpirationDate(calledAt, callType);
    if (!expirationDate) return true;

    return isAfter(new Date(), expirationDate);
};