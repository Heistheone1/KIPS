import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Alert, Chip, Button, Typography, Stack, CircularProgress, Link, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PublishIcon from '@mui/icons-material/Publish';
import BlockIcon from '@mui/icons-material/Block';
import {
  fetchReportDetail, fetchReportVersions, fetchReportVersion,
  reviewReport, approveReport, publishReport, invalidateReport,
} from '../../../redux/reportRelated/reportHandle';
import { reportReset } from '../../../redux/reportRelated/reportSlice';
import ReportCardDocument from '../../../components/academic/ReportCardDocument';

const STATUS_COLORS = {
  GENERATED: 'info', REVIEWED: 'secondary', APPROVED: 'primary', PUBLISHED: 'success',
};

const BASE_PATH_BY_ROLE = { ADMIN: 'admin', DOS: 'dos', CLASS_TEACHER: 'class-teacher', TEACHER: 'teacher' };

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

const ReportCardDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { reportDetail, reportVersion, reportVersions, loading, error, success } = useSelector((s) => s.report);
  const { currentRole } = useSelector((s) => s.user);
  const [viewingVersion, setViewingVersion] = useState(null);
  const [noteDialog, setNoteDialog] = useState(null);
  const [note, setNote] = useState('');

  const canReview = ['ADMIN', 'DOS', 'CLASS_TEACHER'].includes(currentRole);
  const canApprovePublish = ['ADMIN', 'DOS'].includes(currentRole);

  useEffect(() => {
    if (!id) return;
    setViewingVersion(null);
    dispatch(fetchReportDetail(id));
    dispatch(fetchReportVersions(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => dispatch(reportReset()), 2500);
      return () => clearTimeout(t);
    }
  }, [success, dispatch]);

  useEffect(() => {
    if (!id || !viewingVersion) return;
    dispatch(fetchReportVersion(id, viewingVersion));
  }, [id, viewingVersion, dispatch]);

  const card = reportDetail?.card;
  const currentVersion = reportDetail?.version;

  // When a historical version is selected, render that exact snapshot fetched
  // from /reports/:id/versions/:version — never the current payload.
  const isHistorical = Boolean(viewingVersion) && currentVersion
    && reportVersion && String(reportVersion.version) !== String(currentVersion.version);
  const renderedVersion = isHistorical ? reportVersion : currentVersion;

  const handlePrint = () => {
    document.body.classList.add('printing-report');
    const cleanup = () => document.body.classList.remove('printing-report');
    // afterprint fires after the print dialog closes (including Save as PDF)
    window.addEventListener('afterprint', cleanup, { once: true });
    // fallback cleanup in case afterprint doesn't fire
    setTimeout(cleanup, 30000);
    window.print();
  };

  const reload = () => {
    setViewingVersion(null);
    dispatch(fetchReportDetail(id));
    dispatch(fetchReportVersions(id));
  };

  const doAction = (action) => {
    if (action === 'publish') {
      dispatch(publishReport(id, reload));
    } else {
      setNoteDialog(action);
      setNote('');
    }
  };

  const submitNote = () => {
    if (!noteDialog) return;
    const done = () => { setNoteDialog(null); setNote(''); reload(); };
    if (noteDialog === 'review') dispatch(reviewReport(id, note, done));
    else if (noteDialog === 'approve') dispatch(approveReport(id, note, done));
    else if (noteDialog === 'invalidate') dispatch(invalidateReport(id, note, done));
    else done();
  };

  const statusChip = useMemo(() => {
    if (!card) return null;
    return (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip label={card.status} color={STATUS_COLORS[card.status] || 'default'} size="small" />
        <Chip label={`Version ${card.currentVersion}`} size="small" variant="outlined" />
        {card.isStale && <Chip label="STALE" color="warning" size="small" />}
        {card.resultType && <Chip label={card.resultType} size="small" variant="outlined" />}
      </Stack>
    );
  }, [card]);
  if (loading && !card) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
    );
  }

  if (error && !card) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={() => dispatch(reportReset())}>{error}</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
      </Box>
    );
  }

  if (!card || !renderedVersion) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Report not found or no version available.</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
      </Box>
    );
  }

  const payload = renderedVersion.payload;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
        <Typography variant="h5" fontWeight={600} sx={{ flexGrow: 1 }}>Report Card</Typography>
        {!isHistorical && !card.isStale && canReview && card.status === 'GENERATED' && (
          <Button variant="outlined" color="secondary" startIcon={<RateReviewIcon />}
            onClick={() => doAction('review')} disabled={loading}>
            Review
          </Button>
        )}
        {!isHistorical && !card.isStale && canApprovePublish && card.status === 'REVIEWED' && (
          <Button variant="outlined" startIcon={<CheckCircleIcon />}
            onClick={() => doAction('approve')} disabled={loading}>
            Approve
          </Button>
        )}
        {!isHistorical && !card.isStale && canApprovePublish && card.status === 'APPROVED' && (
          <Button variant="outlined" color="success" startIcon={<PublishIcon />}
            onClick={() => doAction('publish')} disabled={loading}>
            Publish
          </Button>
        )}
        {!isHistorical && canApprovePublish && card.status === 'PUBLISHED' && (
          <Button variant="outlined" color="error" startIcon={<BlockIcon />}
            onClick={() => doAction('invalidate')} disabled={loading}>
            Invalidate
          </Button>
        )}
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
          Print / Save as PDF
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(reportReset())}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {card.isStale && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This report is STALE — underlying marks or academic configuration changed. Regenerate the
          authoritative results, generate a new report version, and complete review &amp; approval
          before it can be published again. The previously published version below is preserved.
        </Alert>
      )}
      {payload.status !== 'COMPLETE' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This report is INCOMPLETE — one or more subject results are missing. Positions and
          averages reflect only the subjects that are complete.
        </Alert>
      )}
      {card.status !== 'PUBLISHED' && !card.isStale && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This report is <strong>{card.status}</strong> and not yet published. It can only be shared
          after it passes review and approval.
        </Alert>
      )}
      {isHistorical && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Viewing historical <strong>v{renderedVersion.version}</strong> — the exact snapshot recorded
          for that lifecycle step. Switch back to the current version to see the latest.
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
        {statusChip}
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Version:</Typography>
          <Chip
            label={`v${card.currentVersion} (current)`}
            color={viewingVersion ? 'default' : 'primary'}
            variant={viewingVersion ? 'outlined' : 'filled'}
            size="small"
            onClick={() => setViewingVersion(null)}
            clickable
          />
          {reportVersions.map((v) => (
            <Chip
              key={v.version}
              label={`v${v.version} · ${v.status}`}
              size="small"
              variant={String(viewingVersion) === String(v.version) ? 'filled' : 'outlined'}
              color={STATUS_COLORS[v.status] || 'default'}
              onClick={() => setViewingVersion(v.version)}
              clickable
            />
          ))}
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Single authoritative render shared by screen and PDF/print */}
      <ReportCardDocument payload={payload} card={isHistorical ? { status: renderedVersion.status, currentVersion: renderedVersion.version, isStale: false } : card} />

      <Box className="no-print" sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" component="div">
          Generated {fmtDate(card.generatedAt)}
          {card.reviewedAt ? ` · Reviewed ${fmtDate(card.reviewedAt)}` : ''}
          {card.approvedAt ? ` · Approved ${fmtDate(card.approvedAt)}` : ''}
          {card.publishedAt ? ` · Published ${fmtDate(card.publishedAt)}` : ''}
          {card.invalidatedAt ? ` · Invalidated ${fmtDate(card.invalidatedAt)} (${card.invalidationReason || 'no reason'})` : ''}
        </Typography>
      </Box>
      <Box className="no-print" sx={{ mt: 1 }}>
        <Link component="button" variant="body2"
          onClick={() => navigate(`/${BASE_PATH_BY_ROLE[currentRole] || 'admin'}/reports`)}>
          Back to all reports
        </Link>
      </Box>

      <Dialog open={Boolean(noteDialog)} onClose={() => setNoteDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {noteDialog === 'review' && 'Review Report'}
          {noteDialog === 'approve' && 'Approve Report'}
          {noteDialog === 'invalidate' && 'Invalidate Published Report'}
        </DialogTitle>
        <DialogContent>
          {noteDialog === 'invalidate' && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              Invalidating flags this published report stale. Correct the underlying data, recalculate,
              regenerate, review and approve a new version before publishing again. The published
              version below is preserved.
            </Alert>
          )}
          <TextField
            autoFocus margin="dense" fullWidth multiline minRows={2}
            label={noteDialog === 'invalidate' ? 'Reason (optional)' : 'Note (optional)'}
            value={note} onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(null)}>Cancel</Button>
          <Button variant="contained" disabled={loading}
            color={noteDialog === 'invalidate' ? 'error' : 'primary'}
            onClick={submitNote}>
            {noteDialog === 'invalidate' ? 'Invalidate' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportCardDetailPage;
