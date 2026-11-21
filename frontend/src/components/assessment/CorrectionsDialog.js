import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Box, CircularProgress, Alert,
} from '@mui/material';
import { fetchCorrections } from '../../redux/assessmentRelated/assessmentHandle';
import { assessmentReset } from '../../redux/assessmentRelated/assessmentSlice';

/**
 * Lists every immutable mark correction recorded for an assessment.
 * All values come from the backend — nothing is computed here.
 * Corrections are append-only and never editable from the UI.
 */
const CorrectionsDialog = ({ open, onClose, assessment }) => {
  const dispatch = useDispatch();
  const { corrections, loading, error, success } = useSelector((s) => s.assessment);

  useEffect(() => {
    if (open && assessment?._id) dispatch(fetchCorrections(assessment._id));
  }, [open, assessment, dispatch]);

  useEffect(() => {
    if (success) dispatch(assessmentReset());
  }, [success, dispatch]);

  const renderScore = (score, entered) => {
    if (!entered) return <Chip label="Missing" size="small" color="warning" />;
    return <Chip label={String(score)} size="small" color={score === 0 ? 'error' : 'success'} variant="outlined" />;
  };

  const studentLabel = (s) => {
    if (!s) return '—';
    const name = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');
    return s.admissionNumber ? `${name} (${s.admissionNumber})` : name;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Correction History{assessment?.name ? ` — ${assessment.name}` : ''}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : !corrections || corrections.length === 0 ? (
          <Typography color="text.secondary">
            No mark corrections have been recorded for this assessment.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Old</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>New</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Corrected By</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Changed At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {corrections.map((c) => (
                  <TableRow key={c._id} hover>
                    <TableCell>{studentLabel(c.student)}</TableCell>
                    <TableCell>{renderScore(c.oldScore, c.oldEntered)}</TableCell>
                    <TableCell>{renderScore(c.newScore, c.newEntered)}</TableCell>
                    <TableCell>{c.reason || '—'}</TableCell>
                    <TableCell>
                      {c.correctedBy ? `${c.correctedBy.firstName} ${c.correctedBy.lastName}` : '—'}
                    </TableCell>
                    <TableCell>{new Date(c.correctedAt).toLocaleString()}</TableCell>
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

export default CorrectionsDialog;
