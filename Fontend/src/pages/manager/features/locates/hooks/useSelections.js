import { useState, useCallback } from 'react';

export const useSelections = (initialSet = new Set()) => {
    const [selected, setSelected] = useState(new Set(initialSet));

    const toggleSelection = useCallback((id) => {
        setSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const toggleAllSelection = useCallback((pageItems) => {
        setSelected(prev => {
            const allPageIds = new Set(pageItems.map(item => item.id));
            const allSelectedOnPage = Array.from(allPageIds).every(id => prev.has(id));

            if (allSelectedOnPage) {
                const newSet = new Set(prev);
                allPageIds.forEach(id => newSet.delete(id));
                return newSet;
            } else {
                return new Set([...prev, ...allPageIds]);
            }
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelected(new Set());
    }, []);

    return {
        selected,
        setSelected,
        toggleSelection,
        toggleAllSelection,
        clearSelection
    };
};