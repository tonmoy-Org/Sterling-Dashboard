import React, { useState, useMemo } from 'react';
import { Box, Typography, Badge } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import h1 from '../../../assets/homepage/h1.jpeg';
import h2 from '../../../assets/homepage/h2.jpeg';
import h3 from '../../../assets/homepage/h3.jpeg';
import h4 from '../../../assets/homepage/h4.jpeg';
import h5 from '../../../assets/homepage/h6.jpeg';
import h6 from '../../../assets/homepage/h7.png';
import { useNotifications } from '../../../hooks/useNotifications';

const getOneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
};

const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const dashboardCards = [
  { label: 'Lookup Tool', route: 'https://dashboard.sterlingsepticandplumbing.com/lookup', handwritten: true, image: h4, notificationPath: null },
  { label: 'RME', route: '/super-admin-dashboard/rme/work-orders', handwritten: true, image: h2, notificationPath: '/super-admin-dashboard/rme/work-orders' },
  { label: 'Tank Repairs', route: '/super-admin-dashboard/repairs', handwritten: true, image: h5, notificationPath: null },
  { label: 'Locates', route: '/super-admin-dashboard/locates/work-orders', handwritten: true, image: h3, notificationPath: '/super-admin-dashboard/locates/work-orders' },
  { label: '', route: null, handwritten: false, image: null, notificationPath: null },
  { label: 'Customer Center', route: '/super-admin-dashboard/customer-center', handwritten: true, image: h1, notificationPath: '/super-admin-dashboard/customer-center' },
  { label: 'Dispatch KPI', route: '/super-admin-dashboard/dispatch-kpi', handwritten: true, image: h6, notificationPath: null },
  { label: '', route: null, handwritten: false, image: null, notificationPath: null },
  { label: '', route: null, handwritten: false, image: null, notificationPath: null },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Good Night', emoji: '🌙' };
};

const formatDate = (date) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
};

export const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now] = useState(new Date());
  const { notifications } = useNotifications();

  const greeting = getGreeting();
  const dateStr = formatDate(now);

  // Calculate notification counts for each card
  const notificationCounts = useMemo(() => {
    if (!notifications) return {};

    const oneMonthAgo = getOneMonthAgo();
    const now = Date.now();
    const WO_STALE_THRESHOLD = 24 * 60 * 60 * 1000;

    return {
      // Locates count
      '/super-admin-dashboard/locates/work-orders': (notifications.locates || []).filter(l => {
        const dateValue = l.created_at || l.created_date;
        return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !l.is_seen;
      }).length,

      // RME count
      '/super-admin-dashboard/rme/work-orders': (notifications.workOrders || []).filter(w => {
        const dateValue = w.elapsed_time;
        return isValidDate(dateValue) && new Date(dateValue) >= oneMonthAgo && !w.is_seen;
      }).length,

      // Customer Center count
      '/super-admin-dashboard/customer-center': (notifications.allWorkOrders || []).filter(wo => {
        if (wo.is_deleted) return false;
        const ts = wo.createdAt ? new Date(wo.createdAt).getTime() : null;
        const isRecent = ts === null || !isNaN(ts) && (now - ts) <= WO_STALE_THRESHOLD;
        const isUnseen = Array.isArray(wo.user_seen_records) && wo.user_seen_records.length === 0;
        return isRecent && isUnseen;
      }).length,
    };
  }, [notifications]);

  const handleCardClick = (route) => {
    if (!route) return;

    // Open Lookup Tool in new tab
    if (route.includes('dashboard.sterlingsepticandplumbing.com')) {
      window.open(route, '_blank');
    } else {
      // Navigate internally for other routes
      navigate(route);
    }
  };

  // Helper to render card with badge
  const renderCard = (card, index) => {
    const count = card.notificationPath ? notificationCounts[card.notificationPath] || 0 : 0;
    const hasCount = count > 0;

    return (
      <Box
        key={index}
        onClick={() => handleCardClick(card.route)}
        sx={{
          border: '2px solid #1976d2',
          borderRadius: 1,
          height: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          cursor: card.route ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          backgroundColor: '#fafafa',
          pt: card.image ? 1 : 0,
          position: 'relative',
          '&:hover': card.route
            ? {
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                transform: 'translateY(-2px)',
              }
            : {},
        }}
      >
        {/* Notification Badge */}
        {hasCount && (
          <Badge
            badgeContent={count}
            color="error"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              '& .MuiBadge-badge': {
                fontSize: 12,
                height: 20,
                minWidth: 20,
                borderRadius: 10,
                fontWeight: 'bold',
                backgroundColor: '#f44336',
                color: 'white',
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                  },
                  '50%': {
                    transform: 'scale(1.1)',
                  },
                  '100%': {
                    transform: 'scale(1)',
                  },
                },
              },
            }}
          />
        )}

        {card.image && (
          <Box
            component="img"
            src={card.image}
            alt={card.label}
            sx={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              mb: 1,
              mt: 0.5,
            }}
          />
        )}
        {card.label && (
          <Typography
            sx={{
              fontFamily: card.handwritten
                ? '"Permanent Marker", cursive'
                : 'inherit',
              fontSize: card.handwritten ? 18 : 14,
              fontWeight: card.handwritten ? 400 : 500,
              textAlign: 'center',
              lineHeight: 1.3,
              px: 1,
              color: '#111',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {card.label}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Helmet>
        <title>Dashboard | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Super Admin dashboard" />
      </Helmet>

      {/* Greeting Banner */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 1,
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f9ff 100%)',
          border: '1px solid #bbdefb',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: '"Permanent Marker", cursive',
              fontSize: 28,
              color: '#1565c0',
              lineHeight: 1.2,
            }}
          >
            {greeting.emoji} {greeting.text}{user?.name ? `, ${user.name}` : ''}!
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#555', mt: 0.5 }}>
            {dateStr}
          </Typography>
        </Box>
      </Box>

      <Typography gutterBottom sx={{ mb: 1, fontSize: 17, fontWeight: 500 }}>
        Welcome to Sterling Septic & Plumbing LLC.
      </Typography>
      <Typography gutterBottom sx={{ mb: 4, fontSize: 14 }}>
        This is a web application that allows you to look up customer information.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 2,
        }}
      >
        {dashboardCards.map((card, index) => renderCard(card, index))}
      </Box>
    </Box>
  );
};