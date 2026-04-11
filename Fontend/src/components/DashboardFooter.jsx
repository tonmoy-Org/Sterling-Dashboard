import React from 'react';
import { Box, Typography, Container, alpha } from '@mui/material';

export default function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 2.5,
        px: 2,
        backgroundColor: 'white',
      }}
    >
      <Container maxWidth="xl">
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{
            fontWeight: 400,
            fontSize: '0.875rem',
          }}
        >
          © {currentYear} Sterling Septic & Plumbing LLC. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}