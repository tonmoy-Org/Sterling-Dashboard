import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Checkbox,
  Button,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  TablePagination,
  Modal,
  Grid,
  FormControlLabel,
  TextField,
  LinearProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import { repairsApi } from '../../../../api/services/repairs';
import StyledTextField from '../../../../components/ui/StyledTextField';
import {
  CheckCircle,
  Clock,
  Timer,
  X,
  Trash2,
  Search,
  AlertCircle,
  Edit,
  Construction,
  FileText,
  CheckSquare,
  Square,
  Info,
  ChevronRight,
  ChevronDown,
  Calendar,
  Home,
  User,
  FileCheck,
  ClipboardCheck,
  ShieldCheck,
  TestTube,
  Award,
  AlertTriangle,
  History,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from '../../../../components/Loader/DashboardLoader';
import { Add, ArrowBack, ArrowForward, ThumbUp, ExpandMore } from '@mui/icons-material';
import GradientButton from '../../../../components/ui/GradientButton';
import UpdateButton from '../../../../components/ui/UpdateButton';
import OutlineButton from '../../../../components/ui/OutlineButton';
import RecycleBinModal from './RecycleBinModal';
import { useAuth } from '../../../../auth/AuthProvider';
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';
import { format } from 'date-fns';
import CommonDialog from '../../../../components/ui/CommonDialog';

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const GRAY_COLOR = '#6b7280';
const PURPLE_COLOR = '#8b5cf6';
const YELLOW_COLOR = '#f59e0b';
const TEAL_COLOR = '#06b6d4';

const REPAIR_STAGES = [
  { id: 'creation', name: '1: Job Creation', color: GRAY_COLOR },
  { id: 'moreWork', name: '1B: More Work Needed', color: ORANGE_COLOR },
  { id: 'permitting', name: '2: Permitting', color: BLUE_COLOR },
  { id: 'approved', name: '3: Approved', color: YELLOW_COLOR },
  { id: 'testing', name: '4: Testing', color: TEAL_COLOR },
  { id: 'completed', name: '5: Project Complete', color: GREEN_COLOR }
];

const AS_BUILT_REQUIREMENTS = [
  "Drain-Field depth",
  "Lateral length",
  "Lateral material",
  "Waterline locations",
  "Tank size",
  "Drinking Water Well -- If present",
  "Impervious surfaces",
  "Surface water (Creeks, streams, lakes, ponds)",
  "Transport line location",
  "How we located components",
  "Structures",
  "Tanks less than 750 gallons must have as-built on file already or will not be permittable",
  "Tanks 750 gallons or more may be repaired if we create a new site plan"
];

const STRESS_TEST_OPTIONS = [
  {
    value: 'vacant_passed',
    label: 'Vacant - Completed 120 Gallons Per Bedroom Stress Test',
    description: 'Property is vacant and passed the 120 gallons per bedroom stress test'
  },
  {
    value: 'occupied_passed',
    label: 'Occupied - Completed 120 Gallon Stress Test',
    description: 'Property is occupied and passed the 120 gallons stress test'
  },
  {
    value: 'failed',
    label: 'Failed Stress Test - Drain Field Repair Scheduled',
    description: 'Stress test failed - Move to 1B: Drain Field Repair'
  }
];

const formatDateForAPI = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  }
  return null;
};

const transformRepairData = (apiData) => {
  if (!apiData) return null;
  return {
    id: apiData.id?.toString() || `repair-${apiData.id}`,
    workOrderId: apiData.id,
    workOrderNumber: apiData.work_order_number || `REP-${(apiData.id || '').toString().padStart(4, '0')}`,
    address: apiData.address || '',
    name: apiData.name || 'Unknown Customer',
    stage: apiData.stage || 'creation',
    stageName: apiData.stage_name || '',
    stageColor: apiData.stage_color || GRAY_COLOR,
    createdDate: apiData.created_date || new Date().toISOString(),
    lastUpdated: apiData.last_updated || new Date().toISOString(),
    stageEntryDates: {
      creation: apiData.created_date || new Date().toISOString(),
      moreWork: apiData.more_work_entry_date || null,
      permitting: apiData.permitting_entry_date || null,
      approved: apiData.approved_entry_date || null,
      testing: apiData.testing_entry_date || null,
      completed: apiData.completed_entry_date || null
    },
    stressTest: apiData.stress_test || null,
    stressTestDescription: apiData.stress_test_description ||
      (apiData.stress_test ? STRESS_TEST_OPTIONS.find(opt => opt.value === apiData.stress_test)?.label : null),
    asBuiltCondition: apiData.as_built_condition || null,
    rmeReport: apiData.rme_report || null,
    rmeInspectionFiled: apiData.rme_inspection_filed || false,
    neededItems: Array.isArray(apiData.needed_items) ? apiData.needed_items : (apiData.needed_items ? [apiData.needed_items] : []),
    permitSubmittedDate: apiData.permit_submitted_date || null,
    permitDaysPending: apiData.permit_days_pending || 0,
    approvedDate: apiData.approved_date || null,
    readyToSchedule: apiData.ready_to_schedule || false,
    approvedSymbol: apiData.approved_symbol || false,
    waterTightnessTest: apiData.water_tightness_test || false,
    followUpReport: apiData.follow_up_report || false,
    completionDate: apiData.completion_date || null,
    notes: apiData.notes || '',
    assignedTo: apiData.assigned_to || 'Unassigned',
    priority: apiData.priority || 'Standard',
    isDeleted: apiData.is_deleted || false,
    deletedBy: apiData.deleted_by || null,
    deletedByEmail: apiData.deleted_by_email || null,
    deletedDate: apiData.deleted_date || null
  };
};

const transformToAPIFormat = (data) => {
  if (!data) return {};
  const apiData = {};
  if (data.stressTest !== undefined) apiData.stress_test = data.stressTest;
  if (data.stressTestDescription !== undefined) apiData.stress_test_description = data.stressTestDescription;
  if (data.asBuiltCondition !== undefined) apiData.as_built_condition = data.asBuiltCondition;
  if (data.rmeReport !== undefined) apiData.rme_report = data.rmeReport;
  if (data.rmeInspectionFiled !== undefined) apiData.rme_inspection_filed = data.rmeInspectionFiled;
  if (data.neededItems !== undefined) apiData.needed_items = Array.isArray(data.neededItems) ? data.neededItems : [];
  if (data.permitSubmittedDate !== undefined) apiData.permit_submitted_date = formatDateForAPI(data.permitSubmittedDate);
  if (data.permitDaysPending !== undefined) apiData.permit_days_pending = data.permitDaysPending;
  if (data.approvedDate !== undefined) apiData.approved_date = formatDateForAPI(data.approvedDate);
  if (data.readyToSchedule !== undefined) apiData.ready_to_schedule = data.readyToSchedule;
  if (data.approvedSymbol !== undefined) apiData.approved_symbol = data.approvedSymbol;
  if (data.waterTightnessTest !== undefined) apiData.water_tightness_test = data.waterTightnessTest;
  if (data.followUpReport !== undefined) apiData.follow_up_report = data.followUpReport;
  if (data.completionDate !== undefined) apiData.completion_date = formatDateForAPI(data.completionDate);
  if (data.notes !== undefined) apiData.notes = data.notes;
  if (data.assignedTo !== undefined) apiData.assigned_to = data.assignedTo;
  if (data.priority !== undefined) apiData.priority = data.priority;
  if (data.name !== undefined) apiData.name = data.name;
  if (data.address !== undefined) apiData.address = data.address;
  if (data.stage !== undefined) apiData.stage = data.stage;
  if (data.stageName !== undefined) apiData.stage_name = data.stageName;
  if (data.stageColor !== undefined) apiData.stage_color = data.stageColor;
  if (data.createdDate !== undefined) apiData.created_date = data.createdDate;
  if (data.lastUpdated !== undefined) apiData.last_updated = data.lastUpdated;
  if (data.stageEntryDates !== undefined) {
    if (data.stageEntryDates.moreWork) apiData.more_work_entry_date = data.stageEntryDates.moreWork;
    if (data.stageEntryDates.permitting) apiData.permitting_entry_date = data.stageEntryDates.permitting;
    if (data.stageEntryDates.approved) apiData.approved_entry_date = data.stageEntryDates.approved;
    if (data.stageEntryDates.testing) apiData.testing_entry_date = data.stageEntryDates.testing;
    if (data.stageEntryDates.completed) apiData.completed_entry_date = data.stageEntryDates.completed;
  }
  if (data.isDeleted !== undefined) apiData.is_deleted = data.isDeleted;
  if (data.deletedBy !== undefined) apiData.deleted_by = data.deletedBy;
  if (data.deletedByEmail !== undefined) apiData.deleted_by_email = data.deletedByEmail;
  if (data.deletedDate !== undefined) apiData.deleted_date = data.deletedDate;
  return apiData;
};

// Local DeleteConfirmationModal removed in favor of universal CommonDialog

const Repairs = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showSnackbar } = useGlobalSnackbar();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [selectedRepairs, setSelectedRepairs] = useState({
    creation: new Set(),
    moreWork: new Set(),
    permitting: new Set(),
    approved: new Set(),
    testing: new Set(),
    completed: new Set()
  });

  const [page, setPage] = useState({
    creation: 0,
    moreWork: 0,
    permitting: 0,
    approved: 0,
    testing: 0,
    completed: 0
  });

  const [rowsPerPage, setRowsPerPage] = useState({
    creation: isMobile ? 5 : 10,
    moreWork: isMobile ? 5 : 10,
    permitting: isMobile ? 5 : 10,
    approved: isMobile ? 5 : 10,
    testing: isMobile ? 5 : 10,
    completed: isMobile ? 5 : 10
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newRepairDialogOpen, setNewRepairDialogOpen] = useState(false);
  const [asBuiltModalOpen, setAsBuiltModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [recycleBinModalOpen, setRecycleBinModalOpen] = useState(false);

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [bulkDeleteConfirmationOpen, setBulkDeleteConfirmationOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({
    type: 'single',
    stageId: null,
    repairId: null,
    count: 0,
    workOrderNumber: null,
    customerName: null
  });

  const [newRepair, setNewRepair] = useState({
    name: '',
    address: '',
    stressTest: '',
    asBuiltCondition: '',
    rmeReport: '',
    rmeInspectionFiled: false
  });

  const [editForm, setEditForm] = useState({
    stressTest: '',
    asBuiltCondition: '',
    rmeReport: '',
    rmeInspectionFiled: false,
    neededItems: [],
    waterTightnessTest: false,
    followUpReport: false,
    readyToSchedule: false,
    notes: ''
  });

  const [showTopDashboard, setShowTopDashboard] = useState(true);
  const [recycleBinSearch, setRecycleBinSearch] = useState('');
  const [recycleBinPage, setRecycleBinPage] = useState(0);
  const [recycleBinRowsPerPage, setRecycleBinRowsPerPage] = useState(isMobile ? 5 : 10);
  const [selectedRecycleBinItems, setSelectedRecycleBinItems] = useState(new Set());
  const [isRecycleBinLoading, setIsRecycleBinLoading] = useState(false);

  const currentUser = {
    name: user?.name || 'Admin User',
    email: user?.email || ''
  };

  const { data: repairsData = [], isLoading, refetch } = useQuery({
    queryKey: ['tank-repairs'],
    queryFn: async () => {
      try {
        const response = await repairsApi.getAll();
        const transformedData = response.data.map(transformRepairData);
        return transformedData;
      } catch (error) {
        console.error('Error fetching repairs:', error);
        throw error;
      }
    }
  });

  const createRepairMutation = useMutation({
    mutationFn: async (repairData) => {
      try {
        const apiData = transformToAPIFormat(repairData);
        const response = await repairsApi.create(apiData);
        return transformRepairData(response.data);
      } catch (error) {
        console.error('Error creating repair:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar('Repair created successfully', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to create repair';
      showSnackbar(errorMessage, 'error');
    }
  });

  const updateRepairMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const apiData = transformToAPIFormat(data);
        const response = await repairsApi.update(id, apiData);
        return transformRepairData(response.data);
      } catch (error) {
        console.error('Error updating repair:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar('Repair updated successfully', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to update repair';
      showSnackbar(errorMessage, 'error');
    }
  });

  const patchRepairMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const apiData = transformToAPIFormat(data);
        const response = await repairsApi.patch(id, apiData);
        return transformRepairData(response.data);
      } catch (error) {
        console.error('Error patching repair:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tank-repairs']);
    },
    onError: (error) => {
      console.error('Error patching repair:', error);
    }
  });

  const softDeleteRepairMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const apiData = transformToAPIFormat(data);
        const response = await repairsApi.patch(id, apiData);
        return transformRepairData(response.data);
      } catch (error) {
        console.error('Error soft deleting repair:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar('Repair moved to recycle bin', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to move repair to recycle bin';
      showSnackbar(errorMessage, 'error');
    }
  });

  const bulkSoftDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      try {
        const promises = ids.map(id => {
          const data = {
            is_deleted: true,
            deleted_by: currentUser.name,
            deleted_by_email: currentUser.email,
            deleted_date: new Date().toISOString().split('T')[0]
          };
          return repairsApi.patch(id, data);
        });
        await Promise.all(promises);
        return ids;
      } catch (error) {
        console.error('Error bulk soft deleting repairs:', error);
        throw error;
      }
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar(`${ids.length} repair(s) moved to recycle bin`, 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to move repairs to recycle bin';
      showSnackbar(errorMessage, 'error');
    }
  });

  const restoreRepairMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const data = {
          is_deleted: false,
          deleted_by: null,
          deleted_by_email: null,
          deleted_date: null
        };
        const response = await repairsApi.patch(id, data);
        return transformRepairData(response.data);
      } catch (error) {
        console.error('Error restoring repair:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar('Repair restored successfully', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to restore repair';
      showSnackbar(errorMessage, 'error');
    }
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (ids) => {
      try {
        const promises = ids.map(id => {
          const data = {
            is_deleted: false,
            deleted_by: null,
            deleted_by_email: null,
            deleted_date: null
          };
          return repairsApi.patch(id, data);
        });
        await Promise.all(promises);
        return ids;
      } catch (error) {
        console.error('Error bulk restoring repairs:', error);
        throw error;
      }
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar(`${ids.length} repair(s) restored`, 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to restore repairs';
      showSnackbar(errorMessage, 'error');
    }
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id) => {
      try {
        await repairsApi.delete(id);
        return id;
      } catch (error) {
        console.error('Error permanently deleting repair:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar('Repair permanently deleted', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to permanently delete repair';
      showSnackbar(errorMessage, 'error');
    }
  });

  const bulkPermanentDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      try {
        const promises = ids.map(id =>
          repairsApi.delete(id)
        );
        await Promise.all(promises);
        return ids;
      } catch (error) {
        console.error('Error bulk permanently deleting repairs:', error);
        throw error;
      }
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries(['tank-repairs']);
      showSnackbar(`${ids.length} repair(s) permanently deleted`, 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Failed to permanently delete repairs';
      showSnackbar(errorMessage, 'error');
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setRowsPerPage(prev => ({
      ...prev,
      creation: isMobile ? 5 : 10,
      moreWork: isMobile ? 5 : 10,
      permitting: isMobile ? 5 : 10,
      approved: isMobile ? 5 : 10,
      testing: isMobile ? 5 : 10,
      completed: isMobile ? 5 : 10
    }));
    setRecycleBinRowsPerPage(isMobile ? 5 : 10);
  }, [isMobile]);

  const filterBySearchTerm = (repair) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    const address = parseDashboardAddress(repair.address);
    const searchableFields = [
      repair.name?.toLowerCase() || '',
      repair.address?.toLowerCase() || '',
      address.street?.toLowerCase() || '',
      address.city?.toLowerCase() || '',
      address.state?.toLowerCase() || '',
      address.zip?.toLowerCase() || '',
      repair.workOrderNumber?.toLowerCase() || '',
      repair.stageName?.toLowerCase() || '',
      repair.stressTestDescription?.toLowerCase() || '',
      repair.asBuiltCondition?.toLowerCase() || '',
      repair.rmeReport?.toLowerCase() || '',
      repair.assignedTo?.toLowerCase() || '',
      repair.priority?.toLowerCase() || '',
      repair.notes?.toLowerCase() || '',
      ...(Array.isArray(repair.neededItems) ? repair.neededItems.map(item => item.toLowerCase()) : [])
    ];
    return searchableFields.some(field => field.includes(searchLower));
  };

  const getDaysInStage = (repair) => {
    if (!repair) return "0 min";
    let stageEntryDate = null;
    if (repair.stage === 'creation') {
      stageEntryDate = repair.createdDate;
    } else {
      stageEntryDate = repair.stageEntryDates?.[repair.stage] || repair.createdDate;
    }
    if (!stageEntryDate) return "0 min";
    const entryDate = new Date(stageEntryDate);
    if (!entryDate || isNaN(entryDate.getTime())) return "0 min";
    const now = currentTime;
    const diffMs = Math.abs(now - entryDate);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffMinutes / (60 * 24));
    if (diffMinutes < 60) return `${diffMinutes} min`;
    else if (diffHours < 24) return `${diffHours} hr`;
    else return `${diffDays} d`;
  };

  const getWhatsMissing = (repair) => {
    if (!repair) return [];
    const missing = [];
    if (repair.stage === 'creation') {
      if (!repair.stressTest) missing.push('Stress Test');
      if (!repair.asBuiltCondition) missing.push('As-Built Condition');
      if (!repair.rmeReport || !repair.rmeInspectionFiled) missing.push('RME Report');
    }
    if (repair.stage === 'moreWork') {
      if (repair.neededItems && Array.isArray(repair.neededItems) && repair.neededItems.length > 0) {
        missing.push(...repair.neededItems);
      }
    }
    if (repair.stage === 'permitting') {
      missing.push('Health Department Approval');
    }
    if (repair.stage === 'approved') {
      if (!repair.readyToSchedule) missing.push('Schedule Installation');
    }
    if (repair.stage === 'testing') {
      if (!repair.waterTightnessTest) missing.push('Water Tightness Test');
      if (!repair.followUpReport) missing.push('Follow-up Report');
    }
    return missing;
  };

  const parseDashboardAddress = (fullAddress) => {
    if (!fullAddress) return { street: '', city: '', state: '', zip: '', original: '' };
    try {
      const parts = fullAddress.split(' - ');
      if (parts.length < 2) return { street: fullAddress, city: '', state: '', zip: '', original: fullAddress };
      const street = parts[0].trim();
      const remaining = parts[1].trim();
      const zipMatch = remaining.match(/\b\d{5}\b/);
      const zip = zipMatch ? zipMatch[0] : '';
      const withoutZip = remaining.replace(zip, '').trim();
      const cityState = withoutZip.split(',').map(s => s.trim());
      return { street, city: cityState[0] || '', state: cityState[1] || '', zip, original: fullAddress };
    } catch (error) {
      return { street: fullAddress, city: '', state: '', zip: '', original: fullAddress };
    }
  };

  const activeRepairs = useMemo(() => {
    return repairsData.filter(repair => !repair.isDeleted);
  }, [repairsData]);

  const deletedRepairs = useMemo(() => {
    return repairsData
      .filter(repair => repair.isDeleted)
      .map(repair => {
        const address = parseDashboardAddress(repair.address);
        return { ...repair, street: address.street, city: address.city, state: address.state, zip: address.zip, type: 'REPAIR' };
      });
  }, [repairsData]);

  const topDashboardData = useMemo(() => {
    return activeRepairs
      .filter(filterBySearchTerm)
      .map(repair => {
        const address = parseDashboardAddress(repair.address);
        const stage = REPAIR_STAGES.find(s => s.id === repair.stage);
        return {
          id: repair.id,
          address: repair.address,
          street: address.street,
          cityState: `${address.city}, ${address.state} ${address.zip}`.trim().replace(/^,\s*/, ''),
          customer: repair.name,
          currentStage: stage?.name || repair.stageName,
          stageColor: repair.stageColor,
          whatsMissing: getWhatsMissing(repair),
          daysInStage: getDaysInStage(repair),
          repair
        };
      });
  }, [activeRepairs, currentTime, searchTerm]);

  const repairsByStage = useMemo(() => {
    const grouped = {};
    REPAIR_STAGES.forEach(stage => {
      grouped[stage.id] = activeRepairs
        .filter(r => r.stage === stage.id)
        .filter(filterBySearchTerm);
    });
    return grouped;
  }, [activeRepairs, searchTerm]);

  const handleOpenDetails = (repair) => {
    setSelectedRepair(repair);
    setEditForm({
      stressTest: repair.stressTest || '',
      asBuiltCondition: repair.asBuiltCondition || '',
      rmeReport: repair.rmeReport || '',
      rmeInspectionFiled: repair.rmeInspectionFiled || false,
      neededItems: Array.isArray(repair.neededItems) ? repair.neededItems : [],
      waterTightnessTest: repair.waterTightnessTest || false,
      followUpReport: repair.followUpReport || false,
      readyToSchedule: repair.readyToSchedule || false,
      notes: repair.notes || ''
    });
    setDetailsDialogOpen(true);
  };

  const handleOpenEdit = (repair) => {
    setSelectedRepair(repair);
    setEditForm({
      stressTest: repair.stressTest || '',
      asBuiltCondition: repair.asBuiltCondition || '',
      rmeReport: repair.rmeReport || '',
      rmeInspectionFiled: repair.rmeInspectionFiled || false,
      neededItems: Array.isArray(repair.neededItems) ? repair.neededItems : [],
      waterTightnessTest: repair.waterTightnessTest || false,
      followUpReport: repair.followUpReport || false,
      readyToSchedule: repair.readyToSchedule || false,
      notes: repair.notes || ''
    });
    setActiveStep(0);
    setEditDialogOpen(true);
  };

  const handleOpenNewRepair = () => {
    setNewRepair({ name: '', address: '', stressTest: '', asBuiltCondition: '', rmeReport: '', rmeInspectionFiled: false });
    setActiveStep(0);
    setNewRepairDialogOpen(true);
  };

  const handleOpenRecycleBin = () => {
    setRecycleBinModalOpen(true);
    setIsRecycleBinLoading(true);
    setTimeout(() => { setIsRecycleBinLoading(false); }, 500);
  };

  const handleSaveRepair = () => {
    if (!selectedRepair) return;
    const updateData = { ...editForm, lastUpdated: new Date().toISOString() };
    const stageEntryDates = { ...selectedRepair.stageEntryDates };

    if (selectedRepair.stage === 'permitting' && editForm.readyToSchedule) {
      updateData.stage = 'approved';
      updateData.stageName = '3: Approved';
      updateData.stageColor = YELLOW_COLOR;
      updateData.approvedDate = new Date().toISOString();
      stageEntryDates.approved = new Date().toISOString();
      updateData.stageEntryDates = stageEntryDates;
    } else if (selectedRepair.stage === 'approved' && (editForm.waterTightnessTest || editForm.followUpReport)) {
      updateData.stage = 'testing';
      updateData.stageName = '4: Testing';
      updateData.stageColor = TEAL_COLOR;
      stageEntryDates.testing = new Date().toISOString();
      updateData.stageEntryDates = stageEntryDates;
    } else if (selectedRepair.stage === 'testing' && editForm.waterTightnessTest && editForm.followUpReport) {
      updateData.stage = 'completed';
      updateData.stageName = '5: Project Complete';
      updateData.stageColor = GREEN_COLOR;
      updateData.completionDate = new Date().toISOString();
      stageEntryDates.completed = new Date().toISOString();
      updateData.stageEntryDates = stageEntryDates;
    }

    updateRepairMutation.mutate({ id: selectedRepair.id, data: updateData });
    setEditDialogOpen(false);
    setDetailsDialogOpen(false);
  };

  const handleAddNewRepair = () => {
    if (!newRepair.name || !newRepair.address) {
      showSnackbar('Please fill in name and address', 'error');
      return;
    }

    let stage = 'creation';
    let stageName = '1: Job Creation';
    let neededItems = [];
    let stageColor = GRAY_COLOR;
    const stageEntryDates = {
      creation: new Date().toISOString(),
      moreWork: null, permitting: null, approved: null, testing: null, completed: null
    };

    if (newRepair.stressTest === 'failed' || newRepair.asBuiltCondition === 'insufficient' ||
      newRepair.rmeReport === 'missing' || !newRepair.rmeInspectionFiled) {
      stage = 'moreWork';
      stageName = '1B: More Work Needed';
      stageColor = ORANGE_COLOR;
      stageEntryDates.moreWork = new Date().toISOString();
      if (newRepair.stressTest === 'failed') neededItems.push('Drain Field Repair');
      if (newRepair.asBuiltCondition === 'insufficient') neededItems.push('As-Built Creation');
      if (newRepair.rmeReport === 'missing' || !newRepair.rmeInspectionFiled) neededItems.push('Inspection RME On File');
    } else if (newRepair.stressTest && newRepair.stressTest !== 'failed' &&
      newRepair.asBuiltCondition === 'meets_criteria' &&
      newRepair.rmeReport === 'filed' && newRepair.rmeInspectionFiled) {
      stage = 'permitting';
      stageName = '2: Permitting';
      stageColor = BLUE_COLOR;
      stageEntryDates.permitting = new Date().toISOString();
    }

    const repairData = {
      name: newRepair.name, address: newRepair.address, stage, stageName, stageColor,
      stageEntryDates, stressTest: newRepair.stressTest, asBuiltCondition: newRepair.asBuiltCondition,
      rmeReport: newRepair.rmeReport, rmeInspectionFiled: newRepair.rmeInspectionFiled, neededItems,
      notes: 'New repair job created', createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(), isDeleted: false, assignedTo: 'Unassigned', priority: 'Standard'
    };

    createRepairMutation.mutate(repairData);
    setNewRepairDialogOpen(false);
  };

  const handleMoveStage = (repairId, direction) => {
    const repair = activeRepairs.find(r => r.id === repairId);
    if (!repair) return;
    const currentStageIndex = REPAIR_STAGES.findIndex(s => s.id === repair.stage);
    let newStageIndex = currentStageIndex;
    if (direction === 'forward' && currentStageIndex < REPAIR_STAGES.length - 1) newStageIndex = currentStageIndex + 1;
    else if (direction === 'backward' && currentStageIndex > 0) newStageIndex = currentStageIndex - 1;
    else return;

    const newStage = REPAIR_STAGES[newStageIndex];
    const stageEntryDates = { ...repair.stageEntryDates };
    if (direction === 'forward') stageEntryDates[newStage.id] = new Date().toISOString();

    patchRepairMutation.mutate({
      id: repairId,
      data: { stage: newStage.id, stageName: newStage.name, stageColor: newStage.color, stageEntryDates, lastUpdated: new Date().toISOString() }
    });
  };

  const handleCompleteItem = (repairId, item) => {
    const repair = activeRepairs.find(r => r.id === repairId);
    if (!repair) return;
    const currentNeededItems = Array.isArray(repair.neededItems) ? repair.neededItems : [];
    const newNeededItems = currentNeededItems.filter(i => i !== item);
    const updateData = { neededItems: newNeededItems, lastUpdated: new Date().toISOString() };

    if (newNeededItems.length === 0 && repair.stage === 'moreWork') {
      if (repair.stressTest && repair.stressTest !== 'failed' &&
        repair.asBuiltCondition === 'meets_criteria' && repair.rmeReport === 'filed' && repair.rmeInspectionFiled) {
        const newStage = REPAIR_STAGES.find(s => s.id === 'permitting');
        updateData.stage = 'permitting';
        updateData.stageName = newStage.name;
        updateData.stageColor = newStage.color;
        const stageEntryDates = { ...repair.stageEntryDates };
        stageEntryDates.permitting = new Date().toISOString();
        updateData.stageEntryDates = stageEntryDates;
      }
    }
    patchRepairMutation.mutate({ id: repairId, data: updateData });
  };

  const handleToggleSelection = (stageId, repairId) => {
    setSelectedRepairs(prev => {
      const newSet = new Set(prev[stageId]);
      if (newSet.has(repairId)) newSet.delete(repairId);
      else newSet.add(repairId);
      return { ...prev, [stageId]: newSet };
    });
  };

  const handleToggleAllSelection = (stageId, items) => {
    if (!items || !Array.isArray(items)) return;
    setSelectedRepairs(prev => {
      const currentSet = prev[stageId];
      const allPageIds = new Set(items.map(item => item?.id).filter(Boolean));
      const allSelected = Array.from(allPageIds).every(id => currentSet.has(id));
      if (allSelected) {
        const newSet = new Set(currentSet);
        allPageIds.forEach(id => newSet.delete(id));
        return { ...prev, [stageId]: newSet };
      } else {
        const newSet = new Set([...currentSet, ...allPageIds]);
        return { ...prev, [stageId]: newSet };
      }
    });
  };

  const handleSingleSoftDeleteClick = (repairId, workOrderNumber = null, customerName = null) => {
    setDeleteTarget({ type: 'single', stageId: null, repairId, count: 1, workOrderNumber, customerName });
    setDeleteConfirmationOpen(true);
  };

  const handleBulkSoftDeleteClick = (stageId) => {
    const selectedIds = Array.from(selectedRepairs[stageId]);
    if (selectedIds.length === 0) return;
    setDeleteTarget({ type: 'bulk', stageId, repairId: null, count: selectedIds.length, workOrderNumber: null, customerName: null });
    setBulkDeleteConfirmationOpen(true);
  };

  const confirmSingleSoftDelete = () => {
    const { repairId } = deleteTarget;
    softDeleteRepairMutation.mutate({
      id: repairId,
      data: { isDeleted: true, deletedBy: currentUser.name, deletedByEmail: currentUser.email, deletedDate: new Date().toISOString().split('T')[0] }
    });
    REPAIR_STAGES.forEach(stage => {
      setSelectedRepairs(prev => {
        const newSet = new Set(prev[stage.id]);
        newSet.delete(repairId);
        return { ...prev, [stage.id]: newSet };
      });
    });
    if (detailsDialogOpen) setDetailsDialogOpen(false);
  };

  const confirmBulkSoftDelete = () => {
    const { stageId } = deleteTarget;
    const selectedIds = Array.from(selectedRepairs[stageId]);
    bulkSoftDeleteMutation.mutate(selectedIds);
    setSelectedRepairs(prev => ({ ...prev, [stageId]: new Set() }));
  };

  const toggleRecycleBinSelection = (itemId) => {
    const newSet = new Set(selectedRecycleBinItems);
    if (newSet.has(itemId)) newSet.delete(itemId);
    else newSet.add(itemId);
    setSelectedRecycleBinItems(newSet);
  };

  const toggleAllRecycleBinSelection = () => {
    const currentItems = deletedRepairs.slice(
      recycleBinPage * recycleBinRowsPerPage,
      recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
    ).map(item => item?.id).filter(Boolean);
    const allSelected = currentItems.every(id => selectedRecycleBinItems.has(id));
    const newSet = new Set(selectedRecycleBinItems);
    if (allSelected) currentItems.forEach(id => newSet.delete(id));
    else currentItems.forEach(id => newSet.add(id));
    setSelectedRecycleBinItems(newSet);
  };

  const handleRestoreFromRecycleBin = (itemIds) => {
    bulkRestoreMutation.mutate(itemIds);
    setSelectedRecycleBinItems(new Set());
  };

  const handlePermanentDeleteFromRecycleBin = (itemIds) => {
    bulkPermanentDeleteMutation.mutate(itemIds);
    setSelectedRecycleBinItems(new Set());
  };

  const confirmBulkRestore = () => {
    if (selectedRecycleBinItems.size === 0) return;
    handleRestoreFromRecycleBin(Array.from(selectedRecycleBinItems));
  };

  // ── NO window.confirm() — RecycleBinModal owns the confirmation dialog ──
  const confirmBulkPermanentDelete = () => {
    if (selectedRecycleBinItems.size === 0) return;
    handlePermanentDeleteFromRecycleBin(Array.from(selectedRecycleBinItems));
  };

  // ── NO window.confirm() — RecycleBinModal owns the confirmation dialog ──
  const handleSinglePermanentDelete = (item) => {
    if (!item || !item.id) return;
    permanentDeleteMutation.mutate(item.id);
  };

  const handleSingleRestore = (item) => {
    if (!item || !item.id) return;
    restoreRepairMutation.mutate(item.id);
  };

  const handleChangePage = (stageId, newPage) => {
    setPage(prev => ({ ...prev, [stageId]: newPage }));
  };

  const handleChangeRowsPerPage = (stageId, event) => {
    setRowsPerPage(prev => ({ ...prev, [stageId]: parseInt(event.target.value, 10) }));
    setPage(prev => ({ ...prev, [stageId]: 0 }));
  };

  const getStageItems = (stageId) => {
    const items = repairsByStage[stageId] || [];
    const start = page[stageId] * rowsPerPage[stageId];
    const end = start + rowsPerPage[stageId];
    return items.slice(start, end);
  };

  const getDaysSince = (dateString) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    if (!date || isNaN(date.getTime())) return 0;
    const now = currentTime;
    const diffTime = Math.abs(now - date);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return format(date, "MM/dd/yyyy hh:mm a");
  };

  const renderStageContent = (stageIndex, context = 'edit') => {
    const formData = context === 'new' ? newRepair : editForm;
    const currentRepair = selectedRepair;
    const isMobileView = isMobile;

    switch (stageIndex) {
      case 0:
        return (
          <Box sx={{ mt: isMobileView ? 1 : 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: TEXT_COLOR, fontWeight: 600, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
              Must fill in at least 1 check box per question to move forward.
            </Typography>
            <Accordion defaultExpanded sx={{ mb: 2, border: `1px solid ${alpha(BLUE_COLOR, 0.1)}` }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                  <FileCheck size={isMobileView ? 16 : 18} color={BLUE_COLOR} />
                  1. Stress Test Section (Required)
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: isMobileView ? 1 : 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>
                  <strong>User must select at least 1 checkbox</strong> before moving to next stage
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={500} gutterBottom sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                    Stress Test
                  </Typography>
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Checkbox size="small"
                          checked={formData.stressTest === 'vacant_passed'}
                          onChange={(e) => {
                            if (context === 'edit') setEditForm({ ...editForm, stressTest: e.target.checked ? 'vacant_passed' : '' });
                            else setNewRepair({ ...newRepair, stressTest: e.target.checked ? 'vacant_passed' : '' });
                          }} />
                      }
                      label={<Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>Vacant - Completed 120 Gallons Per Bedroom Stress Test</Typography>}
                    />
                    <Box sx={{ ml: isMobileView ? 2 : 4 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.7rem' : '0.75rem' }}>OR</Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox size="small"
                          checked={formData.stressTest === 'occupied_passed'}
                          onChange={(e) => {
                            if (context === 'edit') setEditForm({ ...editForm, stressTest: e.target.checked ? 'occupied_passed' : '' });
                            else setNewRepair({ ...newRepair, stressTest: e.target.checked ? 'occupied_passed' : '' });
                          }} />
                      }
                      label={<Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>Occupied - Completed 120 Gallon Stress Test</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox size="small"
                          checked={formData.stressTest === 'failed'}
                          onChange={(e) => {
                            if (context === 'edit') setEditForm({ ...editForm, stressTest: e.target.checked ? 'failed' : '' });
                            else setNewRepair({ ...newRepair, stressTest: e.target.checked ? 'failed' : '' });
                          }} />
                      }
                      label={<Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem', color: RED_COLOR }}>Failed Stress Test - Drain Field Repair Scheduled (Move to 1B - 'Drain Field Repair')</Typography>}
                    />
                  </Stack>
                </Box>
                <Box sx={{ mt: 2, p: isMobileView ? 1 : 2, bgcolor: alpha(ORANGE_COLOR, 0.05), borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: isMobileView ? '0.7rem' : '0.75rem' }}>
                    <AlertTriangle size={isMobileView ? 12 : 14} color={ORANGE_COLOR} />
                    <strong>Note:</strong> If "Failed Stress Test" is selected, job will automatically move to "1B: More Work Needed"
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
            <Accordion defaultExpanded sx={{ mb: 2, border: `1px solid ${alpha(PURPLE_COLOR, 0.1)}` }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                  <ClipboardCheck size={isMobileView ? 16 : 18} color={PURPLE_COLOR} />
                  2. Existing As-Built Condition Check
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: isMobileView ? 1 : 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>
                  System will determine if permitting is possible based on this check
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={500} gutterBottom sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                    Existing As-Built Condition
                  </Typography>
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Checkbox size="small"
                          checked={formData.asBuiltCondition === 'meets_criteria'}
                          onChange={(e) => {
                            if (context === 'edit') setEditForm({ ...editForm, asBuiltCondition: e.target.checked ? 'meets_criteria' : '' });
                            else setNewRepair({ ...newRepair, asBuiltCondition: e.target.checked ? 'meets_criteria' : '' });
                          }} />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>"Meets Permit Criteria"</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>(Move to PERMITTING if stress test was passed as well)</Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Checkbox size="small"
                          checked={formData.asBuiltCondition === 'insufficient'}
                          onChange={(e) => {
                            if (context === 'edit') setEditForm({ ...editForm, asBuiltCondition: e.target.checked ? 'insufficient' : '' });
                            else setNewRepair({ ...newRepair, asBuiltCondition: e.target.checked ? 'insufficient' : '' });
                          }} />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>"Does Not Meet Permitting Criteria"</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>(Move to MORE WORK NEEDED + "AS-BUILT CREATION")</Typography>
                        </Box>
                      }
                    />
                  </Stack>
                </Box>
                <OutlineButton variant="text" size="small" startIcon={<Info size={isMobileView ? 14 : 16} />} onClick={() => setAsBuiltModalOpen(true)} fullWidth={isMobileView} sx={{ mt: 2, fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>
                  View As-Built Requirements
                </OutlineButton>
              </AccordionDetails>
            </Accordion>
            <Accordion defaultExpanded sx={{ mb: 2, border: `1px solid ${alpha(TEAL_COLOR, 0.1)}` }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                  <ShieldCheck size={isMobileView ? 16 : 18} color={TEAL_COLOR} />
                  3. RME Report Section
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: isMobileView ? 1 : 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>
                  Both conditions must be checked to move to PERMITTING
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Checkbox size="small"
                        checked={formData.rmeReport === 'filed'}
                        onChange={(e) => {
                          if (context === 'edit') setEditForm({ ...editForm, rmeReport: e.target.checked ? 'filed' : '', rmeInspectionFiled: e.target.checked });
                          else setNewRepair({ ...newRepair, rmeReport: e.target.checked ? 'filed' : '', rmeInspectionFiled: e.target.checked });
                        }} />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>Filed Inspection Of All Components</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>(Move to PERMITTING IF BOTH CHECKED)</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={<Checkbox size="small" checked={formData.stressTest && formData.stressTest !== 'failed'} disabled />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>Stress Test Passed</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>(Move to PERMITTING IF BOTH CHECKED)</Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ ml: isMobileView ? 2 : 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.7rem' : '0.75rem' }}>OR</Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox size="small"
                        checked={formData.rmeReport === 'missing'}
                        onChange={(e) => {
                          if (context === 'edit') setEditForm({ ...editForm, rmeReport: e.target.checked ? 'missing' : '', rmeInspectionFiled: false });
                          else setNewRepair({ ...newRepair, rmeReport: e.target.checked ? 'missing' : '', rmeInspectionFiled: false });
                        }} />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>Inspection Not Filed</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>(Move to MORE WORK NEEDED with any other items needed)</Typography>
                      </Box>
                    }
                  />
                </Stack>
                <Box sx={{ mt: 2, p: isMobileView ? 1 : 2, bgcolor: alpha(ORANGE_COLOR, 0.05), borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: isMobileView ? '0.7rem' : '0.75rem' }}>
                    <AlertTriangle size={isMobileView ? 12 : 14} color={ORANGE_COLOR} />
                    <strong>Final Rule:</strong> All three sections must be submitted as "Yes" to move to step 2. Otherwise, Job will move to 1B.
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: isMobileView ? 1 : 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: TEXT_COLOR, fontWeight: 600, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
              MORE WORK NEEDED (Must be no remaining items to move to next step)
            </Typography>
            <Accordion defaultExpanded sx={{ mb: 2, border: `1px solid ${alpha(ORANGE_COLOR, 0.1)}` }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                  <Construction size={isMobileView ? 16 : 18} color={ORANGE_COLOR} />
                  Drain Field Repair
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: isMobileView ? 1 : 2 }}>
                <Stack spacing={1}>
                  {['vacant_passed', 'occupied_passed', 'failed'].map((val) => (
                    <FormControlLabel
                      key={val}
                      control={
                        <Checkbox size="small" checked={formData.stressTest === val}
                          onChange={(e) => { if (e.target.checked && context === 'edit') setEditForm({ ...editForm, stressTest: val }); }} />
                      }
                      label={
                        <Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem', color: val === 'failed' ? RED_COLOR : 'inherit' }}>
                          {val === 'vacant_passed' ? 'Yes -- Vacant -- 120 Gallons Per Bedroom' :
                            val === 'occupied_passed' ? 'Yes -- Occupied -- 120 Gallons' :
                              "No -- (Save job in 'Canceled/Complete' File)"}
                        </Typography>
                      }
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
            <Accordion defaultExpanded sx={{ mb: 2, border: `1px solid ${alpha(PURPLE_COLOR, 0.1)}` }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                  <FileText size={isMobileView ? 16 : 18} color={PURPLE_COLOR} />
                  As-Built Creation
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: isMobileView ? 1 : 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox size="small" checked={formData.asBuiltCondition === 'meets_criteria'}
                      onChange={(e) => { if (e.target.checked && context === 'edit') setEditForm({ ...editForm, asBuiltCondition: 'meets_criteria' }); }} />
                  }
                  label={<Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>As-built sufficient for submission? (Move to 'PERMIT PROCESS')</Typography>}
                />
                <OutlineButton variant="text" size="small" startIcon={<Info size={14} />} onClick={() => setAsBuiltModalOpen(true)} fullWidth={isMobileView} sx={{ mt: 2, fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>
                  View As-Built Requirements
                </OutlineButton>
              </AccordionDetails>
            </Accordion>
            <Accordion defaultExpanded sx={{ mb: 2, border: `1px solid ${alpha(TEAL_COLOR, 0.1)}` }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                  <ShieldCheck size={isMobileView ? 16 : 18} color={TEAL_COLOR} />
                  Inspection RME On File
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: isMobileView ? 1 : 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox size="small" checked={formData.rmeReport === 'filed' && formData.rmeInspectionFiled}
                      onChange={(e) => { if (e.target.checked && context === 'edit') setEditForm({ ...editForm, rmeReport: 'filed', rmeInspectionFiled: true }); }} />
                  }
                  label={<Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>RME Report with passing stress test and full inspection? (Move to 'PERMIT PROCESS')</Typography>}
                />
              </AccordionDetails>
            </Accordion>
            {context === 'edit' && (
              <Box sx={{ mt: 3, p: isMobileView ? 1.5 : 2, bgcolor: alpha(GRAY_COLOR, 0.05), borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                  Current Missing Items ({formData.neededItems.length})
                </Typography>
                {formData.neededItems.length > 0 ? (
                  <Stack spacing={1}>
                    {formData.neededItems.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox size="small" onChange={() => handleCompleteItem(currentRepair?.id, item)} />
                        <Typography variant="body2" sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>{item}</Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ p: isMobileView ? 1.5 : 2, textAlign: 'center', bgcolor: alpha(GREEN_COLOR, 0.05), borderRadius: 1 }}>
                    <CheckCircle size={isMobileView ? 20 : 24} color={GREEN_COLOR} />
                    <Typography variant="body2" sx={{ mt: 1, color: GREEN_COLOR, fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>
                      All tasks completed! Ready to move to PERMITTING
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: isMobileView ? 1 : 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: TEXT_COLOR, fontWeight: 600, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
              PERMITTING - Submitted: Waiting for Approval
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobileView ? 'column' : 'row', alignItems: isMobileView ? 'flex-start' : 'center' }}>
                <Clock size={isMobileView ? 20 : 24} color={BLUE_COLOR} />
                <Box>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
                    Status: {currentRepair?.permitSubmittedDate ? 'Submitted' : 'Not Submitted'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobileView ? '0.7rem' : '0.75rem' }}>
                    {currentRepair?.permitSubmittedDate ? `Submitted ${getDaysSince(currentRepair.permitSubmittedDate)} days ago` : 'Ready to submit to health department'}
                  </Typography>
                </Box>
              </Box>
              <Paper variant="outlined" sx={{ p: isMobileView ? 1.5 : 2, bgcolor: alpha(BLUE_COLOR, 0.05) }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Timer size={isMobileView ? 18 : 20} color={BLUE_COLOR} />
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>Time Since Submission</Typography>
                    <Typography variant="h6" color={BLUE_COLOR} sx={{ fontSize: isMobileView ? '0.9rem' : '1rem' }}>
                      {currentRepair?.permitSubmittedDate ? `${getDaysSince(currentRepair.permitSubmittedDate)} days` : 'Not submitted yet'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Stack>
          </Box>
        );
      case 3:
        return (
          <Box sx={{ mt: isMobileView ? 1 : 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: TEXT_COLOR, fontWeight: 600, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>
              APPROVED - Approved: Ready to Schedule
            </Typography>
            <Paper variant="outlined" sx={{ p: isMobileView ? 1.5 : 2, mb: 2, bgcolor: alpha(YELLOW_COLOR, 0.05) }}>
              <FormControlLabel
                control={
                  <Checkbox checked={formData.readyToSchedule}
                    onChange={(e) => {
                      if (context === 'edit') {
                        setEditForm({ ...editForm, readyToSchedule: e.target.checked });
                        if (e.target.checked) showSnackbar('Project approved! Thumbs up symbol added.', 'success');
                      }
                    }}
                    size="small" />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>"APPROVED -- READY TO SCHEDULE"</Typography>
                    {formData.readyToSchedule && <ThumbUp sx={{ fontSize: isMobileView ? 18 : 20, color: GREEN_COLOR }} />}
                  </Box>
                }
              />
            </Paper>
          </Box>
        );
      case 4:
        return (
          <Box sx={{ mt: isMobileView ? 1 : 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: TEXT_COLOR, fontWeight: 600, fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>TESTING</Typography>
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: isMobileView ? 1.5 : 2 }}>
                <Typography variant="body2" fontWeight={500} gutterBottom sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>Water Tightness Test</Typography>
                <FormControlLabel
                  control={<Checkbox checked={formData.waterTightnessTest} onChange={(e) => { if (context === 'edit') setEditForm({ ...editForm, waterTightnessTest: e.target.checked }); }} size="small" />}
                  label={<Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>"Water-Tightness Check Passed"</Typography>}
                />
              </Paper>
              <Paper variant="outlined" sx={{ p: isMobileView ? 1.5 : 2 }}>
                <Typography variant="body2" fontWeight={500} gutterBottom sx={{ fontSize: isMobileView ? '0.8rem' : '0.85rem' }}>Follow-up Report Submit</Typography>
                <FormControlLabel
                  control={<Checkbox checked={formData.followUpReport} onChange={(e) => { if (context === 'edit') setEditForm({ ...editForm, followUpReport: e.target.checked }); }} size="small" />}
                  label={<Typography sx={{ fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>"Follow-up Report Submitted"</Typography>}
                />
              </Paper>
            </Stack>
          </Box>
        );
      case 5:
        return (
          <Box sx={{ mt: isMobileView ? 1 : 2, textAlign: 'center', p: isMobileView ? 2 : 4 }}>
            <Award size={isMobileView ? 40 : 48} color={GREEN_COLOR} />
            <Typography variant="h6" sx={{ mt: 2, color: GREEN_COLOR, fontSize: isMobileView ? '0.9rem' : '1rem' }}>Project Completed!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: isMobileView ? '0.75rem' : '0.85rem' }}>
              Move projects here once they have been completed for tracking.
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  const renderStatusDetails = (item, stage) => {
    if (!item) return null;
    const isMobileView = isMobile;
    switch (stage.id) {
      case 'creation':
        return (
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>Initial Assessment Needed</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {!item.stressTest && <Chip label="Stress Test" size="small" variant="outlined" sx={{ fontSize: isMobileView ? '0.6rem' : '0.7rem', height: isMobileView ? '18px' : '20px' }} />}
              {!item.asBuiltCondition && <Chip label="As-Built" size="small" variant="outlined" sx={{ fontSize: isMobileView ? '0.6rem' : '0.7rem', height: isMobileView ? '18px' : '20px' }} />}
              {!item.rmeReport && <Chip label="RME Report" size="small" variant="outlined" sx={{ fontSize: isMobileView ? '0.6rem' : '0.7rem', height: isMobileView ? '18px' : '20px' }} />}
            </Box>
          </Stack>
        );
      case 'moreWork':
        const neededItems = Array.isArray(item.neededItems) ? item.neededItems : [];
        return (
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: ORANGE_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem', fontWeight: 500 }}>
              {neededItems.length} item(s) needed
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {neededItems.map((neededItem, index) => (
                <Chip key={index} label={neededItem} size="small" color="warning"
                  onDelete={() => handleCompleteItem(item.id, neededItem)}
                  deleteIcon={<CheckSquare size={isMobileView ? 10 : 12} />}
                  sx={{ fontSize: isMobileView ? '0.6rem' : '0.7rem', height: isMobileView ? '18px' : '20px' }} />
              ))}
            </Box>
          </Stack>
        );
      case 'permitting':
        return (
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: BLUE_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem', fontWeight: 500 }}>
              Submitted {item.permitDaysPending || getDaysSince(item.permitSubmittedDate)} days ago
            </Typography>
            <LinearProgress variant="determinate" value={Math.min((item.permitDaysPending || getDaysSince(item.permitSubmittedDate)) * 5, 100)} sx={{ height: isMobileView ? 3 : 4, borderRadius: 2 }} />
          </Stack>
        );
      case 'approved':
        return (
          <Stack spacing={0.5} direction="row" alignItems="center">
            <ThumbUp sx={{ fontSize: isMobileView ? 14 : 16, color: YELLOW_COLOR }} />
            <Typography variant="caption" sx={{ color: YELLOW_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem', fontWeight: 500 }}>
              {item.readyToSchedule ? 'APPROVED – READY TO SCHEDULE' : 'Approved - In Progress'}
            </Typography>
          </Stack>
        );
      case 'testing':
        return (
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Chip label="Water Tightness Test" size="small" color={item.waterTightnessTest ? "success" : "default"} variant={item.waterTightnessTest ? "filled" : "outlined"} sx={{ fontSize: isMobileView ? '0.6rem' : '0.7rem', height: isMobileView ? '18px' : '20px' }} />
              <Chip label="Follow-up Report" size="small" color={item.followUpReport ? "success" : "default"} variant={item.followUpReport ? "filled" : "outlined"} sx={{ fontSize: isMobileView ? '0.6rem' : '0.7rem', height: isMobileView ? '18px' : '20px' }} />
            </Box>
          </Stack>
        );
      case 'completed':
        return (
          <Stack spacing={0.5} direction="row" alignItems="center">
            <CheckCircle size={isMobileView ? 14 : 16} color={GREEN_COLOR} />
            <Typography variant="caption" sx={{ color: GREEN_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem', fontWeight: 500 }}>
              Completed {item.lastUpdated ? formatDateShort(item.lastUpdated) : '—'}
            </Typography>
          </Stack>
        );
      default:
        return null;
    }
  };

  if (isLoading) return <DashboardLoader />;

  const renderTopDashboard = () => (
    <Paper elevation={0} sx={{ mb: isMobile ? 3 : 4, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <Box sx={{ p: isMobile ? 1.5 : 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 600, color: TEXT_COLOR }}>Recent Work Orders</Typography>
        <IconButton size="small" onClick={() => setShowTopDashboard(!showTopDashboard)} sx={{ color: GRAY_COLOR }}>
          {showTopDashboard ? <ChevronDown size={isMobile ? 18 : 20} /> : <ChevronRight size={isMobile ? 18 : 20} />}
        </IconButton>
      </Box>
      {showTopDashboard && (
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: isMobile ? 650 : 'auto' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                  {[
                    { icon: <Home size={isMobile ? 14 : 16} />, label: 'Address' },
                    { icon: <ClipboardCheck size={isMobile ? 14 : 16} />, label: 'Current Stage' },
                    { icon: <AlertTriangle size={isMobile ? 14 : 16} />, label: "What's Missing" },
                    { icon: <Calendar size={isMobile ? 14 : 16} />, label: 'Days in Stage' },
                    { icon: <User size={isMobile ? 14 : 16} />, label: 'Customer' },
                  ].map(({ icon, label }) => (
                    <TableCell key={label} sx={{ fontWeight: 600, fontSize: isMobile ? '0.75rem' : '0.85rem', color: TEXT_COLOR }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{icon}{!isMobile && label}</Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {topDashboardData.slice(0, isMobile ? 3 : topDashboardData.length).map((row) => (
                  <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer' }} onClick={() => handleOpenDetails(row.repair)}>
                    <TableCell sx={{ py: isMobile ? 1 : 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: isMobile ? '0.75rem' : '0.85rem' }}>{row.street}</Typography>
                      {!isMobile && <Typography variant="caption" sx={{ color: GRAY_COLOR }}>{row.cityState}</Typography>}
                    </TableCell>
                    <TableCell sx={{ py: isMobile ? 1 : 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: isMobile ? 6 : 8, height: isMobile ? 6 : 8, borderRadius: '50%', backgroundColor: row.stageColor }} />
                        <Typography variant="body2" sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}>{row.currentStage}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: isMobile ? 1 : 1.5 }}>
                      {row.whatsMissing.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {row.whatsMissing.slice(0, isMobile ? 1 : 3).map((item, index) => (
                            <Chip key={index} label={item} size="small" sx={{ fontSize: isMobile ? '0.6rem' : '0.7rem', height: isMobile ? '18px' : '20px', bgcolor: alpha(ORANGE_COLOR, 0.1), color: ORANGE_COLOR }} />
                          ))}
                          {isMobile && row.whatsMissing.length > 1 && <Typography variant="caption" sx={{ fontSize: '0.6rem', color: GRAY_COLOR }}>+{row.whatsMissing.length - 1} more</Typography>}
                        </Box>
                      ) : (
                        <Chip label="All Clear" size="small" sx={{ fontSize: isMobile ? '0.6rem' : '0.7rem', height: isMobile ? '18px' : '20px', bgcolor: alpha(GREEN_COLOR, 0.1), color: GREEN_COLOR }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ py: isMobile ? 1 : 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: row.daysInStage > 14 ? 600 : 400, color: row.daysInStage > 14 ? ORANGE_COLOR : TEXT_COLOR }}>
                          {row.daysInStage}
                        </Typography>
                        {row.daysInStage > 14 && <AlertTriangle size={isMobile ? 12 : 14} color={ORANGE_COLOR} />}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: isMobile ? 1 : 1.5 }}>
                      <Typography variant="body2" sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}>{row.customer}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  );

  const renderStageCard = (stage) => {
    const items = repairsByStage[stage.id] || [];
    const pageItems = getStageItems(stage.id);
    const selectedCount = selectedRepairs[stage.id].size;
    const allSelectedOnPage = pageItems.length > 0 && pageItems.every(item => selectedRepairs[stage.id].has(item.id));
    const someSelectedOnPage = pageItems.length > 0 && pageItems.some(item => selectedRepairs[stage.id].has(item.id));
    const isMobileView = isMobile;

    return (
      <Paper elevation={0} sx={{ mb: isMobileView ? 3 : 4, borderRadius: '6px', overflow: 'hidden', border: `1px solid ${alpha(stage.color, 0.15)}`, bgcolor: 'white' }}>
        <Box sx={{ p: isMobileView ? 1 : 1.5, bgcolor: 'white', borderBottom: `1px solid ${alpha(stage.color, 0.1)}`, display: 'flex', flexDirection: isMobileView ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileView ? 'flex-start' : 'center', gap: isMobileView ? 1 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: isMobileView ? '100%' : 'auto', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: isMobileView ? '0.9rem' : '1rem', color: TEXT_COLOR, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              {stage.name}
              <Chip size="small" label={items.length} sx={{ bgcolor: alpha(stage.color, 0.08), color: TEXT_COLOR, fontSize: isMobileView ? '0.7rem' : '0.75rem', fontWeight: 500, height: isMobileView ? '20px' : '22px', '& .MuiChip-label': { px: isMobileView ? 0.5 : 1 } }} />
            </Typography>
            {isMobileView && selectedCount > 0 && (
              <OutlineButton variant="outlined" color="error" size="small" onClick={() => handleBulkSoftDeleteClick(stage.id)} startIcon={<Trash2 size={12} />} sx={{ fontSize: '0.7rem', height: '28px', px: 1 }}>
                Delete ({selectedCount})
              </OutlineButton>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: isMobileView ? '100%' : 'auto' }}>
            {stage.id === 'permitting' && items.length > 0 && (
              <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timer size={isMobileView ? 10 : 12} />
                Avg: {Math.round(items.reduce((sum, item) => sum + (item.permitDaysPending || 0), 0) / items.length)}d
              </Typography>
            )}
            {!isMobileView && selectedCount > 0 && (
              <OutlineButton variant="outlined" color="error" size="small" onClick={() => handleBulkSoftDeleteClick(stage.id)} startIcon={<Trash2 size={14} />} sx={{ fontSize: '0.75rem', height: '30px', px: 1.5 }}>
                Delete ({selectedCount})
              </OutlineButton>
            )}
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: isMobileView ? 800 : 'auto' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(stage.color, 0.04), '& th': { borderBottom: `2px solid ${alpha(stage.color, 0.1)}` } }}>
                  <TableCell padding="checkbox" width={isMobileView ? 40 : 50} sx={{ color: TEXT_COLOR, fontSize: isMobileView ? '0.7rem' : '0.8rem', fontWeight: 600, py: isMobileView ? 1 : 1.5, pl: isMobileView ? 1.5 : 2.5 }}>
                    <Checkbox size="small" checked={allSelectedOnPage} indeterminate={someSelectedOnPage && !allSelectedOnPage} onChange={() => handleToggleAllSelection(stage.id, pageItems)} sx={{ color: TEXT_COLOR, padding: isMobileView ? '2px' : '4px' }} />
                  </TableCell>
                  {['Customer', 'Address', 'Next Steps', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: TEXT_COLOR, fontSize: isMobileView ? '0.7rem' : '0.8rem', fontWeight: 600, py: isMobileView ? 1 : 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: isMobileView ? 4 : 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <AlertCircle size={isMobileView ? 24 : 32} color={alpha(TEXT_COLOR, 0.2)} />
                        <Typography variant="body2" sx={{ color: TEXT_COLOR, opacity: 0.6, fontSize: isMobileView ? '0.8rem' : '0.85rem', fontWeight: 500 }}>
                          {searchTerm ? 'No repairs match your search' : 'No repairs in this stage'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map(item => {
                    if (!item) return null;
                    const isSelected = selectedRepairs[stage.id].has(item.id);
                    const address = parseDashboardAddress(item.address);
                    return (
                      <TableRow key={item.id} hover sx={{ bgcolor: isSelected ? alpha(stage.color, 0.1) : 'white', '&:hover': { backgroundColor: alpha(stage.color, 0.05) }, '&:last-child td': { borderBottom: 'none' } }}>
                        <TableCell padding="checkbox" sx={{ pl: isMobileView ? 1.5 : 2.5, py: isMobileView ? 1 : 1.5 }}>
                          <Checkbox checked={isSelected} onChange={() => handleToggleSelection(stage.id, item.id)} size="small" sx={{ color: TEXT_COLOR, padding: isMobileView ? '2px' : '4px' }} />
                        </TableCell>
                        <TableCell sx={{ py: isMobileView ? 1 : 1.5 }}>
                          <Typography variant="body2" sx={{ color: TEXT_COLOR, fontSize: isMobileView ? '0.75rem' : '0.85rem', fontWeight: 500, mb: 0.25 }}>{item.name}</Typography>
                          <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>
                            {!isMobileView && 'Created: '}{item.createdDate ? formatDateShort(item.createdDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: isMobileView ? 1 : 1.5 }}>
                          <Typography variant="body2" sx={{ color: TEXT_COLOR, fontSize: isMobileView ? '0.75rem' : '0.85rem', mb: 0.25 }}>{address.street}</Typography>
                          <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: isMobileView ? '0.65rem' : '0.75rem' }}>
                            {[address.city, address.state, address.zip].filter(Boolean).join(', ')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: isMobileView ? 1 : 1.5 }}>{renderStatusDetails(item, stage)}</TableCell>
                        <TableCell sx={{ py: isMobileView ? 1 : 1.5 }}>
                          <Stack direction="row" spacing={isMobileView ? 0.25 : 0.5}>
                            <Tooltip title="View Details"><IconButton size="small" onClick={() => handleOpenDetails(item)} sx={{ color: BLUE_COLOR, '&:hover': { backgroundColor: alpha(BLUE_COLOR, 0.1) }, p: isMobileView ? 0.5 : 0.75 }}><Info size={isMobileView ? 14 : 16} /></IconButton></Tooltip>
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenEdit(item)} sx={{ color: GREEN_COLOR, '&:hover': { backgroundColor: alpha(GREEN_COLOR, 0.1) }, p: isMobileView ? 0.5 : 0.75 }}><Edit size={isMobileView ? 14 : 16} /></IconButton></Tooltip>
                            <Tooltip title="Move to Recycle Bin"><IconButton size="small" onClick={() => handleSingleSoftDeleteClick(item.id, item.workOrderNumber, item.name)} sx={{ color: RED_COLOR, '&:hover': { backgroundColor: alpha(RED_COLOR, 0.1) }, p: isMobileView ? 0.5 : 0.75 }}><Trash2 size={isMobileView ? 14 : 16} /></IconButton></Tooltip>
                            {stage.id !== 'completed' && <Tooltip title="Move Forward"><IconButton size="small" onClick={() => handleMoveStage(item.id, 'forward')} sx={{ color: stage.color, '&:hover': { backgroundColor: alpha(stage.color, 0.1) }, p: isMobileView ? 0.5 : 0.75 }}><ArrowForward sx={{ fontSize: isMobileView ? 14 : 16 }} /></IconButton></Tooltip>}
                            {stage.id !== 'creation' && <Tooltip title="Move Back"><IconButton size="small" onClick={() => handleMoveStage(item.id, 'backward')} sx={{ color: GRAY_COLOR, '&:hover': { backgroundColor: alpha(GRAY_COLOR, 0.1) }, p: isMobileView ? 0.5 : 0.75 }}><ArrowBack sx={{ fontSize: isMobileView ? 14 : 16 }} /></IconButton></Tooltip>}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        {items.length > 0 && (
          <TablePagination
            rowsPerPageOptions={isMobileView ? [5, 10] : [5, 10, 25]}
            component="div"
            count={items.length}
            rowsPerPage={rowsPerPage[stage.id]}
            page={page[stage.id]}
            SelectProps={{
              MenuProps: {
                disableScrollLock: true
              }
            }}
            onPageChange={(event, newPage) => handleChangePage(stage.id, newPage)}
            onRowsPerPageChange={(event) => handleChangeRowsPerPage(stage.id, event)}
            sx={{ borderTop: `1px solid ${alpha(stage.color, 0.1)}`, '& .MuiTablePagination-toolbar': { minHeight: isMobileView ? '48px' : '52px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: isMobileView ? '0.7rem' : '0.8rem', color: TEXT_COLOR } }}
          />
        )}
      </Paper>
    );
  };

  return (
    <Box>
      <Helmet>
        <title>Tank Repairs | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Manage tank repair process and tracking" />
      </Helmet>

      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', mb: isMobile ? 2 : 3, gap: isMobile ? 2 : 0 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: isMobile ? '0.95rem' : '1rem', color: TEXT_COLOR, letterSpacing: '-0.01em' }}>Tank Repair</Typography>
          <Typography variant="body2" sx={{ color: GRAY_COLOR, fontSize: isMobile ? '0.8rem' : '0.85rem', fontWeight: 400 }}>Track and manage tank repairs through each stage of the process</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 2, width: isMobile ? '100%' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <Button variant="outlined" startIcon={<History size={isMobile ? 14 : 16} />} onClick={handleOpenRecycleBin} fullWidth={isMobile}
            sx={{ textTransform: 'none', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 500, color: PURPLE_COLOR, borderColor: alpha(PURPLE_COLOR, 0.3), minWidth: isMobile ? '48%' : 'auto', '&:hover': { borderColor: PURPLE_COLOR, backgroundColor: alpha(PURPLE_COLOR, 0.05) } }}>
            Recycle Bin ({deletedRepairs.length})
          </Button>
          <GradientButton variant="contained" startIcon={<Add sx={{ fontSize: isMobile ? 14 : 16 }} />} onClick={handleOpenNewRepair} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 500, px: isMobile ? 1 : 2, minWidth: isMobile ? '48%' : 'auto' }}>
            New Repair Job
          </GradientButton>
        </Box>
      </Box>

      {renderTopDashboard()}

      {/* Filter bar */}
      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: isMobile ? 2 : 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: isMobile ? 'stretch' : 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 1 : 2 }}>
          <Typography variant="body2" sx={{ color: GRAY_COLOR, fontSize: isMobile ? '0.75rem' : '0.85rem' }}>Filter by stage:</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip label="All" size="small" variant={filterStage === 'all' ? 'filled' : 'outlined'} onClick={() => setFilterStage('all')} sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: isMobile ? '24px' : '28px' }} />
            {REPAIR_STAGES.map(stage => (
              <Chip key={stage.id} label={stage.name} size="small" variant={filterStage === stage.id ? 'filled' : 'outlined'} onClick={() => setFilterStage(stage.id)}
                sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: isMobile ? '24px' : '28px', borderColor: stage.color, color: filterStage === stage.id ? 'white' : stage.color, backgroundColor: filterStage === stage.id ? stage.color : 'transparent' }} />
            ))}
          </Box>
        </Box>
        <Box sx={{ flex: 1 }} />
        <StyledTextField size="small" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ width: isMobile ? '100%' : 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search size={isMobile ? 14 : 16} color={GRAY_COLOR} /></InputAdornment>,
            endAdornment: searchTerm && <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')} edge="end" sx={{ p: 0.5 }}><X size={isMobile ? 14 : 16} /></IconButton></InputAdornment>,
          }}
          helperText={searchTerm ? `Searching across all fields...` : ''}
          FormHelperTextProps={{ sx: { fontSize: isMobile ? '0.65rem' : '0.7rem', mt: 0.5 } }}
        />
      </Paper>

      {filterStage === 'all' ? REPAIR_STAGES.map(stage => renderStageCard(stage)) : renderStageCard(REPAIR_STAGES.find(s => s.id === filterStage))}

      {/* Move to Recycle Bin — single */}
      <CommonDialog
        open={deleteConfirmationOpen}
        onClose={() => setDeleteConfirmationOpen(false)}
        onConfirm={confirmSingleSoftDelete}
        title="Move to Recycle Bin"
        variant="warning"
        confirmText="Move to Recycle Bin"
        icon={<Trash2 size={18} />}
      >
        <Typography variant="body2" sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem', color: TEXT_COLOR, lineHeight: 1.6 }}>
          {deleteTarget.type === 'single' && deleteTarget.customerName
            ? `Are you sure you want to move repair for "${deleteTarget.customerName}" to the Recycle Bin?`
            : "Are you sure you want to move this repair to the Recycle Bin?"}
        </Typography>
        <Box sx={{ mt: 2, p: 2, bgcolor: alpha(ORANGE_COLOR, 0.05), borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem', color: ORANGE_COLOR, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Info size={14} />
            Note: Items moved to Recycle Bin can be restored later
          </Typography>
        </Box>
      </CommonDialog>

      {/* Move to Recycle Bin — bulk */}
      <CommonDialog
        open={bulkDeleteConfirmationOpen}
        onClose={() => setBulkDeleteConfirmationOpen(false)}
        onConfirm={confirmBulkSoftDelete}
        title="Move Multiple Items to Recycle Bin"
        variant="warning"
        confirmText={`Move ${deleteTarget.count} Items to Recycle Bin`}
        icon={<Trash2 size={18} />}
      >
        <Typography variant="body2" sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem', color: TEXT_COLOR, lineHeight: 1.6 }}>
          Are you sure you want to move {deleteTarget.count} selected repair(s) to the Recycle Bin?
        </Typography>
        <Box sx={{ mt: 2, p: 2, bgcolor: alpha(ORANGE_COLOR, 0.05), borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem', color: ORANGE_COLOR, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Info size={14} />
            Note: Items moved to Recycle Bin can be restored later
          </Typography>
        </Box>
      </CommonDialog>

      {/* Details dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: isMobile ? { margin: 0, maxHeight: '100%', borderRadius: 0 } : {} }}>
        {selectedRepair && (
          <>
            <DialogTitle sx={{ pb: 1, px: isMobile ? 2 : 3 }}>
              <Typography variant="h6" sx={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 600, color: TEXT_COLOR }}>{selectedRepair.name}</Typography>
              <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>{selectedRepair.stageName}</Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ px: isMobile ? 2 : 3 }}>
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem', fontWeight: 600 }}>Address</Typography>
                  <Typography variant="body2" sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{selectedRepair.address}</Typography>
                </Grid>
                <Grid item xs={12}><Divider /></Grid>
                {selectedRepair.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem', fontWeight: 600 }}>Notes</Typography>
                    <Paper variant="outlined" sx={{ p: isMobile ? 1.5 : 2, bgcolor: 'background.default' }}>
                      <Typography variant="body2" sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>{selectedRepair.notes}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: isMobile ? 2 : 3, py: 2, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 0 }}>
              <OutlineButton onClick={() => setDetailsDialogOpen(false)} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Close</OutlineButton>
              <OutlineButton variant="outlined" color="error" onClick={() => { setDetailsDialogOpen(false); handleSingleSoftDeleteClick(selectedRepair.id, selectedRepair.workOrderNumber, selectedRepair.name); }} startIcon={<Trash2 size={16} />} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem', ml: isMobile ? 0 : 1 }}>
                Move to Recycle Bin
              </OutlineButton>
              <UpdateButton variant="contained" onClick={() => { setDetailsDialogOpen(false); handleOpenEdit(selectedRepair); }} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem', ml: isMobile ? 0 : 1 }}>Edit</UpdateButton>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: isMobile ? { margin: 0, maxHeight: '100%', borderRadius: 0 } : {} }}>
        {selectedRepair && (
          <>
            <DialogTitle sx={{ pb: 1, px: isMobile ? 2 : 3 }}>
              <Typography variant="h6" sx={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 600, color: TEXT_COLOR }}>Edit Repair - {selectedRepair.name}</Typography>
              <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>Current Stage: {selectedRepair.stageName}</Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ px: isMobile ? 2 : 3 }}>
              {renderStageContent(activeStep, 'edit')}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: isMobile ? 2 : 3, py: 2, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 0 }}>
              <Box sx={{ width: isMobile ? '100%' : 'auto' }}>
                {activeStep > 0 && <OutlineButton onClick={() => setActiveStep(prev => prev - 1)} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Previous</OutlineButton>}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                <OutlineButton onClick={() => setEditDialogOpen(false)} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Cancel</OutlineButton>
                {activeStep < REPAIR_STAGES.length - 1
                  ? <GradientButton variant="contained" onClick={() => setActiveStep(prev => prev + 1)} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Next Stage</GradientButton>
                  : <UpdateButton variant="contained" onClick={handleSaveRepair} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Save Changes</UpdateButton>}
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* New repair dialog */}
      <Dialog open={newRepairDialogOpen} onClose={() => setNewRepairDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile} PaperProps={{ sx: isMobile ? { margin: 0, maxHeight: '100%', borderRadius: 0 } : {} }}>
        <>
          <DialogTitle sx={{ pb: 1, px: isMobile ? 2 : 3 }}>
            <Typography variant="h6" sx={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 600, color: TEXT_COLOR }}>Create New Tank Repair Job</Typography>
          </DialogTitle>
          <DialogContent dividers sx={{ px: isMobile ? 2 : 3 }}>
            {activeStep === 0 ? (
              <Stack spacing={2}>
                <TextField fullWidth label="Customer Name" value={newRepair.name} onChange={(e) => setNewRepair({ ...newRepair, name: e.target.value })} size="small" required InputLabelProps={{ sx: { fontSize: isMobile ? '0.8rem' : '0.85rem' } }} InputProps={{ sx: { fontSize: isMobile ? '0.8rem' : '0.85rem' } }} />
                <TextField fullWidth label="Address" multiline rows={isMobile ? 3 : 2} value={newRepair.address} onChange={(e) => setNewRepair({ ...newRepair, address: e.target.value })} size="small" placeholder="Street Address - City, State ZIP" required InputLabelProps={{ sx: { fontSize: isMobile ? '0.8rem' : '0.85rem' } }} InputProps={{ sx: { fontSize: isMobile ? '0.8rem' : '0.85rem' } }} />
              </Stack>
            ) : (
              renderStageContent(activeStep - 1, 'new')
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: isMobile ? 2 : 3, py: 2, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 0 }}>
            <Box sx={{ width: isMobile ? '100%' : 'auto' }}>
              {activeStep > 0 && <OutlineButton onClick={() => setActiveStep(prev => prev - 1)} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Previous</OutlineButton>}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
              <OutlineButton onClick={() => setNewRepairDialogOpen(false)} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Cancel</OutlineButton>
              {activeStep < 2
                ? <GradientButton variant="contained" onClick={() => setActiveStep(prev => prev + 1)} disabled={activeStep === 0 && (!newRepair.name || !newRepair.address)} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Next</GradientButton>
                : <UpdateButton variant="contained" onClick={handleAddNewRepair} fullWidth={isMobile} sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}>Create Repair Job</UpdateButton>}
            </Box>
          </DialogActions>
        </>
      </Dialog>

      {/* As-built requirements modal */}
      <Modal open={asBuiltModalOpen} onClose={() => setAsBuiltModalOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: isMobile ? 1 : 2 }}>
        <Paper sx={{ width: '90%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto', p: isMobile ? 2 : 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', fontSize: isMobile ? '0.9rem' : '0.95rem' }}>
              <ClipboardCheck size={isMobile ? 18 : 20} style={{ marginRight: 2, verticalAlign: 'middle' }} />
              As-Built Requirements
            </Typography>
            <IconButton onClick={() => setAsBuiltModalOpen(false)} size="small"><X size={isMobile ? 18 : 20} /></IconButton>
          </Box>
          <List dense sx={{ py: 0 }}>
            {AS_BUILT_REQUIREMENTS.map((requirement, index) => (
              <ListItem key={index} sx={{ py: 0.5, px: isMobile ? 0 : 2 }}>
                <ListItemIcon sx={{ minWidth: isMobile ? 28 : 36 }}><Square size={isMobile ? 14 : 16} color={GRAY_COLOR} /></ListItemIcon>
                <ListItemText primary={requirement} primaryTypographyProps={{ variant: 'body2', sx: { fontSize: isMobile ? '0.8rem' : '0.85rem' } }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Modal>

      {/* Recycle Bin modal */}
      <RecycleBinModal
        open={recycleBinModalOpen}
        onClose={() => setRecycleBinModalOpen(false)}
        recycleBinItems={deletedRepairs}
        isRecycleBinLoading={isRecycleBinLoading}
        recycleBinSearch={recycleBinSearch}
        setRecycleBinSearch={setRecycleBinSearch}
        recycleBinPage={recycleBinPage}
        recycleBinRowsPerPage={recycleBinRowsPerPage}
        handleChangeRecycleBinPage={(event, newPage) => setRecycleBinPage(newPage)}
        handleChangeRecycleBinRowsPerPage={(event) => { setRecycleBinRowsPerPage(parseInt(event.target.value, 10)); setRecycleBinPage(0); }}
        selectedRecycleBinItems={selectedRecycleBinItems}
        toggleRecycleBinSelection={toggleRecycleBinSelection}
        toggleAllRecycleBinSelection={toggleAllRecycleBinSelection}
        confirmBulkRestore={confirmBulkRestore}
        confirmBulkPermanentDelete={confirmBulkPermanentDelete}
        handleSingleRestore={handleSingleRestore}
        handleSinglePermanentDelete={handleSinglePermanentDelete}
        formatDateShort={formatDateShort}
      />
    </Box>
  );
};

export default Repairs;