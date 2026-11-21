import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

const SIDEBAR_FULL = 260;
const SIDEBAR_MINI = 64;

const DashboardShell = ({ sidebarItems, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f8fafc' }}>
      <CssBaseline />

      {/* Sidebar */}
      <Box
        sx={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: sidebarW, zIndex: 1200,
          transition: 'width 0.2s',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        }}
      >
        <Sidebar items={sidebarItems} collapsed={collapsed} />
      </Box>

      {/* Header */}
      <Header
        onMenuClick={() => setCollapsed((v) => !v)}
        sidebarOpen={!collapsed}
      />

      {/* Main content */}
      <Box
        component="main"
        sx={{
          ml: `${sidebarW}px`,
          mt: '64px',
          flex: 1,
          minHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          transition: 'margin-left 0.2s',
          px: { xs: 2, sm: 3, md: 4 },
          py: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default DashboardShell;
