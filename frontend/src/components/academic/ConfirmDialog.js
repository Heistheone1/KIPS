import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const ConfirmDialog = ({ open, onClose, onConfirm, title, message }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography>{message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} variant="contained" color="warning">Confirm</Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
