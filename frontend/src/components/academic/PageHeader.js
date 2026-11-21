import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const PageHeader = ({ title, onAdd, addLabel = 'Add New', canAdd = true }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
    <Typography variant="h5" fontWeight={600}>{title}</Typography>
    {canAdd && onAdd && (
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
        {addLabel}
      </Button>
    )}
  </Box>
);

export default PageHeader;
