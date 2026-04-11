import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rmeApi } from '../api/rmeApi';
import moment from 'moment/moment';

export const useRmeMutations = (currentUser, showSnackbar) => {
    const queryClient = useQueryClient();

    const invalidateAndRefetch = async () => {
        await queryClient.invalidateQueries({ queryKey: ['rme-work-orders'] });
        await queryClient.invalidateQueries({ queryKey: ['rme-deleted-work-orders'] });
        await queryClient.refetchQueries({ queryKey: ['rme-work-orders'] });
        await queryClient.refetchQueries({ queryKey: ['rme-deleted-work-orders'] });
    };

    const getCurrentDateTime = () => {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    };

    const bulkSoftDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            const deleteData = {
                is_deleted: true,
                deleted_by: currentUser.name,
                deleted_by_email: currentUser.email,
                deleted_date: getCurrentDateTime(),
            };
            return await rmeApi.bulkSoftDelete(ids, deleteData);
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['rme-work-orders'] });
            await queryClient.cancelQueries({ queryKey: ['rme-deleted-work-orders'] });

            const previousWorkOrders = queryClient.getQueryData(['rme-work-orders']);
            const previousDeleted = queryClient.getQueryData(['rme-deleted-work-orders']);

            queryClient.setQueryData(['rme-work-orders'], (old) => {
                if (!old) return [];
                const idSet = new Set(ids);
                return old.map(item =>
                    idSet.has(item.id)
                        ? { 
                            ...item, 
                            is_deleted: true, 
                            deleted_by: currentUser.name, 
                            deleted_by_email: currentUser.email, 
                            deleted_date: getCurrentDateTime() 
                        }
                        : item
                );
            });

            return { previousWorkOrders, previousDeleted };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Items moved to recycle bin', 'success');
        },
        onError: (err, ids, context) => {
            if (context?.previousWorkOrders) {
                queryClient.setQueryData(['rme-work-orders'], context.previousWorkOrders);
            }
            if (context?.previousDeleted) {
                queryClient.setQueryData(['rme-deleted-work-orders'], context.previousDeleted);
            }
            showSnackbar(err?.response?.data?.message || 'Delete failed', 'error');
        },
    });

    const singleSoftDeleteMutation = useMutation({
        mutationFn: async (id) => {
            const deleteData = {
                is_deleted: true,
                deleted_by: currentUser.name,
                deleted_by_email: currentUser.email,
                deleted_date: getCurrentDateTime(),
            };
            return await rmeApi.update(id, deleteData);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['rme-work-orders'] });
            const previousWorkOrders = queryClient.getQueryData(['rme-work-orders']);

            queryClient.setQueryData(['rme-work-orders'], (old) => {
                if (!old) return [];
                return old.map(item =>
                    item.id === id
                        ? { 
                            ...item, 
                            is_deleted: true, 
                            deleted_by: currentUser.name, 
                            deleted_by_email: currentUser.email, 
                            deleted_date: getCurrentDateTime() 
                        }
                        : item
                );
            });

            return { previousWorkOrders };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Work order moved to recycle bin', 'success');
        },
        onError: (err, id, context) => {
            if (context?.previousWorkOrders) {
                queryClient.setQueryData(['rme-work-orders'], context.previousWorkOrders);
            }
            showSnackbar(err?.response?.data?.message || 'Failed to move to recycle bin', 'error');
        },
    });

    const permanentDeleteFromRecycleBinMutation = useMutation({
        mutationFn: async (id) => {
            return await rmeApi.delete(id);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['rme-deleted-work-orders'] });
            const previousDeleted = queryClient.getQueryData(['rme-deleted-work-orders']);

            queryClient.setQueryData(['rme-deleted-work-orders'], (old) => {
                if (!old) return [];
                return old.filter(item => item.id !== id);
            });

            return { previousDeleted };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Item permanently deleted', 'success');
        },
        onError: (err, id, context) => {
            if (context?.previousDeleted) {
                queryClient.setQueryData(['rme-deleted-work-orders'], context.previousDeleted);
            }
            showSnackbar(err?.response?.data?.message || 'Permanent delete failed', 'error');
        },
    });

    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            return await rmeApi.bulkDelete(ids);
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['rme-deleted-work-orders'] });
            const previousDeleted = queryClient.getQueryData(['rme-deleted-work-orders']);

            queryClient.setQueryData(['rme-deleted-work-orders'], (old) => {
                if (!old) return [];
                return old.filter(item => !ids.includes(item.id));
            });

            return { previousDeleted };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Items permanently deleted', 'success');
        },
        onError: (err, ids, context) => {
            if (context?.previousDeleted) {
                queryClient.setQueryData(['rme-deleted-work-orders'], context.previousDeleted);
            }
            showSnackbar(err?.response?.data?.message || 'Bulk permanent delete failed', 'error');
        },
    });

    const restoreFromRecycleBinMutation = useMutation({
        mutationFn: async (id) => {
            const restoreData = {
                is_deleted: false,
                deleted_date: null,
                deleted_by: '',
                deleted_by_email: '',
            };
            return await rmeApi.update(id, restoreData);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['rme-deleted-work-orders'] });
            const previousDeleted = queryClient.getQueryData(['rme-deleted-work-orders']);

            queryClient.setQueryData(['rme-deleted-work-orders'], (old) => {
                if (!old) return [];
                return old.map(item =>
                    item.id === id
                        ? { ...item, is_deleted: false, deleted_date: null, deleted_by: '', deleted_by_email: '' }
                        : item
                );
            });

            return { previousDeleted };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Item restored successfully', 'success');
        },
        onError: (err, id, context) => {
            if (context?.previousDeleted) {
                queryClient.setQueryData(['rme-deleted-work-orders'], context.previousDeleted);
            }
            showSnackbar(err?.response?.data?.message || 'Restore failed', 'error');
        },
    });

    const bulkRestoreMutation = useMutation({
        mutationFn: async (ids) => {
            const restoreData = {
                is_deleted: false,
                deleted_date: null,
                deleted_by: '',
                deleted_by_email: '',
            };
            return await rmeApi.bulkRestore(ids, restoreData);
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['rme-deleted-work-orders'] });
            const previousDeleted = queryClient.getQueryData(['rme-deleted-work-orders']);

            queryClient.setQueryData(['rme-deleted-work-orders'], (old) => {
                if (!old) return [];
                return old.map(item =>
                    ids.includes(item.id)
                        ? { ...item, is_deleted: false, deleted_date: null, deleted_by: '', deleted_by_email: '' }
                        : item
                );
            });

            return { previousDeleted };
        },
        onSuccess: (responses) => {
            invalidateAndRefetch();
            showSnackbar(`${responses.length} item(s) restored`, 'success');
        },
        onError: (err, ids, context) => {
            if (context?.previousDeleted) {
                queryClient.setQueryData(['rme-deleted-work-orders'], context.previousDeleted);
            }
            showSnackbar(err?.response?.data?.message || 'Bulk restore failed', 'error');
        },
    });

    const lockReportMutation = useMutation({
        mutationFn: async ({ id }) => {
            const lockData = {
                finalized_by: currentUser.name,
                finalized_by_email: currentUser.email,
                finalized_date: getCurrentDateTime(),
                rme_completed: true,
                report_id: `RME-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                tech_report_submitted: true,
                status: 'LOCKED',
            };
            return await rmeApi.lockReport(id, lockData);
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['rme-work-orders'] });
            const previousWorkOrders = queryClient.getQueryData(['rme-work-orders']);

            queryClient.setQueryData(['rme-work-orders'], (old) => {
                if (!old) return [];
                return old.map(item =>
                    item.id === id
                        ? {
                            ...item,
                            finalized_by: currentUser.name,
                            finalized_by_email: currentUser.email,
                            finalized_date: getCurrentDateTime(),
                            rme_completed: true,
                            status: 'LOCKED'
                        }
                        : item
                );
            });

            return { previousWorkOrders };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Report locked successfully', 'success');
        },
        onError: (err, variables, context) => {
            if (context?.previousWorkOrders) {
                queryClient.setQueryData(['rme-work-orders'], context.previousWorkOrders);
            }
            showSnackbar('Failed to lock report', 'error');
        },
    });

    const waitToLockMutation = useMutation({
        mutationFn: async ({ id, reason, notes }) => {
            const waitData = {
                wait_to_lock: true,
                reason: reason,
                notes: notes,
                moved_created_by: currentUser.name,
                moved_to_holding_date: getCurrentDateTime(),
                tech_report_submitted: true,
                status: 'HOLDING',
            };
            return await rmeApi.waitToLock(id, waitData);
        },
        onMutate: async ({ id, reason, notes }) => {
            await queryClient.cancelQueries({ queryKey: ['rme-work-orders'] });
            const previousWorkOrders = queryClient.getQueryData(['rme-work-orders']);

            queryClient.setQueryData(['rme-work-orders'], (old) => {
                if (!old) return [];
                return old.map(item =>
                    item.id === id
                        ? {
                            ...item,
                            wait_to_lock: true,
                            reason: reason,
                            notes: notes,
                            moved_created_by: currentUser.name,
                            moved_to_holding_date: getCurrentDateTime(),
                            status: 'HOLDING'
                        }
                        : item
                );
            });

            return { previousWorkOrders };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Report moved to holding', 'success');
        },
        onError: (err, variables, context) => {
            if (context?.previousWorkOrders) {
                queryClient.setQueryData(['rme-work-orders'], context.previousWorkOrders);
            }
            showSnackbar('Failed to move to holding', 'error');
        },
    });

    const deleteReportMutation = useMutation({
        mutationFn: async ({ id }) => {
            const discardData = {
                finalized_by: currentUser.name,
                finalized_by_email: currentUser.email,
                finalized_date: getCurrentDateTime(),
                rme_completed: true,
                status: 'DELETED',
            };
            return await rmeApi.discardReport(id, discardData);
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['rme-work-orders'] });
            const previousWorkOrders = queryClient.getQueryData(['rme-work-orders']);

            queryClient.setQueryData(['rme-work-orders'], (old) => {
                if (!old) return [];
                return old.map(item =>
                    item.id === id
                        ? {
                            ...item,
                            finalized_by: currentUser.name,
                            finalized_by_email: currentUser.email,
                            finalized_date: getCurrentDateTime(),
                            rme_completed: true,
                            status: 'DELETED'
                        }
                        : item
                );
            });

            return { previousWorkOrders };
        },
        onSuccess: () => {
            invalidateAndRefetch();
            showSnackbar('Report discarded successfully', 'success');
        },
        onError: (err, variables, context) => {
            if (context?.previousWorkOrders) {
                queryClient.setQueryData(['rme-work-orders'], context.previousWorkOrders);
            }
            showSnackbar('Failed to discard report', 'error');
        },
    });

    return {
        bulkSoftDeleteMutation,
        singleSoftDeleteMutation,
        permanentDeleteFromRecycleBinMutation,
        bulkPermanentDeleteMutation,
        restoreFromRecycleBinMutation,
        bulkRestoreMutation,
        lockReportMutation,
        waitToLockMutation,
        deleteReportMutation,
        invalidateAndRefetch
    };
};