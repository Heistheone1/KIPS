import {
  Drawer, Box, Typography, IconButton, Button, CircularProgress, Alert, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const FormDrawer = ({ open, onClose, title, subtitle, onSubmit, loading, error, children, submitLabel = 'Save', submitIcon, extraActions, submitDisabled = false, accentColor = '#2563eb' }) => (
  <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        width: { xs: '100vw', sm: 480 },
        borderRadius: '16px 0 0 16px',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
      },
    }}
  >
    {/* Header */}
    <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
      <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8', mt: 0.25 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>

    {/* Body */}
    <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.82rem' }}>{error}</Alert>
      )}
      {children}
    </Box>

    {/* Footer */}
    <Divider />
    <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', alignItems: 'center' }}>
      {extraActions}
      <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 2, color: '#64748b', fontWeight: 600 }}>
        Cancel
      </Button>
      <Button
        onClick={onSubmit}
        variant="contained"
        disabled={loading || submitDisabled}
        endIcon={!loading && submitIcon ? submitIcon : undefined}
        sx={{
          borderRadius: 2, px: 3, fontWeight: 700,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          boxShadow: `0 4px 12px ${accentColor}33`,
          '&:hover': { background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}aa)` },
        }}
      >
        {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : submitLabel}
      </Button>
    </Box>
  </Drawer>
);

export default FormDrawer;
