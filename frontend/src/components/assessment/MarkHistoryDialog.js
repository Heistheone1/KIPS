import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Box, CircularProgress, Alert,
} from '@mui/material';
import { fetchMarkHistory } from '../../redux/assessmentRelated/assessmentHandle';
import { assessmentReset } from '../../redux/assessmentRelated/assessmentSlice';

/**
 * Displays the immutable correction history for a single mark.
 * All values come from the backend — nothing is computed here.
 */
const MarkHistoryDialog = ({ open, onClose, markId, studentName }) => {
  const dispatch = useDispatch();
  const { markHistory, loading, error, success } = useSelector((s) => s.assessment);

  useEffect(() => {
    if (open && markId) dispatch(fetchMarkHistory(markId));
  }, [open, markId, dispatch]);

  useEffect(() => {
    if (success) dispatch(assessmentReset());
  }, [success, dispatch]);

  const renderScore = (score, entered) => {
    if (!entered) return <Chip label="Missing" size="small" color="warning" />;
    return <Chip label={String(score)} size="small" color={score === 0 ? 'error' : 'success'} variant="outlined" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Mark History{studentName ? ` — ${studentName}` : ''}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : !markHistory || markHistory.length === 0 ? (
          <Typography color="text.secondary">
            No corrections have been recorded for this mark. The current value is the original entry.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Changed At</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Old</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>New</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Corrected By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {markHistory.map((c) => (
                  <TableRow key={c._id} hover>
                    <TableCell>{new Date(c.correctedAt).toLocaleString()}</TableCell>
                    <TableCell>{renderScore(c.oldScore, c.oldEntered)}</TableCell>
                    <TableCell>{renderScore(c.newScore, c.newEntered)}</TableCell>
                    <TableCell>{c.reason || '—'}</TableCell>
                    <TableCell>
                      {c.correctedBy ? `${c.correctedBy.firstName} ${c.correctedBy.lastName}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MarkHistoryDialog;
