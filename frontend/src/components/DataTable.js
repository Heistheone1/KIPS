import React from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, Avatar,
} from '@mui/material';

const DataTable = ({ columns, data, rowActions, noDataMessage = 'No records found' }) => {
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: 12 }}>
        <Typography variant="body2" color="text.secondary">{noDataMessage}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  {col.label}
                </TableCell>
              ))}
              {rowActions && <TableCell sx={{ width: 120, textAlign: 'center' }} /></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                {columns.map((col) => {
                  const value = row[col.key];
                  if (col.render) return col.render(value, row);
                  if (col.type === 'status') {
                    const statusColors = {
                      active: { bg: '#d1fae5', color: '#0f766e', label: 'Active' },
                      inactive: { bg: '#fee2e2', color: '#991b1b', label: 'Inactive' },
                      suspended: { bg: '#fef3c7', color: '#92400e', label: 'Suspended' },
                      pending: { bg: '#e0f2fe', color: '#0369a1', label: 'Pending' },
                    };
                    const s = statusColors[value] || statusColors.pending;
                    return (
                      <TableCell key={col.key}>
                        <Chip size="small" label={s.label} sx={{ color: s.color, backgroundColor: s.bg, fontWeight: 600, borderRadius: 6 }} />
                      </TableCell>
                    );
                  }
                  if (col.type === 'avatar') {
                    return (
                      <TableCell key={col.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 16 }}>{value?.charAt(0) || '?'}</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#0f172a' }}>{row.name || row.firstName || value}</Typography>
                      </TableCell>
                    );
                  }
                  return <TableCell key={col.key} sx={{ fontWeight: 500, color: '#334155' }}>{value}</TableCell>;
                })}
                {rowActions && (
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      {rowActions.map((action) => (
                        <IconButton key={action.label} size="small" onClick={() => action.handler(row)} sx={{ color: '#64748b', '&:hover': { color: '#0d9488', backgroundColor: '#f0fdfa' } }} title={action.label}>
                          {action.icon}
                        </IconButton>
                      ))}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DataTable;