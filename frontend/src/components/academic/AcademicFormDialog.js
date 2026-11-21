import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert,
} from '@mui/material';

const AcademicFormDialog = ({ open, onClose, title, onSubmit, loading, error, children }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent dividers>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {children}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>Cancel</Button>
      <Button onClick={onSubmit} variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Save'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default AcademicFormDialog;
