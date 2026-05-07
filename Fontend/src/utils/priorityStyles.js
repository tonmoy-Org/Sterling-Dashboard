import { alpha } from '@mui/material/styles';

export const P = {
    MUTED: '#667085',
    TEXT: '#1D2939',
};

export const priorityConfig = {
    '[1] 2-MAN (PUMPING)': { color: '#2E3192' },
    '[1] ASSIST (PUMPING)': { color: '#D8E4BC' },
    '[1] P4R (PUMPING)': { color: '#116C13' },
    '[1] PFHS (PUMPING)': { color: '#29A8D8' },
    '[1] ROUTINE (PUMPING)': { color: '#B4FE73' },
    '[2] 2-MAN (SERVICE)': { color: '#D97A1E' },
    '[2] ASSIST (SERVICE)': { color: '#BF5AE0' },
    '[2] ROUTINE (SERVICE)': { color: '#E7A3D3' },
    '[2] TROUBLESHOOT (SERVICE)': { color: '#C1121F' },
    '[2] UPGRADE & REPAIRS (SERVICE)': { color: '#F5E663' },
    '[3] EXCAVATOR (EXCAVATION)': { color: '#80604d' },
};

export const getPriorityStyle = (p) => {
    if (!p) return { color: P.MUTED, bg: '#F2F4F7' };

    // Super-robust matching: ignore spaces, brackets, and parentheses
    const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanP = clean(p);

    // Try to find a specific match first
    const match = Object.keys(priorityConfig).find(k => {
        const cleanK = clean(k);
        return cleanP.includes(cleanK) || cleanK.includes(cleanP);
    });

    let finalMatch = match;
    if (!finalMatch) {
        if (cleanP.includes('1')) finalMatch = '[1] ROUTINE (PUMPING)';
        else if (cleanP.includes('2')) finalMatch = '[2] ROUTINE (SERVICE)';
        else if (cleanP.includes('3')) finalMatch = '[3] EXCAVATOR (EXCAVATION)';
    }

    const color = priorityConfig[finalMatch]?.color || P.MUTED;
    return { color, bg: alpha(color, 0.08) };
};
