import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Tooltip, CircularProgress, Stack,
  InputAdornment, TextField, Avatar, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';

const STATUS_COLORS = {
  ACTIVE: { bg: '#dcfce7', color: '#16a34a' },
  PLANNED: { bg: '#dbeafe', color: '#2563eb' },
  CLOSED: { bg: '#f1f5f9', color: '#64748b' },
  DRAFT: { bg: '#dbeafe', color: '#2563eb' },
  INACTIVE: { bg: '#f1f5f9', color: '#64748b' },
  COMPLETED: { bg: '#dcfce7', color: '#16a34a' },
  TRANSFERRED: { bg: '#fef3c7', color: '#d97706' },
  WITHDRAWN: { bg: '#fee2e2', color: '#dc2626' },
  CANCELLED: { bg: '#fee2e2', color: '#dc2626' },
  GRADUATED: { bg: '#f3e8ff', color: '#7c3aed' },
  ACTIVE_TEACHER: { bg: '#dcfce7', color: '#16a34a' },
};

export const StatusBadge = ({ value }) => {
  const s = STATUS_COLORS[value] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.4,
      borderRadius: 99, bgcolor: s.bg,
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color, mr: 0.75 }} />
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>
        {value}
      </Typography>
    </Box>
  );
};

const PageLayout = ({
  title, subtitle, icon: Icon, iconColor = '#2563eb', iconBg = '#eff6ff',
  onAdd, canAdd = true, addLabel = 'Add New',
  columns, rows, loading, emptyMessage = 'No records found.',
  extraActions, onEdit, searchable = true, filters, headerActions, beforeFilters,
}) => {
  const [search, setSearch] = useState('');
  const safeRows = Array.isArray(rows) ? rows : [];

  const filtered = searchable && search.trim()
    ? safeRows.filter((r) => {
        if (!r) return false;
        const q = search.toLowerCase();
        return columns.some((col) => {
          const val = col.render ? '' : String(r[col.key] ?? '').toLowerCase();
          return val.includes(q);
        });
      })
    : safeRows;

  return (
    <Box>
      {/* Professional page header */}
      <Box sx={{ background: '#fff', borderBottom: '1px solid #e2e8f0', pb: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {Icon && (
            <Avatar sx={{ width: 52, height: 52, bgcolor: iconBg, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <Icon sx={{ fontSize: 26, color: iconColor }} />
            </Avatar>
          )}
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block' }}>
              KIPS-SMS
            </Typography>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2, mt: 0.15 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: '0.9rem', color: '#64748b', mt: 0.3, lineHeight: 1.5, fontWeight: 500 }}>{subtitle}</Typography>
            )}
          </Box>
          {headerActions && (
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {headerActions}
            </Box>
          )}
        </Box>
        <Box sx={{ mt: 1, borderLeft: '3px solid', borderColor: iconColor, pl: 2, height: 40 }} />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          {canAdd && onAdd && (
            <Button
              onClick={onAdd}
              startIcon={<AddIcon />}
              variant="contained"
              sx={{
                background: `linear-gradient(135deg, ${iconColor}, ${iconColor}cc)`,
                borderRadius: 3, px: 3, py: 1.1, fontWeight: 800, fontSize: '0.85rem',
                boxShadow: `0 4px 14px ${iconColor}33`,
                '&:hover': { background: `linear-gradient(135deg, ${iconColor}dd, ${iconColor}aa)` },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              {addLabel}
            </Button>
          )}
        </Box>
      </Box>

      {/* Optional content between the header and the filters (stats, actions…) */}
      {beforeFilters}

      {/* Filters + search bar */}
      {(filters || searchable) && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {filters}
          {searchable && (
            <TextField
              size="small"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 220,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2, bgcolor: '#fff',
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: iconColor },
                  '&.Mui-focused fieldset': { borderColor: iconColor },
                },
              }}
            />
          )}
        </Box>
      )}

      {/* Table */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: iconColor }} />
          </Box>
        ) : !filtered || filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            {Icon && (
              <Avatar sx={{ width: 56, height: 56, bgcolor: iconBg, mx: 'auto', mb: 2, borderRadius: 2.5 }}>
                <Icon sx={{ fontSize: 28, color: iconColor }} />
              </Avatar>
            )}
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>{emptyMessage}</Typography>
            {canAdd && onAdd && (
              <Button onClick={onAdd} size="small" sx={{ mt: 1.5, color: iconColor, fontWeight: 700 }}>
                + {addLabel}
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {columns.map((col) => (
                    <TableCell key={col.key} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                      {col.label}
                    </TableCell>
                  ))}
                  {(onEdit || extraActions) && (
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, py: 1.5, borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row, idx) => (
                  <TableRow key={row?._id || row?.id || `row-${idx}`} hover sx={{ '&:hover': { bgcolor: '#fafafa' }, '& td': { borderBottom: '1px solid #f8fafc' } }}>
                    {columns.map((col) => (
                      <TableCell key={col.key} sx={{ fontSize: '0.82rem', color: '#334155', py: 1.5 }}>
                        {col.render ? col.render(row) : (
                          col.isStatus ? <StatusBadge value={row[col.key]} /> : (row[col.key] ?? '—')
                        )}
                      </TableCell>
                    ))}
                    {(onEdit || extraActions) && (
                      <TableCell sx={{ textAlign: 'right', py: 1 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          {extraActions && extraActions(row)}
                          {onEdit && (
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => onEdit(row)} sx={{ color: '#64748b', '&:hover': { color: iconColor, bgcolor: iconBg } }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Row count */}
      {!loading && filtered && filtered.length > 0 && (
        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1.5, textAlign: 'right' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          {search && rows.length !== filtered.length ? ` (filtered from ${rows.length})` : ''}
        </Typography>
      )}
    </Box>
  );
};

export default PageLayout;
