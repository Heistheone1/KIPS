import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, Box, Typography, CircularProgress, Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const STATUS_COLORS = {
  ACTIVE: 'success', PLANNED: 'info', CLOSED: 'default', DRAFT: 'info',
  INACTIVE: 'default', COMPLETED: 'success', TRANSFERRED: 'warning',
  WITHDRAWN: 'error', CANCELLED: 'error', GRADUATED: 'primary',
};

const AcademicTable = ({ columns, rows, onEdit, loading, emptyMessage = 'No records found.', extraActions }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            {columns.map((col) => (
              <TableCell key={col.key} sx={{ fontWeight: 600 }}>{col.label}</TableCell>
            ))}
            {(onEdit || extraActions) && <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row._id} hover>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render ? col.render(row) : (
                    col.isStatus
                      ? <Chip label={row[col.key]} size="small" color={STATUS_COLORS[row[col.key]] || 'default'} />
                      : (row[col.key] ?? '—')
                  )}
                </TableCell>
              ))}
              {(onEdit || extraActions) && (
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {extraActions && extraActions(row)}
                    {onEdit && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(row)}>
                          <EditIcon fontSize="small" />
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
  );
};

export default AcademicTable;
