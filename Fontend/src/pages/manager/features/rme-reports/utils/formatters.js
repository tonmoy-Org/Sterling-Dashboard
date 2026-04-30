import { format } from 'date-fns';
import {
    GREEN_COLOR,
    ORANGE_COLOR,
    RED_COLOR,
    GRAY_COLOR
} from './constants';

export const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return format(date, 'MM/dd/yy');
};

export const formatTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return format(date, 'h:mm a');
};

export const formatDateTimeWithTZ = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return format(date, "MM/dd/yy hh:mm a");
};

export const formatFinalizedDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return format(date, "MM/dd/yy hh:mm a");
};

export const calculateElapsedTime = (createdDate) => {
    if (!createdDate) return '—';

    try {
        const now = new Date();
        const created = new Date(createdDate);
        if (isNaN(created)) return '—';

        const diffMs = now - created;

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) {
            return `${diffMinutes} MIN${diffMinutes !== 1 ? 'S' : ''}`;
        } else if (diffHours < 128) {
            return `${diffHours} HR${diffHours !== 1 ? 'S' : ''}`;
        } else {
            return `${diffDays}TH DAY${diffDays !== 1 ? 'S' : ''}`;
        }
    } catch {
        return '—';
    }
};

export const calculateCompletedElapsedTime = (completed_elapsed_time) => {
    if (!completed_elapsed_time) return '-';

    try {
        const now = new Date();
        const completed = new Date(completed_elapsed_time);

        if (isNaN(completed.getTime())) return '-';

        const diffMs = now - completed;
        if (diffMs < 0) return '-';

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Less than 1 hour → Minutes
        if (diffMinutes < 60) {
            return `${diffMinutes} MIN${diffMinutes !== 1 ? 'S' : ''}`;
        }

        // Less than or equal 128 hours → Hours
        if (diffHours <= 128) {
            return `${diffHours} HR${diffHours !== 1 ? 'S' : ''}`;
        }

        // More than 128 hours → Days
        return `${diffDays} DAY${diffDays !== 1 ? 'S' : ''}`;

    } catch {
        return '-';
    }
};

export const getElapsedColor = (createdDate) => {
    if (!createdDate) return GRAY_COLOR;
    try {
        const now = new Date();
        const created = new Date(createdDate);
        if (isNaN(created)) return GRAY_COLOR;

        const diffMs = now - created;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 24) return GREEN_COLOR;
        if (diffHours < 48) return ORANGE_COLOR;
        return RED_COLOR;
    } catch {
        return GRAY_COLOR;
    }
};

export const getTechnicianInitial = (technicianName) => {
    if (!technicianName) return '?';
    return technicianName.charAt(0).toUpperCase();
};

export const getCurrentTimeISO = () => {
    return new Date().toISOString();
};
