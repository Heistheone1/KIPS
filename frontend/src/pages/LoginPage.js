import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, TextField, Typography, IconButton, InputAdornment,
  CircularProgress, Avatar, FormControlLabel, Checkbox,
  Alert, LinearProgress, Stack, Chip, Divider,
} from '@mui/material';
import {
  Visibility, VisibilityOff, LockOpen, SchoolOutlined,
  PeopleAltOutlined, AssessmentOutlined, NotificationsActiveOutlined,
} from '@mui/icons-material';
import { loginUser } from '../redux/userRelated/userHandle';
import { underControl } from '../redux/userRelated/userSlice';
import { validateLoginForm, hasValidationErrors } from '../utils/validation';
import logo from '../assets/logo.png';

const DEMO_CREDS = [
  { label: 'Admin',   email: 'admin@kipsschool.ac', password: 'KipsAdmin2024!' },
  { label: 'Teacher', email: 'teacher@kipsschool.ac', password: 'KipsAdmin2024!' },
];

const FEATURES = [
  { icon: <PeopleAltOutlined />, text: 'Manage students & staff effortlessly' },
  { icon: <AssessmentOutlined />, text: 'Real-time performance analytics' },
  { icon: <NotificationsActiveOutlined />, text: 'Instant attendance & notifications' },
  { icon: <SchoolOutlined />, text: 'Role-based dashboards for everyone' },
];

const strengthMeta = (pw) => {
  if (!pw) return { score: 0, label: '', color: '#ccc' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: 'Weak', color: '#ef5350' },
    { label: 'Weak', color: '#ef5350' },
    { label: 'Fair', color: '#ffa726' },
    { label: 'Good', color: '#66bb6a' },
    { label: 'Strong', color: '#26a69a' },
  ];
  return { score: s, ...map[s] };
};

export default function LoginPage() {
  const dispatch = useDispatch();
  const { status, response, error } = useSelector((s) => s.user);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loader, setLoader] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [activeDemo, setActiveDemo] = useState(null);

  const setField = (name, val) => {
    setForm((p) => ({ ...p, [name]: val }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
    if (serverError) setServerError(null);
  };

  const handleBlur = (name) => {
    setTouched((p) => ({ ...p, [name]: true }));
    setErrors(validateLoginForm(form));
  };

  const fillDemo = useCallback((cred, idx) => {
    setForm({ email: cred.email, password: cred.password });
    setErrors({});
    setTouched({ email: true, password: true });
    setServerError(null);
    setActiveDemo(idx);
  }, []);

  useEffect(() => {
    if (status === 'success') {
      // Navigation is handled by PublicRoute in App.js — just reset status
      dispatch(underControl());
      setLoader(false);
    } else if (status === 'failed') {
      setServerError(response || 'Invalid credentials. Please try again.');
      setLoader(false);
    } else if (status === 'error') {
      setServerError(error || 'Network error. Please try again later.');
      setLoader(false);
    }
  }, [status, response, error, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateLoginForm(form);
    setErrors(errs);
    setTouched({ email: true, password: true });
    if (hasValidationErrors(errs)) return;
    setServerError(null);
    setLoader(true);
    dispatch(loginUser({ email: form.email.trim(), password: form.password }));
  };

  const { score, label: strengthLabel, color: strengthColor } = strengthMeta(form.password);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 48%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          px: 7,
          py: 6,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #000693 0%, #270843 55%, #0a0a2e 100%)',
        }}
      >
        {/* decorative blobs */}
        <Box sx={{
          position: 'absolute', top: -80, right: -80, width: 320, height: 320,
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -60, left: -60, width: 260, height: 260,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
        }} />
        <Box sx={{
          position: 'absolute', top: '40%', right: '10%', width: 140, height: 140,
          borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
        }} />

        {/* logo + brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5, zIndex: 1 }}>
          <Avatar src={logo} alt="KIPS" sx={{ width: 52, height: 52, border: '2px solid rgba(255,255,255,0.3)' }} />
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem', lineHeight: 1.1 }}>
              KIPS-SMS
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              School Management
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: { md: '2rem', lg: '2.4rem' }, lineHeight: 1.25, mb: 2, zIndex: 1 }}>
          Transform your<br />
          <Box component="span" sx={{ color: '#a78bfa' }}>school's future</Box><br />
          today.
        </Typography>

        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', mb: 5, maxWidth: 360, lineHeight: 1.7, zIndex: 1 }}>
          One platform for admins, teachers, and students — built for clarity, speed, and growth.
        </Typography>

        <Stack spacing={2.5} sx={{ zIndex: 1, width: '100%', maxWidth: 380 }}>
          {FEATURES.map((f, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#a78bfa', flexShrink: 0,
              }}>
                {f.icon}
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem' }}>
                {f.text}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box sx={{
          mt: 6, zIndex: 1, display: 'flex', gap: 4,
          borderTop: '1px solid rgba(255,255,255,0.1)', pt: 4, width: '100%', maxWidth: 380,
        }}>
          {[['500+', 'Students'], ['50+', 'Teachers'], ['99%', 'Uptime']].map(([val, lbl]) => (
            <Box key={lbl}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.4rem' }}>{val}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{lbl}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── RIGHT PANEL ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f9ff',
          px: { xs: 2, sm: 4 },
          py: 4,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>

          {/* mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Avatar src={logo} alt="KIPS" sx={{ width: 40, height: 40 }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#000693' }}>KIPS-SMS</Typography>
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#0f0f1a', mb: 0.5 }}>
            Welcome back 👋
          </Typography>
          <Typography sx={{ color: '#6b7280', fontSize: '0.9rem', mb: 3.5 }}>
            Sign in to your school account to continue
          </Typography>

          {serverError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{serverError}</Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>

              <TextField
                fullWidth
                label="Email address"
                type="email"
                autoComplete="email"
                autoFocus
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                error={Boolean(touched.email && errors.email)}
                helperText={touched.email && errors.email}
                sx={fieldSx}
              />

              <Box>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  error={Boolean(touched.password && errors.password)}
                  helperText={touched.password && errors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw((v) => !v)} edge="end" size="small">
                          {showPw ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={fieldSx}
                />
                {form.password && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(score / 4) * 100}
                      sx={{
                        flex: 1, height: 5, borderRadius: 3,
                        bgcolor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': { bgcolor: strengthColor, borderRadius: 3 },
                      }}
                    />
                    <Typography sx={{ fontSize: '0.72rem', color: strengthColor, fontWeight: 600, minWidth: 40 }}>
                      {strengthLabel}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: -1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={() => setRememberMe((v) => !v)}
                      size="small"
                      sx={{ color: '#000693', '&.Mui-checked': { color: '#000693' } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.85rem', color: '#374151' }}>Remember me</Typography>}
                />
                <Typography
                  component="a"
                  href="#"
                  sx={{ fontSize: '0.85rem', color: '#000693', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Forgot password?
                </Typography>
              </Box>

              <Box
                component="button"
                type="submit"
                disabled={loader}
                sx={{
                  width: '100%', py: 1.6, border: 'none', borderRadius: 3,
                  background: loader ? '#9ca3af' : 'linear-gradient(135deg, #000693 0%, #270843 100%)',
                  color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                  cursor: loader ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  transition: 'all 0.2s',
                  boxShadow: loader ? 'none' : '0 4px 20px rgba(0,6,147,0.35)',
                  '&:hover:not(:disabled)': { transform: 'translateY(-1px)', boxShadow: '0 6px 24px rgba(0,6,147,0.45)' },
                  '&:active:not(:disabled)': { transform: 'translateY(0)' },
                }}
              >
                {loader
                  ? <CircularProgress size={20} thickness={3} sx={{ color: '#fff' }} />
                  : <><LockOpen sx={{ fontSize: 18 }} /> Sign In</>
                }
              </Box>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }}></Divider>

          <Stack direction="row" spacing={1}>
            {DEMO_CREDS.map((cred, i) => (
              <Chip
                key={cred.label}
                label={cred.label}
                onClick={() => fillDemo(cred, i)}
                variant={activeDemo === i ? 'filled' : 'outlined'}
                sx={{
                  flex: 1, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                  borderColor: '#000693', color: activeDemo === i ? '#fff' : '#000693',
                  bgcolor: activeDemo === i ? '#000693' : 'transparent',
                  '&:hover': { bgcolor: activeDemo === i ? '#07005b' : 'rgba(0,6,147,0.06)' },
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </Stack>

          <Typography sx={{ mt: 4, color: '#9ca3af', fontSize: '0.75rem', textAlign: 'center' }}>
            © {new Date().getFullYear()} KIPS-SMS · Secured with HttpOnly session cookies
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: '#fff',
    '& fieldset': { borderColor: '#e5e7eb' },
    '&:hover fieldset': { borderColor: '#000693' },
    '&.Mui-focused fieldset': { borderColor: '#000693', borderWidth: 2 },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#000693' },
};
