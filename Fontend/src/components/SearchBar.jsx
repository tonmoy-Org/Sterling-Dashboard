import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { styled, alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Fade from '@mui/material/Fade';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
    Search,
    X,
    Home,
    User,
    Users,
    Car,
    Wrench,
    Calendar,
    Map,
    FileText,
    BarChart,
    Briefcase,
    Shield,
    ClipboardCheck,
    BookOpen,
    Truck,
    PenToolIcon,
    BellIcon,
    Camera,
    Clock,
    TrendingUp,
    Zap,
} from 'lucide-react';
import useMediaQuery from '@mui/material/useMediaQuery';

// Color system with better organization
const colors = {
    // Primary colors
    primary: '#3182ce',
    primaryLight: '#ebf8ff',
    primaryDark: '#2c5282',
    
    // UI Colors
    activeBg: '#ebf8ff',
    activeText: '#3182ce',
    activeBorder: '#3182ce',
    drawerBg: '#ffffff',
    hoverBg: '#f7fafc',
    
    // Text Colors
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    textTertiary: '#a0aec0',
    
    // Border Colors
    borderLight: '#e2e8f0',
    borderMedium: '#cbd5e0',
    
    // Background Colors
    white: '#ffffff',
    black: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    
    // Functional Colors
    sidebarHover: '#f1f5f9',
    sidebarActive: '#e6f7ff',
    
    // Status Colors
    blue: '#1976d2',
    green: '#10b981',
    red: '#ef4444',
    orange: '#ed6c02',
    yellow: '#f59e0b',
    gray: '#6b7280',
    purple: '#8b5cf6',
    indigo: '#4f46e5',
};

// Styled components with better mobile handling
const SearchContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isMobile',
})(({ theme, isMobile }) => ({
    display: 'flex',
    alignItems: 'center',
    backgroundColor: alpha('#ffffff', 0.1),
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    borderRadius: '8px',
    padding: '4px 12px',
    transition: 'all 0.2s ease',
    position: 'relative',
    width: '100%',
    
    '&:hover': {
        borderColor: alpha(colors.primary, 0.5),
        backgroundColor: alpha('#ffffff', 0.15),
    },
    
    '&:focus-within': {
        borderColor: colors.primary,
        backgroundColor: alpha('#ffffff', 0.15),
        boxShadow: `0 0 0 2px ${alpha(colors.primary, 0.1)}`,
    },
    
    ...(isMobile && {
        backgroundColor: colors.white,
        borderColor: colors.borderLight,
        '&:hover, &:focus-within': {
            backgroundColor: colors.white,
            borderColor: colors.primary,
        },
    }),
}));

const SearchInput = styled(InputBase)(({ theme }) => ({
    color: colors.textPrimary,
    fontSize: '0.875rem',
    width: '100%',
    
    '& .MuiInputBase-input': {
        padding: '8px 0 8px 8px',
        fontSize: '0.875rem',
        '&::placeholder': {
            color: alpha(colors.textPrimary, 0.7),
            opacity: 1,
            fontSize: '0.875rem',
        },
    },
}));

const SearchResultsDropdown = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    maxHeight: 'min(400px, 70vh)',
    overflowY: 'auto',
    zIndex: theme.zIndex.appBar + 5,
    display: 'none',
    
    '&.visible': {
        display: 'block',
        animation: 'slideIn 0.2s ease-out',
    },
    
    '@keyframes slideIn': {
        from: {
            opacity: 0,
            transform: 'translateY(-8px)',
        },
        to: {
            opacity: 1,
            transform: 'translateY(0)',
        },
    },
    
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-track': {
        background: colors.sidebarHover,
        borderRadius: '3px',
    },
    '&::-webkit-scrollbar-thumb': {
        background: colors.borderMedium,
        borderRadius: '3px',
        '&:hover': {
            background: colors.textTertiary,
        },
    },
}));

const MobileSearchOverlay = styled(Box)(({ theme }) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backdrop,
    zIndex: theme.zIndex.appBar + 2,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.2s ease-out',
    
    '@keyframes fadeIn': {
        from: { opacity: 0 },
        to: { opacity: 1 },
    },
}));

const MobileSearchContainer = styled(Box)(({ theme }) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: theme.zIndex.appBar + 3,
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.borderLight}`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    animation: 'slideDown 0.25s ease-out',
    
    '@keyframes slideDown': {
        from: {
            transform: 'translateY(-100%)',
            opacity: 0,
        },
        to: {
            transform: 'translateY(0)',
            opacity: 1,
        },
    },
}));

// Updated routes with better categorization
const ROUTES_BY_ROLE = {
    'superadmin': [
        { path: '/super-admin-dashboard', name: 'Dashboard', icon: <Home size={16} />, category: 'dashboard' },
        { path: '/super-admin-dashboard/profile', name: 'Profile', icon: <User size={16} />, category: 'profile' },
        { path: '/super-admin-dashboard/users', name: 'User Management', icon: <Users size={16} />, category: 'management' },
        { path: '/super-admin-dashboard/all-technicians', name: 'All Technicians', icon: <Users size={16} />, category: 'management' },
        { path: '/super-admin-dashboard/overview', name: 'Overview', icon: <BarChart size={16} />, category: 'dashboard' },
        { path: '/super-admin-dashboard/dispatch', name: 'Dispatch', icon: <Wrench size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/logistics-map', name: 'Logistics Map', icon: <Map size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/installations', name: 'Installations', icon: <PenToolIcon size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/repairs', name: 'Repairs', icon: <Wrench size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/scheduling', name: 'Scheduling', icon: <Calendar size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/performance', name: 'Performance', icon: <BarChart size={16} />, category: 'reports' },
        { path: '/super-admin-dashboard/quotes', name: 'Quotes', icon: <FileText size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/leads', name: 'Leads', icon: <Briefcase size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/vehicles-tools', name: 'Vehicles & Tools', icon: <Car size={16} />, category: 'vehicles' },
        { path: '/super-admin-dashboard/inventory', name: 'Inventory', icon: <Box component="span" />, category: 'vehicles' },
        { path: '/super-admin-dashboard/risk-management', name: 'Risk Management', icon: <Shield size={16} />, category: 'management' },
        { path: '/super-admin-dashboard/scorecards', name: 'Scorecards', icon: <ClipboardCheck size={16} />, category: 'reports' },
        { path: '/super-admin-dashboard/forms', name: 'Forms', icon: <FileText size={16} />, category: 'resources' },
        { path: '/super-admin-dashboard/review-forms', name: 'Review Forms', icon: <FileText size={16} />, category: 'resources' },
        { path: '/super-admin-dashboard/approvals', name: 'Approvals', icon: <Shield size={16} />, category: 'management' },
        { path: '/super-admin-dashboard/training', name: 'Training', icon: <BookOpen size={16} />, category: 'resources' },
        { path: '/super-admin-dashboard/tasks', name: 'Tasks', icon: <ClipboardCheck size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/library', name: 'Library', icon: <BookOpen size={16} />, category: 'resources' },
        { path: '/super-admin-dashboard/health-department-report-tracking/rme', name: 'RME Reports', icon: <FileText size={16} />, category: 'reports' },
        { path: '/super-admin-dashboard/health-department-report-tracking/rss', name: 'RSS Reports', icon: <FileText size={16} />, category: 'reports' },
        { path: '/super-admin-dashboard/health-department-report-tracking/tos', name: 'TOS Reports', icon: <FileText size={16} />, category: 'reports' },
        { path: '/super-admin-dashboard/locates', name: 'Locates', icon: <Map size={16} />, category: 'operations' },
        { path: '/super-admin-dashboard/notifications', name: 'Notifications', icon: <BellIcon size={16} />, category: 'other' },
    ],
    'manager': [
        { path: '/manager-dashboard', name: 'Dashboard', icon: <Home size={16} />, category: 'dashboard' },
        { path: '/manager-dashboard/profile', name: 'Profile', icon: <User size={16} />, category: 'profile' },
        { path: '/manager-dashboard/all-technicians', name: 'All Technicians', icon: <Users size={16} />, category: 'management' },
        { path: '/manager-dashboard/locates', name: 'Locates', icon: <Map size={16} />, category: 'operations' },
        { path: '/manager-dashboard/overview', name: 'Overview', icon: <BarChart size={16} />, category: 'dashboard' },
        { path: '/manager-dashboard/dispatch', name: 'Dispatch', icon: <Wrench size={16} />, category: 'operations' },
        { path: '/manager-dashboard/logistics-map', name: 'Logistics Map', icon: <Map size={16} />, category: 'operations' },
        { path: '/manager-dashboard/installations', name: 'Installations', icon: <PenToolIcon size={16} />, category: 'operations' },
        { path: '/manager-dashboard/repairs', name: 'Repairs', icon: <Wrench size={16} />, category: 'operations' },
        { path: '/manager-dashboard/scheduling', name: 'Scheduling', icon: <Calendar size={16} />, category: 'operations' },
        { path: '/manager-dashboard/performance', name: 'Performance', icon: <BarChart size={16} />, category: 'reports' },
        { path: '/manager-dashboard/quotes', name: 'Quotes', icon: <FileText size={16} />, category: 'operations' },
        { path: '/manager-dashboard/leads', name: 'Leads', icon: <Briefcase size={16} />, category: 'operations' },
        { path: '/manager-dashboard/vehicles-tools', name: 'Vehicles & Tools', icon: <Car size={16} />, category: 'vehicles' },
        { path: '/manager-dashboard/inventory', name: 'Inventory', icon: <Box component="span" />, category: 'vehicles' },
        { path: '/manager-dashboard/risk-management', name: 'Risk Management', icon: <Shield size={16} />, category: 'management' },
        { path: '/manager-dashboard/scorecards', name: 'Scorecards', icon: <ClipboardCheck size={16} />, category: 'reports' },
        { path: '/manager-dashboard/forms', name: 'Forms', icon: <FileText size={16} />, category: 'resources' },
        { path: '/manager-dashboard/review-forms', name: 'Review Forms', icon: <FileText size={16} />, category: 'resources' },
        { path: '/manager-dashboard/approvals', name: 'Approvals', icon: <Shield size={16} />, category: 'management' },
        { path: '/manager-dashboard/training', name: 'Training', icon: <BookOpen size={16} />, category: 'resources' },
        { path: '/manager-dashboard/tasks', name: 'Tasks', icon: <ClipboardCheck size={16} />, category: 'operations' },
        { path: '/manager-dashboard/library', name: 'Library', icon: <BookOpen size={16} />, category: 'resources' },
        { path: '/manager-dashboard/health-department-report-tracking/rme', name: 'RME Reports', icon: <FileText size={16} />, category: 'reports' },
        { path: '/manager-dashboard/health-department-report-tracking/rss', name: 'RSS Reports', icon: <FileText size={16} />, category: 'reports' },
        { path: '/manager-dashboard/health-department-report-tracking/tos', name: 'TOS Reports', icon: <FileText size={16} />, category: 'reports' },
        { path: '/manager-dashboard/notifications', name: 'Notifications', icon: <BellIcon size={16} />, category: 'other' },
    ],
    'tech': [
        { path: '/tech-dashboard', name: 'Dashboard', icon: <Home size={16} />, category: 'dashboard' },
        { path: '/tech-dashboard/profile', name: 'Profile', icon: <User size={16} />, category: 'profile' },
        { path: '/tech-dashboard/my-scorecard', name: 'My Scorecard', icon: <ClipboardCheck size={16} />, category: 'reports' },
        { path: '/tech-dashboard/reports/rme', name: 'RME Reports', icon: <FileText size={16} />, category: 'reports' },
        { path: '/tech-dashboard/vehicles/trucks', name: 'Trucks', icon: <Truck size={16} />, category: 'vehicles' },
        { path: '/tech-dashboard/vehicles/list', name: 'Vehicles List', icon: <Car size={16} />, category: 'vehicles' },
        { path: '/tech-dashboard/vehicles/photos', name: 'Vehicle Photos', icon: <Camera size={16} />, category: 'vehicles' },
        { path: '/tech-dashboard/vehicles/inventory', name: 'Vehicle Inventory', icon: <Box component="span" />, category: 'vehicles' },
        { path: '/tech-dashboard/team/daily-checklist', name: 'Daily Checklist', icon: <ClipboardCheck size={16} />, category: 'operations' },
        { path: '/tech-dashboard/resources/library', name: 'Library', icon: <BookOpen size={16} />, category: 'resources' },
        { path: '/tech-dashboard/notifications', name: 'Notifications', icon: <BellIcon size={16} />, category: 'other' },
    ]
};

// Category configuration with improved organization
const CATEGORY_CONFIG = {
    dashboard: { title: 'Dashboard & Overview', icon: <Home size={12} />, color: colors.blue, priority: 1 },
    profile: { title: 'Profile', icon: <User size={12} />, color: colors.green, priority: 2 },
    operations: { title: 'Operations', icon: <Wrench size={12} />, color: colors.orange, priority: 3 },
    reports: { title: 'Reports & Analytics', icon: <BarChart size={12} />, color: colors.green, priority: 4 },
    management: { title: 'Management', icon: <Users size={12} />, color: colors.purple, priority: 5 },
    resources: { title: 'Resources', icon: <BookOpen size={12} />, color: colors.indigo, priority: 6 },
    vehicles: { title: 'Vehicles & Tools', icon: <Car size={12} />, color: colors.gray, priority: 7 },
    other: { title: 'Other', icon: <BellIcon size={12} />, color: colors.gray, priority: 8 },
};

const SearchBar = React.memo(({
    mobileSearchOpen,
    onMobileSearchToggle,
    onMobileSearchClose,
    searchValue = '',
    onSearchChange,
    placeholder = "Search pages..."
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [showResults, setShowResults] = useState(false);
    const [inputValue, setInputValue] = useState(searchValue);
    const [frequentSearches, setFrequentSearches] = useState(() => {
        const saved = localStorage.getItem(`frequentSearches_${user?.id}`);
        return saved ? JSON.parse(saved) : [];
    });
    
    const searchContainerRef = useRef(null);
    const mobileInputRef = useRef(null);
    const desktopInputRef = useRef(null);

    // Memoize available routes based on user role
    const availableRoutes = useMemo(() => {
        if (!user?.role) return [];
        const role = user.role.toLowerCase();
        return ROUTES_BY_ROLE[role] || [];
    }, [user?.role]);

    // Filter routes with debouncing built-in
    const filterRoutes = useCallback((searchTerm) => {
        if (!searchTerm.trim()) {
            return [];
        }

        const term = searchTerm.toLowerCase().trim();
        return availableRoutes.filter(route =>
            route.name.toLowerCase().includes(term) ||
            route.path.toLowerCase().includes(term) ||
            route.category.toLowerCase().includes(term)
        );
    }, [availableRoutes]);

    // Memoize filtered routes
    const filteredRoutes = useMemo(() => 
        filterRoutes(inputValue), 
        [inputValue, filterRoutes]
    );

    // Memoize grouped routes with better organization
    const groupedRoutes = useMemo(() => {
        const categories = {};
        const routesToGroup = inputValue.trim() ? filteredRoutes : [];
        
        routesToGroup.forEach(route => {
            if (!categories[route.category]) {
                categories[route.category] = [];
            }
            categories[route.category].push(route);
        });

        // Sort categories by priority
        return Object.keys(categories)
            .map(cat => ({
                ...CATEGORY_CONFIG[cat],
                routes: categories[cat]
            }))
            .sort((a, b) => a.priority - b.priority);
    }, [filteredRoutes, inputValue]);

    // Update frequent searches
    const updateFrequentSearches = useCallback((route) => {
        if (!user?.id) return;
        
        const newFrequentSearches = [...frequentSearches];
        const existingIndex = newFrequentSearches.findIndex(item => item.path === route.path);
        
        if (existingIndex > -1) {
            newFrequentSearches[existingIndex] = {
                ...newFrequentSearches[existingIndex],
                count: newFrequentSearches[existingIndex].count + 1,
                lastAccessed: Date.now()
            };
        } else {
            newFrequentSearches.push({
                ...route,
                count: 1,
                lastAccessed: Date.now()
            });
        }

        const sorted = newFrequentSearches
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return b.lastAccessed - a.lastAccessed;
            })
            .slice(0, 5);

        setFrequentSearches(sorted);
        localStorage.setItem(`frequentSearches_${user.id}`, JSON.stringify(sorted));
    }, [frequentSearches, user?.id]);

    // Handle search input change
    const handleSearchChange = useCallback((event) => {
        const value = event.target.value;
        setInputValue(value);
        onSearchChange?.(value);
        setShowResults(true);
    }, [onSearchChange]);

    // Handle route selection
    const handleRouteSelect = useCallback((route) => {
        updateFrequentSearches(route);
        navigate(route.path);
        setInputValue('');
        setShowResults(false);
        onMobileSearchClose();
    }, [navigate, onMobileSearchClose, updateFrequentSearches]);

    // Handle mobile search toggle
    const handleMobileSearchToggle = useCallback(() => {
        onMobileSearchToggle();
        if (!mobileSearchOpen) {
            setTimeout(() => {
                mobileInputRef.current?.focus();
            }, 50);
        }
    }, [mobileSearchOpen, onMobileSearchToggle]);

    // Handle mobile search close
    const handleMobileSearchClose = useCallback(() => {
        setInputValue('');
        setShowResults(false);
        onMobileSearchClose();
    }, [onMobileSearchClose]);

    // Clear search
    const handleClearSearch = useCallback(() => {
        setInputValue('');
        setShowResults(false);
        onSearchChange?.('');
        if (isMobile) {
            mobileInputRef.current?.focus();
        } else {
            desktopInputRef.current?.focus();
        }
    }, [isMobile, onSearchChange]);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showResults && 
                searchContainerRef.current && 
                !searchContainerRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showResults]);

    // Focus input when mobile search opens
    useEffect(() => {
        if (mobileSearchOpen && mobileInputRef.current) {
            setTimeout(() => {
                mobileInputRef.current?.focus();
            }, 100);
        }
    }, [mobileSearchOpen]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl+K or Cmd+K to focus search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                if (isMobile) {
                    onMobileSearchToggle();
                } else {
                    desktopInputRef.current?.focus();
                    setShowResults(true);
                }
            }
            
            // Escape to close search
            if (event.key === 'Escape') {
                if (mobileSearchOpen) {
                    handleMobileSearchClose();
                } else if (showResults) {
                    setShowResults(false);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMobile, mobileSearchOpen, showResults, onMobileSearchToggle, handleMobileSearchClose]);

    // Render search results
    const renderSearchResults = useCallback((isMobileView = false) => {
        const hasSearchTerm = inputValue.trim().length > 0;
        const hasResults = filteredRoutes.length > 0;
        const showFrequent = !hasSearchTerm && frequentSearches.length > 0;

        return (
            <Fade in={showResults}>
                <SearchResultsDropdown 
                    className={showResults ? 'visible' : ''}
                    sx={isMobileView ? {
                        position: 'fixed',
                        top: '75px',
                        left: 0,
                        right: 0,
                        maxHeight: 'calc(100vh - 56px)',
                        borderRadius: '0 0 8px 8px',
                        borderTop: 'none',
                    } : {}}
                >
                    {/* Frequent Searches Section */}
                    {showFrequent && (
                        <Box sx={{ p: 2, pb: 1 }}>
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.5,
                                    color: colors.textTertiary,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    mb: 1
                                }}
                            >
                                <TrendingUp size={12} />
                                Frequently Visited
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {frequentSearches.map((route, index) => (
                                    <Chip
                                        key={index}
                                        label={route.name}
                                        size="small"
                                        onClick={() => handleRouteSelect(route)}
                                        sx={{
                                            fontSize: '0.75rem',
                                            height: '24px',
                                            backgroundColor: colors.hoverBg,
                                            '&:hover': {
                                                backgroundColor: colors.sidebarHover,
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Search Results */}
                    {hasSearchTerm && !hasResults ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center',
                                gap: 1 
                            }}>
                                <Search size={24} color={colors.textTertiary} />
                                <Typography variant="body2" color={colors.textSecondary}>
                                    No results found for "{inputValue}"
                                </Typography>
                                <Typography variant="caption" color={colors.textTertiary}>
                                    Try searching with different keywords
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        groupedRoutes.map((category, index) => (
                            <Box key={index} sx={{ py: 1 }}>
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.5,
                                        px: 2,
                                        py: 0.5,
                                        color: colors.textTertiary,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        backgroundColor: colors.hoverBg,
                                    }}
                                >
                                    <Box sx={{ color: category.color }}>
                                        {category.icon}
                                    </Box>
                                    {category.title}
                                    <Box sx={{ flex: 1 }} />
                                    <Typography variant="caption" color={colors.textSecondary}>
                                        {category.routes.length}
                                    </Typography>
                                </Typography>
                                <List dense disablePadding>
                                    {category.routes.map((route, routeIndex) => {
                                        const isFrequent = frequentSearches.some(item => item.path === route.path);
                                        return (
                                            <ListItem
                                                key={routeIndex}
                                                onClick={() => handleRouteSelect(route)}
                                                sx={{
                                                    px: 2,
                                                    py: 1,
                                                    minHeight: '40px',
                                                    cursor: 'pointer',
                                                    borderBottom: routeIndex < category.routes.length - 1 ? 
                                                        `1px solid ${colors.borderLight}` : 'none',
                                                    '&:hover': {
                                                        backgroundColor: colors.hoverBg,
                                                    },
                                                    '&:last-child': {
                                                        borderBottom: 'none',
                                                    },
                                                }}
                                            >
                                                <ListItemIcon sx={{ 
                                                    minWidth: '32px', 
                                                    color: colors.textSecondary 
                                                }}>
                                                    {route.icon}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: 1 
                                                        }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                {route.name}
                                                            </Typography>
                                                            {isFrequent && (
                                                                <TrendingUp size={10} color={colors.orange} />
                                                            )}
                                                        </Box>
                                                    }
                                                    secondary={route.path.replace(`/${user?.role?.toLowerCase()}-dashboard`, '')}
                                                    primaryTypographyProps={{ 
                                                        fontSize: '0.875rem', 
                                                        fontWeight: 500 
                                                    }}
                                                    secondaryTypographyProps={{ 
                                                        fontSize: '0.75rem',
                                                        color: colors.textSecondary
                                                    }}
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </Box>
                        ))
                    )}

                    {/* Quick Actions */}
                    <Box sx={{ 
                        p: 2, 
                        borderTop: `1px solid ${colors.borderLight}`,
                        backgroundColor: colors.hoverBg 
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                            <Chip
                                label="Clear search"
                                size="small"
                                variant="outlined"
                                onClick={handleClearSearch}
                                sx={{ fontSize: '0.75rem' }}
                            />
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <Typography variant="caption" color={colors.textTertiary}>
                                    Press
                                </Typography>
                                <Chip
                                    label="ESC"
                                    size="small"
                                    sx={{ 
                                        fontSize: '0.7rem',
                                        height: '20px',
                                        backgroundColor: colors.white,
                                        border: `1px solid ${colors.borderMedium}`
                                    }}
                                />
                                <Typography variant="caption" color={colors.textTertiary}>
                                    to close
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </SearchResultsDropdown>
            </Fade>
        );
    }, [showResults, inputValue, filteredRoutes, frequentSearches, groupedRoutes, user?.role, handleRouteSelect, handleClearSearch]);

    return (
        <>
            {/* Desktop Search (hidden on mobile) */}
            <Box 
                ref={searchContainerRef}
                sx={{ 
                    display: { xs: 'none', md: 'block' },
                    position: 'relative', 
                    width: { md: '280px', lg: '320px' } 
                }}
            >
                <SearchContainer>
                    <Search size={16} color={alpha(colors.textPrimary, 0.7)} />
                    <SearchInput
                        placeholder={placeholder}
                        inputProps={{ 
                            'aria-label': 'search',
                            ref: desktopInputRef
                        }}
                        value={inputValue}
                        onChange={handleSearchChange}
                        onFocus={() => setShowResults(true)}
                    />
                    {inputValue ? (
                        <IconButton
                            size="small"
                            onClick={handleClearSearch}
                            sx={{ p: 0.5, ml: 0.5 }}
                        >
                            <X size={14} />
                        </IconButton>
                    ) : (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            ml: 0.5 
                        }}>
                            <Chip
                                label="⌘K"
                                size="small"
                                sx={{ 
                                    fontSize: '0.7rem',
                                    height: '20px',
                                    backgroundColor: alpha(colors.primary, 0.1),
                                    color: colors.primary
                                }}
                            />
                        </Box>
                    )}
                </SearchContainer>

                {renderSearchResults()}
            </Box>

            {/* Mobile Search Button */}
            <IconButton
                onClick={handleMobileSearchToggle}
                sx={{
                    display: { xs: 'flex', md: 'none' },
                    color: colors.textPrimary,
                    backgroundColor: alpha('#ffffff', 0.1),
                    borderRadius: '8px',
                    border: `1px solid ${alpha('#ffffff', 0.3)}`,
                    width: 40,
                    height: 40,
                    '&:hover': {
                        backgroundColor: alpha('#ffffff', 0.2),
                        color: colors.primary,
                    },
                }}
            >
                <Search size={18} />
            </IconButton>

            {/* Mobile Search Overlay */}
            {mobileSearchOpen && (
                <>
                    <MobileSearchOverlay onClick={handleMobileSearchClose} />
                    
                    <MobileSearchContainer>
                        <Box sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}>
                            <Box 
                                ref={searchContainerRef} 
                                sx={{ 
                                    position: 'relative', 
                                    flex: 1 
                                }}
                            >
                                <SearchContainer isMobile>
                                    <Search size={18} color={colors.textSecondary} />
                                    <SearchInput
                                        placeholder="Search everything..."
                                        inputProps={{ 
                                            'aria-label': 'search',
                                            ref: mobileInputRef
                                        }}
                                        autoFocus
                                        value={inputValue}
                                        onChange={handleSearchChange}
                                        onFocus={() => setShowResults(true)}
                                    />
                                    {inputValue && (
                                        <IconButton
                                            size="small"
                                            onClick={handleClearSearch}
                                            sx={{ p: 0.5 }}
                                        >
                                            <X size={16} />
                                        </IconButton>
                                    )}
                                </SearchContainer>
                                {renderSearchResults(true)}
                            </Box>

                            <IconButton
                                onClick={handleMobileSearchClose}
                                sx={{
                                    color: colors.textPrimary,
                                    backgroundColor: colors.hoverBg,
                                    borderRadius: '8px',
                                    width: 40,
                                    height: 40,
                                    '&:hover': {
                                        backgroundColor: colors.borderLight,
                                    },
                                }}
                            >
                                <X size={18} />
                            </IconButton>
                        </Box>
                    </MobileSearchContainer>
                </>
            )}
        </>
    );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;