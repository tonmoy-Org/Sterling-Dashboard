import React from 'react';
import { styled, useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Tooltip from '@mui/material/Tooltip';
import { useAuth } from '../../auth/AuthProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import NotificationDrawer from '../Notification/NotificationDrawer';
import ProfileDialog from '../features/profile/ProfileDialog';
import NestedMenuItem from './NestedMenuItem';
import SearchBar from '../common/SearchBar'
import NotificationBadge from '../Notification/Notificationbadge';
import logo from '../../assets/logos/logo.png';
import miniLogo from '../../assets/logos/mini_logo.png';
import DashboardFooter from './DashboardFooter';

import {
  LogOut,
  User,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

const drawerWidth = 250;
const closedDrawerWidth = 60;
const mobileDrawerWidth = 280;
const notificationDrawerWidth = 450;

// Updated color variables
const colors = {
  primary: '#3182ce',
  primaryLight: '#ebf8ff',
  primaryDark: '#2c5282',
  activeBg: '#ebf8ff',
  activeText: '#3182ce',
  activeBorder: '#3182ce',
  drawerBg: '#ffffff',
  textPrimary: '#2d3748',
  textSecondary: '#718096',
  textTertiary: '#a0aec0',
  borderLight: '#e2e8f0',
  hoverBg: '#f7fafc',
  white: '#ffffff',
  black: '#000000',
  sidebarHover: '#f1f5f9',
  sidebarActive: '#e6f7ff',
  appBarBg: 'rgba(255, 255, 255, 0.1)',
  blue: '#1976d2',
  green: '#10b981',
  red: '#ef4444',
  orange: '#ed6c02',
  gray: '#6b7280',
  purple: '#8b5cf6',
};

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: colors.drawerBg,
  borderRight: `1px solid ${colors.borderLight}`,
  boxShadow: '1px 0 4px rgba(0,0,0,0.04)',
  zIndex: theme.zIndex.drawer,
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'transparent',
  },
  '&:hover::-webkit-scrollbar-thumb': {
    background: alpha(colors.gray, 0.3),
  },
  msOverflowStyle: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: 'transparent transparent',
  '&:hover': {
    scrollbarColor: `${alpha(colors.gray, 0.3)} transparent`,
  },
});

const closedMixin = (theme) => ({
  width: closedDrawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: colors.drawerBg,
  borderRight: `1px solid ${colors.borderLight}`,
  boxShadow: '1px 0 4px rgba(0,0,0,0.04)',
  zIndex: theme.zIndex.drawer,
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'transparent',
  },
  '&:hover::-webkit-scrollbar-thumb': {
    background: alpha(colors.gray, 0.3),
  },
  msOverflowStyle: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: 'transparent transparent',
  '&:hover': {
    scrollbarColor: `${alpha(colors.gray, 0.3)} transparent`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0, 0.5),
  minHeight: 52,
  flexShrink: 0,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  backgroundColor: colors.appBarBg,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  borderBottom: `1px solid ${alpha('#ffffff', 0.2)}`,
  color: colors.textPrimary,
  zIndex: theme.zIndex.drawer - 1,
  transition: theme.transitions.create(['width', 'margin', 'background-color'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
  }),
  paddingRight: '0px !important',
}));

const PermanentDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: theme.zIndex.drawer,
    ...(open
      ? {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
      }
      : {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
      }),
  })
);

const ScrollableBox = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarGutter: 'stable',
  '&::-webkit-scrollbar': {
    width: '5px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f5f9',
    borderRadius: '2px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#cbd5e0',
    borderRadius: '2px',
    '&:hover': {
      background: '#a0aec0',
    },
  },
  scrollbarWidth: 'thin',
  scrollbarColor: '#cbd5e0 #f1f5f9',
});

const MobileActionsContainer = styled(Box)(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
  [theme.breakpoints.down('md')]: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
  },
}));

const DesktopActionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  flex: 1,
  justifyContent: 'flex-end',
  maxWidth: '550px',
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

const BreadcrumbContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
}));

const MobilePageTitle = styled(Typography)(({ theme }) => ({
  display: 'none',
  [theme.breakpoints.down('sm')]: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: colors.textPrimary,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: '120px',
  },
}));

const DrawerCloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: 8,
  top: 8,
  zIndex: 1,
  width: 28,
  height: 28,
  backgroundColor: alpha(colors.primary, 0.1),
  color: colors.primary,
  '&:hover': {
    backgroundColor: alpha(colors.primary, 0.2),
  },
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  width: '100%',
  overflow: 'hidden',
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(1),
  paddingTop: theme.spacing(1.5),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(1),
    paddingTop: theme.spacing(2.5),
  },
  overflow: 'hidden',
}));

const ContentCard = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: colors.white,
  borderRadius: '6px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  border: `1px solid ${colors.borderLight}`,
  overflow: 'hidden',
}));

const ScrollableContent = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(1),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(2),
  },
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarGutter: 'stable',
  '&::-webkit-scrollbar': {
    width: '5px',
    height: '5px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f5f9',
    borderRadius: '2px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#cbd5e0',
    borderRadius: '2px',
    '&:hover': {
      background: '#a0aec0',
    },
  },
  scrollbarWidth: 'thin',
  scrollbarColor: '#cbd5e0 #f1f5f9',
}));

const generateBreadcrumb = (path) => {
  const pathParts = path.replace(/^\/+/, '').split('/').filter(Boolean);
  const ACRONYMS = new Set(['rme', ' dispatch-kpi']);
  const SPECIAL_CASES = {
    'rme': 'RME',
    'dispatch-kpi': 'Dispatch KPI',
  };

  const breadcrumbItems = pathParts.map((part, index) => {
    const decodedPart = decodeURIComponent(part);
    let displayName;

    if (SPECIAL_CASES[decodedPart.toLowerCase()]) {
      displayName = SPECIAL_CASES[decodedPart.toLowerCase()];
    }
    else if (/^[A-Z]+$/.test(decodedPart) || ACRONYMS.has(decodedPart.toLowerCase())) {
      displayName = decodedPart.toUpperCase();
    }
    else if (ACRONYMS.has(decodedPart.toLowerCase())) {
      displayName = decodedPart.toUpperCase();
    }
    else {
      displayName = decodedPart
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => {
          if (ACRONYMS.has(word.toLowerCase())) {
            return word.toUpperCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    }

    return {
      name: displayName,
      path: '/' + pathParts.slice(0, index + 1).join('/'),
      isLast: index === pathParts.length - 1
    };
  });

  return breadcrumbItems;
};

const getPageTitle = (path) => {
  const pathParts = path.replace(/^\/+/, '').split('/').filter(Boolean);

  if (pathParts.length === 0) {
    return 'Dashboard';
  }

  const lastPart = pathParts[pathParts.length - 1];
  const decodedPart = decodeURIComponent(lastPart);

  return decodedPart
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const DashboardLayout = ({ children, title, menuItems }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get notifications hook with refetch capability
  const {
    badgeCount,
  } = useNotifications();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [open, setOpen] = React.useState(!isMobile);
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [expandedItems, setExpandedItems] = React.useState(new Set());

  // Prevent body scroll locking issues
  React.useEffect(() => {
    const originalStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };

    return () => {
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.paddingRight = originalStyles.paddingRight;
    };
  }, []);

  // Handle drawer state on screen size changes
  React.useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => setOpen(!open);
  const handleDrawerClose = () => setOpen(false);

  const toggleNotificationDrawer = (open) => (event) => {
    if (
      event &&
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }

    setNotificationOpen(open);
  };

  const handleNotificationClose = () => {
    setNotificationOpen(false);
  };

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  const breadcrumbItems = generateBreadcrumb(location.pathname);
  const pageTitle = getPageTitle(location.pathname);

  const getUserRole = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.role || parsed.userType || 'USER';
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
    }
    return 'USER';
  };

  const userRole = getUserRole();

  const isRouteActive = (path) => {
    if (!path) return false;
    const currentPath = location.pathname;

    if (currentPath === path) return true;

    if (path !== '/super-admin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath.startsWith(path + '/')) {
      return true;
    }

    if (path === '/manager-dashboard' && currentPath === '/manager-dashboard') {
      return true;
    }

    if (path !== '/super-admin-dashboard' && path !== '/manager-dashboard' && path !== '/tech-dashboard' && currentPath === path) {
      return true;
    }

    return false;
  };

  const getActiveStyles = (path) => {
    const isActive = isRouteActive(path);

    if (isActive) {
      return {
        color: `${colors.primary} !important`,
        backgroundColor: colors.activeBg,
        borderLeft: `2px solid ${colors.activeBorder}`,
        '& .MuiListItemIcon-root': {
          color: colors.primary,
        },
        '&:hover': {
          backgroundColor: alpha(colors.primary, 0.15),
          color: `${colors.primary} !important`,
        },
        borderRadius: '0 5px 5px 0',
        transition: 'all 0.15s ease',
        mx: 0.5,
        my: 0.25,
      };
    }

    return {
      color: colors.textSecondary,
      backgroundColor: 'transparent',
      '& .MuiListItemIcon-root': {
        color: colors.textSecondary,
      },
      '&:hover': {
        backgroundColor: colors.sidebarHover,
        color: colors.primary,
        '& .MuiListItemIcon-root': {
          color: colors.primary,
        },
      },
      borderRadius: '0 5px 5px 0',
      transition: 'all 0.15s ease',
      mx: 0.5,
      my: 0.25,
    };
  };

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
    handleMenuClose();
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    if (path) {
      if (path.startsWith('http://') || path.startsWith('https://')) {
        window.open(path, '_blank');
      } else {
        navigate(path);
      }

      if (isMobile) {
        setOpen(false);
      }
    }
  };

  const handleBreadcrumbClick = (path) => {
    if (path) {
      navigate(path);
      if (isMobile) {
        setOpen(false);
      }
    }
  };

  const handleProfileDialogClose = () => {
    setProfileDialogOpen(false);
  };

  const toggleMobileSearch = () => {
    setMobileSearchOpen(!mobileSearchOpen);
  };

  const handleMobileSearchClose = () => {
    setMobileSearchOpen(false);
  };

  const handleSearchChange = (value) => {
    setSearchValue(value);
    console.log('Search value:', value);
  };

  const handleExpandToggle = (itemText) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemText)) {
        newSet.delete(itemText);
      } else {
        newSet.add(itemText);
      }
      return newSet;
    });
  };

  const processMenuItems = (items) => {
    return items.map(item => ({
      ...item,
      expanded: expandedItems.has(item.text),
      subItems: item.subItems ? processMenuItems(item.subItems) : undefined,
    }));
  };

  const processedMenuItems = menuItems?.map(section => ({
    ...section,
    items: processMenuItems(section.items || [])
  }));

  const renderDrawerContent = () => (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: colors.textPrimary,
      '& .MuiListItemIcon-root': {
        color: 'inherit',
      },
      '& .MuiTypography-root': {
        color: 'inherit',
      },
      '& .MuiDivider-root': {
        borderColor: colors.borderLight,
      },
      position: 'relative',
      scrollbarGutter: 'stable',
    }}>
      {isMobile && (
        <DrawerCloseButton onClick={handleDrawerClose}>
          <X size={16} />
        </DrawerCloseButton>
      )}

      <DrawerHeader>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          width: '100%',
        }}>
          {open ? (
            <img
              src={logo}
              alt="Logo"
              style={{
                width: '150px',
                height: 'auto',
                padding: '0.75rem',
              }}
            />
          ) : (
            <Box sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={miniLogo}
                alt="Logo"
                style={{
                  width: '40px',
                  height: '40px',
                  objectFit: 'contain',
                }}
              />
            </Box>
          )}
        </Box>
      </DrawerHeader>
      <ScrollableBox sx={{ py: 0.5 }}>
        {processedMenuItems?.map((section, sectionIndex) => (
          <React.Fragment key={sectionIndex}>
            {open && section.sectionName && (
              <Box sx={{
                px: 2.5,
                py: 0.75,
                mb: 0.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: colors.textTertiary,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                  }}
                >
                  {section.sectionName}
                </Typography>
              </Box>
            )}

            <List sx={{ py: 0.25 }}>
              {section.items.map((item, index) => (
                <NestedMenuItem
                  key={item.text || index}
                  item={item}
                  level={0}
                  isDrawerOpen={open}
                  getActiveStyles={getActiveStyles}
                  handleNavigation={handleNavigation}
                  isMobile={isMobile}
                  location={location}
                  onCloseDrawer={handleDrawerClose}
                  onExpandToggle={handleExpandToggle}
                />
              ))}
            </List>
          </React.Fragment>
        ))}
      </ScrollableBox>
    </Box>
  );

  const renderUserMenu = () => (
    <Menu
      anchorEl={menuAnchorEl}
      open={Boolean(menuAnchorEl)}
      onClose={handleMenuClose}
      disableScrollLock={true}
      PaperProps={{
        sx: {
          mt: 0.5,
          minWidth: 160,
          backgroundColor: colors.appBarBg,
          backdropFilter: 'blur(10px)',
          color: colors.textPrimary,
          border: `1px solid ${alpha('#ffffff', 0.2)}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          '& .MuiMenuItem-root': {
            fontSize: '0.8rem',
            py: 0.5,
            px: 1.25,
            color: colors.textPrimary,
            '&:hover': {
              backgroundColor: alpha('#ffffff', 0.15),
              color: colors.primary,
            },
            '& .MuiListItemIcon-root': {
              color: 'inherit',
              minWidth: 32,
            },
          },
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{
        px: 1.25,
        py: 0.75,
        borderBottom: `1px solid ${alpha('#ffffff', 0.2)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: colors.primary,
            color: colors.white,
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {getInitials(user?.name)}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" sx={{
            fontWeight: 600,
            color: colors.textPrimary,
            fontSize: '0.8rem',
            lineHeight: 1.2,
          }}>
            {user?.name || 'Jenny Wilson'}
          </Typography>
          <Typography variant="caption" sx={{
            color: alpha(colors.textPrimary, 0.7),
            fontSize: '0.7rem',
            lineHeight: 1.2,
          }}>
            {user?.email || 'jennywilson@gmail.com'}
          </Typography>
        </Box>
      </Box>
      <MenuItem onClick={handleProfileClick}>
        <ListItemIcon>
          <User size={16} color={colors.textPrimary} />
        </ListItemIcon>
        <Typography sx={{ fontSize: '0.8rem', color: 'inherit' }}>Profile</Typography>
      </MenuItem>
      <Divider sx={{
        my: 0.5,
        borderColor: alpha('#ffffff', 0.2),
      }} />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogOut size={16} color={colors.textPrimary} />
        </ListItemIcon>
        <Typography sx={{ fontSize: '0.8rem', color: 'inherit' }}>Logout</Typography>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      overflow: 'hidden',
    }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        open={open && !isMobile}
        sx={{
          zIndex: theme.zIndex.drawer - 1,
          backgroundColor: colors.appBarBg,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          px: { xs: 1.5, md: 0 },
        }}
      >
        <Toolbar sx={{
          minHeight: 56,
          py: { xs: 1, sm: 0 },
          gap: 1.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isMobile ? (
              <IconButton
                onClick={handleDrawerToggle}
                edge="start"
                sx={{
                  marginLeft: open ? -1.5 : 5.5,
                  width: 32,
                  height: 32,
                  borderRadius: '5px',
                  border: `1px solid ${alpha('#ffffff', 0.3)}`,
                  backgroundColor: alpha('#ffffff', 0.9),
                  color: colors.textPrimary,
                  '&:hover': {
                    backgroundColor: alpha('#ffffff', 0.95),
                    borderColor: alpha('#ffffff', 0.5),
                  },
                }}
              >
                {open ? (
                  <ChevronLeft size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </IconButton>
            ) : (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                edge="start"
                sx={{
                  color: colors.textPrimary,
                  borderRadius: '5px',
                  backgroundColor: alpha('#ffffff', 0.9),
                  border: `1px solid ${alpha('#ffffff', 0.3)}`,
                  '&:hover': {
                    backgroundColor: alpha('#ffffff', 0.95),
                  },
                }}
              >
                <MenuIcon size={18} />
              </IconButton>
            )}

            <MobilePageTitle>
              {pageTitle}
            </MobilePageTitle>

            <BreadcrumbContainer>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontWeight: 600,
                  color: colors.textPrimary,
                  fontSize: '0.95rem',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={item.path || `item-${index}`}>
                    {index > 0 && (
                      <Box
                        component="span"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 0.5,
                        }}
                      >
                        <ChevronRight size={14} color={alpha(colors.textPrimary, 0.7)} />
                      </Box>
                    )}
                    <Box
                      component="span"
                      onClick={() => !item.isLast && handleBreadcrumbClick(item.path)}
                      sx={{
                        color: item.isLast ? colors.primary : alpha(colors.textPrimary, 0.9),
                        cursor: item.isLast ? 'default' : 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: item.isLast ? 600 : 500,
                        '&:hover': !item.isLast ? {
                          color: colors.primary,
                          textDecoration: 'underline',
                        } : {},
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                      }}
                    >
                      {item.name}
                      {item.isLast && (
                        <Box sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: colors.primary,
                          ml: 0.5,
                        }} />
                      )}
                    </Box>
                  </React.Fragment>
                ))}
              </Typography>
            </BreadcrumbContainer>
          </Box>
          <Box sx={{ flex: 1 }} />

          {/* Desktop Actions Container */}
          <DesktopActionsContainer>
            <SearchBar
              mobileSearchOpen={mobileSearchOpen}
              onMobileSearchToggle={toggleMobileSearch}
              onMobileSearchClose={handleMobileSearchClose}
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              placeholder="Search pages..."
            />
            {/* Notification Badge - New Component */}
            <NotificationBadge
              onClick={toggleNotificationDrawer(true)}
              tooltipTitle="Notifications"
              showPulse={true}
              variant="default"
            />

            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0.1,
                borderRadius: '5px',
                border: `1px solid ${alpha('#ffffff', 0.3)}`,
                backgroundColor: alpha('#ffffff', 0.1),
                '&:hover': {
                  backgroundColor: alpha('#ffffff', 0.2),
                },
              }}
            >
              <Avatar
                sx={{
                  width: 35,
                  height: 35,
                  bgcolor: colors.primary,
                  color: colors.white,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {getInitials(user?.name)}
              </Avatar>
            </IconButton>

            {renderUserMenu()}
          </DesktopActionsContainer>

          {/* Mobile Actions Container */}
          <MobileActionsContainer>
            <SearchBar
              mobileSearchOpen={mobileSearchOpen}
              onMobileSearchToggle={toggleMobileSearch}
              onMobileSearchClose={handleMobileSearchClose}
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
              placeholder="Search pages..."
            />

            {/* Notification Badge - Mobile */}
            <NotificationBadge
              onClick={toggleNotificationDrawer(true)}
              tooltipTitle="Notifications"
              showPulse={true}
              variant="compact"
            />

            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0.5,
                borderRadius: '5px',
                border: `1px solid ${alpha('#ffffff', 0.3)}`,
                backgroundColor: alpha('#ffffff', 0.1),
                '&:hover': {
                  backgroundColor: alpha('#ffffff', 0.2),
                },
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: colors.primary,
                  color: colors.white,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {getInitials(user?.name)}
              </Avatar>
            </IconButton>

            {renderUserMenu()}
          </MobileActionsContainer>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <MuiDrawer
          variant="temporary"
          open={open}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: mobileDrawerWidth,
              backgroundColor: colors.drawerBg,
              borderRight: `1px solid ${colors.borderLight}`,
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f5f9',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#cbd5e0',
                borderRadius: '2px',
                '&:hover': {
                  background: '#a0aec0',
                },
              },
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e0 #f1f5f9',
              top: 0,
              height: '100%',
              zIndex: theme.zIndex.drawer + 10,
            },
            '& .MuiBackdrop-root': {
              zIndex: theme.zIndex.drawer + 9,
            },
          }}
        >
          {renderDrawerContent()}
        </MuiDrawer>
      ) : (
        <PermanentDrawer variant="permanent" open={open}>
          {renderDrawerContent()}
        </PermanentDrawer>
      )}

      <MainContent>
        <DrawerHeader />

        <ContentWrapper>
          <ContentCard>
            <ScrollableContent>
              {children}
            </ScrollableContent>
          </ContentCard>
        </ContentWrapper>

        <Box sx={{
          borderTop: `1px solid ${colors.borderLight}`,
          backgroundColor: colors.white,
          py: 1,
          px: { xs: 1, sm: 2 }
        }}>
          <DashboardFooter />
        </Box>
      </MainContent>

      {/* Notification Drawer */}
      <SwipeableDrawer
        anchor="right"
        open={notificationOpen}
        onClose={toggleNotificationDrawer(false)}
        onOpen={toggleNotificationDrawer(true)}
        sx={{
          '& .MuiDrawer-paper': {
            width: notificationDrawerWidth,
            backgroundColor: colors.white,
            borderLeft: `1px solid ${colors.borderLight}`,
            color: colors.textPrimary,
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f5f9',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#cbd5e0',
              borderRadius: '2px',
              '&:hover': {
                background: '#a0aec0',
              },
            },
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e0 #f1f5f9',
            [theme.breakpoints.down('sm')]: {
              width: '100%',
            },
          },
        }}
      >
        <NotificationDrawer onClose={handleNotificationClose} />
      </SwipeableDrawer>

      <ProfileDialog
        open={profileDialogOpen}
        onClose={handleProfileDialogClose}
        user={user}
        userRole={userRole}
      />
    </Box>
  );
};

export default DashboardLayout;