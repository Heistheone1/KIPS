import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const PALETTE = [
  { grad: 'linear-gradient(135deg, #000693, #3b0fd4)', light: '#eef0ff', text: '#000693' },
  { grad: 'linear-gradient(135deg, #0d9488, #0f766e)', light: '#f0fdfa', text: '#0d9488' },
  { grad: 'linear-gradient(135deg, #7c3aed, #6d28d9)', light: '#f5f3ff', text: '#7c3aed' },
  { grad: 'linear-gradient(135deg, #d97706, #b45309)', light: '#fffbeb', text: '#d97706' },
  { grad: 'linear-gradient(135deg, #2563eb, #1d4ed8)', light: '#eff6ff', text: '#2563eb' },
  { grad: 'linear-gradient(135deg, #dc2626, #b91c1c)', light: '#fef2f2', text: '#dc2626' },
];

const StatCard = ({ title, value, icon: Icon, subtitle, trend, trendUp, colorIndex = 0 }) => {
  const pal = PALETTE[colorIndex % PALETTE.length];

  return (
    <Paper
      sx={{
        p: 2.5, borderRadius: 3, border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column', gap: 2,
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
      }}
    >
      {/* top accent bar */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: pal.grad }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 0.5 }}>
        <Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5,
          background: pal.grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {Icon && <Icon sx={{ fontSize: 22, color: '#fff' }} />}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {subtitle && (
          <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
        {trend !== undefined && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            px: 1, py: 0.25, borderRadius: 1,
            bgcolor: trendUp ? '#dcfce7' : '#fee2e2',
          }}>
            {trendUp
              ? <TrendingUpIcon sx={{ fontSize: 14, color: '#16a34a' }} />
              : <TrendingDownIcon sx={{ fontSize: 14, color: '#dc2626' }} />
            }
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: trendUp ? '#16a34a' : '#dc2626' }}>
              {Math.abs(trend)}%
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StatCard;
