import { createTheme } from '@mui/material/styles';

export const GREEN = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
  800: '#115e59',
  900: '#134e4a',
};

export const theme = createTheme({
  palette: {
    primary: { main: GREEN[600], dark: GREEN[700], light: GREEN[400], contrastText: '#ffffff' },
    secondary: { main: GREEN[50], dark: GREEN[100], contrastText: GREEN[800] },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e2e8f0',
    success: { main: '#059669', light: '#d1fae5' },
    error: { main: '#dc2626', light: '#fee2e2' },
    warning: { main: '#d97706', light: '#fef3c7' },
    info: { main: '#0284c7', light: '#e0f2fe' },
  },
  typography: {
    fontFamily: '"Inter", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 800, color: '#0f172a' },
    h2: { fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' },
    h3: { fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' },
    h4: { fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' },
    h5: { fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' },
    h6: { fontSize: '1rem', fontWeight: 600, color: '#0f172a' },
    body1: { fontSize: '0.95rem', color: '#334155' },
    body2: { fontSize: '0.875rem', color: '#64748b' },
    button: { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, padding: '8px 16px', fontWeight: 600, boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)' } },
        containedPrimary: { background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', '&:hover': { background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' } },
        containedSecondary: { backgroundColor: '#ccfbf1', color: '#115e59', '&:hover': { backgroundColor: '#99f6e4' } },
        outlined: { border: '1px solid #0d9488', color: '#0d9488', '&:hover': { border: '1px solid #0f766e', backgroundColor: '#f0fdfa' } },
        outlinedSecondary: { border: '1px solid #5eead4', color: '#0d9488', '&:hover': { border: '1px solid #0d9488', backgroundColor: '#f0fdfa' } },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)', '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)' } } },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' } },
    },
    MuiTextField: {
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8, backgroundColor: '#ffffff', '& fieldset': { borderColor: '#cbd5e1' }, '&:hover fieldset': { borderColor: '#0d9488' }, '&.Mui-focused fieldset': { borderColor: '#0d9488', borderWidth: 2 } } } },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: '#ffffff', color: '#0f172a', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', width: 260 } },
    },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: 8, margin: '4px 8px', color: '#64748b', '&:hover': { backgroundColor: '#f1f5f9', color: '#0d9488' }, '&.Mui-selected': { backgroundColor: '#d1fae5', color: '#0d9488', fontWeight: 600, '&:hover': { backgroundColor: '#99f6e4' } } } },
    },
    MuiAvatar: {
      styleOverrides: { root: { backgroundColor: '#0d9488', color: '#ffffff' } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 8 }, filledSuccess: { backgroundColor: '#d1fae5', color: '#0f766e' }, filledError: { backgroundColor: '#fee2e2', color: '#991b1b' }, filledInfo: { backgroundColor: '#e0f2fe', color: '#0369a1' } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, height: 8 }, bar: { borderRadius: 4 }, colorPrimary: { backgroundColor: '#2dd4bf' } },
    },
    MuiTableCell: {
      styleOverrides: { head: { backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '2px solid #e2e8f0' }, body: { fontSize: '0.9rem', color: '#334155', borderBottom: '1px solid #f1f5f9' } },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: '#f0fdfa' } }, head: { height: 56 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 }, sizeSmall: { height: 24, fontSize: '0.75rem' } },
    },
  },
});

export default theme;