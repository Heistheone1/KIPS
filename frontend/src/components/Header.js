import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar,
  Menu, MenuItem, Divider, Tooltip, Badge, InputBase,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ROLE_META = {
  ADMIN: { label: 'Admin', color: '#000693', profilePath: '/profile' },
  DOS: { label: 'Dean of Studies', color: '#7c3aed', profilePath: '/profile' },
  TEACHER: { label: 'Teacher', color: '#0d9488', profilePath: '/profile' },
  CLASS_TEACHER: { label: 'Class Teacher', color: '#0d9488', profilePath: '/profile' },
  STUDENT: { label: 'Student', color: '#2563eb', profilePath: '/profile' },
};

const Header = ({ onMenuClick, sidebarOpen }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { currentRole, currentUser } = useSelector((s) => s.user);
  const meta = ROLE_META[currentRole] || ROLE_META.ADMIN;
  const initials = `${currentUser?.firstName?.[0] ?? ''}${currentUser?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
  const fullName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: (t) => t.zIndex.drawer + 1,
        color: '#0f172a',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: 64, gap: 2 }}>

        {/* Menu toggle */}
        <IconButton onClick={onMenuClick} size="small" sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}>
          {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>

        {/* Search */}
        <Box sx={{
          display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1,
          bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2,
          px: 2, py: 0.75, flex: '0 1 360px',
          '&:focus-within': { border: '1px solid #0d9488', bgcolor: '#fff' },
          transition: 'all 0.15s',
        }}>
          <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
          <InputBase
            placeholder="Search students, classes, staff..."
            sx={{ fontSize: '0.875rem', color: '#334155', flex: 1, '& input::placeholder': { color: '#94a3b8' } }}
          />
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton size="small" sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}>
            <Badge badgeContent={3} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}>
              <NotificationsOutlinedIcon sx={{ fontSize: 22 }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Divider */}
        <Box sx={{ width: 1, height: 28, bgcolor: '#e2e8f0' }} />

        {/* User menu */}
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer',
            px: 1.5, py: 0.75, borderRadius: 2,
            '&:hover': { bgcolor: '#f8fafc' }, transition: 'all 0.15s',
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: meta.color, fontSize: '0.8rem', fontWeight: 700 }}>
            {initials}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {fullName || 'User'}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{meta.label}</Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ fontSize: 16, color: '#94a3b8', display: { xs: 'none', sm: 'block' } }} />
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: { mt: 1, minWidth: 200, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{fullName}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{currentUser?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem component={Link} to={meta.profilePath} onClick={() => setAnchorEl(null)}
            sx={{ gap: 1.5, py: 1.25, fontSize: '0.875rem', color: '#334155' }}>
            <PersonOutlineIcon sx={{ fontSize: 18 }} /> My Profile
          </MenuItem>
          <Divider />
          <MenuItem component={Link} to="/logout" onClick={() => setAnchorEl(null)}
            sx={{ gap: 1.5, py: 1.25, fontSize: '0.875rem', color: '#dc2626' }}>
            <LogoutIcon sx={{ fontSize: 18 }} /> Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
