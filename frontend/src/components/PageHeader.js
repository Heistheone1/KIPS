import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const PageHeader = ({ title, subtitle, actions, breadcrumb }) => (
  <Box sx={{ mb: 3 }}>
    {breadcrumb && breadcrumb.length > 0 && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        {breadcrumb.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <ChevronRightIcon sx={{ fontSize: 14, color: '#cbd5e1' }} />}
            <Typography sx={{
              fontSize: '0.78rem', fontWeight: item.active ? 700 : 500,
              color: item.active ? '#0d9488' : '#94a3b8',
            }}>
              {item.label}
            </Typography>
          </React.Fragment>
        ))}
      </Box>
    )}
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>{actions}</Box>}
    </Box>
    <Divider sx={{ mt: 2, borderColor: '#f1f5f9' }} />
  </Box>
);

export default PageHeader;
