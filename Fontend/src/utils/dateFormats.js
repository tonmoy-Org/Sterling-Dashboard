import { format } from 'date-fns';

/**
 * Standard date format used across the application: MM/DD/YY
 */
export const APP_DATE_FORMAT = 'MM/dd/yy';

/**
 * Standard date-time format used across the application: MM/DD/YY hh:mm a
 */
export const APP_DATE_TIME_FORMAT = 'MM/dd/yy hh:mm a';

/**
 * Formats a date string or object to the standard application date format (MM/DD/YY).
 * @param {string|Date|number} date - The date to format
 * @returns {string} Formatted date string or '—' if invalid
 */
export const formatDate = (date) => {
    if (!date) return '—';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '—';
        return format(d, APP_DATE_FORMAT);
    } catch (error) {
        return '—';
    }
};

/**
 * Formats a date string or object to the standard application date-time format (MM/DD/YY hh:mm a).
 * @param {string|Date|number} date - The date to format
 * @returns {string} Formatted date-time string or '—' if invalid
 */
export const formatDateTime = (date) => {
    if (!date) return '—';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '—';
        return format(d, APP_DATE_TIME_FORMAT);
    } catch (error) {
        return '—';
    }
};

/**
 * Formats a date with relative labels (Today, Yesterday) or the standard format if older.
 * @param {string|Date|number} dateString - The date to format
 * @returns {string} Relative or formatted date string
 */
export const formatRelativeDate = (dateString) => {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0 && date.toDateString() === now.toDateString()) {
            return `Today at ${format(date, 'hh:mm a')}`;
        }
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${format(date, 'hh:mm a')}`;
        }

        if (diffInDays < 7 && diffInDays > 0) {
            return `${format(date, 'EEE')} at ${format(date, 'hh:mm a')}`;
        }

        return format(date, APP_DATE_TIME_FORMAT);
    } catch (error) {
        return '—';
    }
};
