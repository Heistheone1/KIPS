import React, { useState } from 'react';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Tooltip, Divider, Avatar, Collapse,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logo from '../assets/logo.png';

const ROLE_META = {
  ADMIN: { label: 'Administrator', color: '#000693', bg: '#eef0ff' },
  DOS: { label: 'Dean of Studies', color: '#7c3aed', bg: '#f5f3ff' },
  TEACHER: { label: 'Teacher', color: '#0d9488', bg: '#f0fdfa' },
  CLASS_TEACHER: { label: 'Class Teacher', color: '#0d9488', bg: '#f0fdfa' },
  STUDENT: { label: 'Student', color: '#2563eb', bg: '#eff6ff' },
};

const NavItem = ({ to, label, Icon, collapsed, color }) => {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Tooltip title={collapsed ? label : ''} placement="right">
      <ListItemButton
        component={Link}
        to={to}
        sx={{
          mx: 1, mb: 0.5, borderRadius: 2, px: collapsed ? 1.5 : 2, py: 1,
          minHeight: 44,
          justifyContent: collapsed ? 'center' : 'flex-start',
          bgcolor: active ? `${color}15` : 'transparent',
          color: active ? color : '#64748b',
          '&:hover': { bgcolor: `${color}10`, color },
          transition: 'all 0.15s',
        }}
      >
        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 20 }} />
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500 }}
          />
        )}
        {active && !collapsed && (
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: color, ml: 'auto' }} />
        )}
      </ListItemButton>
    </Tooltip>
  );
};

const Sidebar = ({ items, collapsed = false }) => {
  const { currentRole, currentUser } = useSelector((s) => s.user);
  const meta = ROLE_META[currentRole] || ROLE_META.ADMIN;
  const initials = `${currentUser?.firstName?.[0] ?? ''}${currentUser?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <Box
      sx={{
        display: 'flex', flexDirection: 'column', height: '100%',
        width: collapsed ? 64 : 260, transition: 'width 0.2s',
        bgcolor: '#ffffff', borderRight: '1px solid #e2e8f0', overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: collapsed ? 1 : 2.5, py: 2.5,
        borderBottom: '1px solid #f1f5f9',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Avatar src={logo} sx={{ width: 34, height: 34, borderRadius: 1.5, flexShrink: 0 }} />
        {!collapsed && (
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.2 }}>
              KIPS-SMS
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: 0.5 }}>
              School Management
            </Typography>
          </Box>
        )}
      </Box>

      {/* Role badge */}
      {!collapsed && (
        <Box sx={{ mx: 2, my: 1.5, px: 2, py: 1, borderRadius: 2, bgcolor: meta.bg }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {meta.label}
          </Typography>
        </Box>
      )}

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: '#e2e8f0', borderRadius: 2 },
      }}>
        <List disablePadding>
          {items.map((item, i) => {
            if (item.type === 'subheader') {
              return collapsed ? (
                <Divider key={i} sx={{ mx: 1, my: 1 }} />
              ) : (
                <Typography key={i} sx={{
                  px: 3, pt: 2, pb: 0.5, fontSize: '0.68rem', fontWeight: 700,
                  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {item.label}
                </Typography>
              );
            }
            if (item.type === 'divider') return <Divider key={i} sx={{ mx: 2, my: 1 }} />;
            const Icon = item.icon;
            return (
              <NavItem key={item.to} to={item.to} label={item.label} Icon={Icon} collapsed={collapsed} color={meta.color} />
            );
          })}
        </List>
      </Box>

      {/* User footer */}
      <Box sx={{
        borderTop: '1px solid #f1f5f9', px: collapsed ? 1 : 2, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: meta.color, fontSize: '0.8rem', flexShrink: 0 }}>
          {initials}
        </Avatar>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.firstName} {currentUser?.lastName}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {currentUser?.email ?? ''}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Sidebar;
