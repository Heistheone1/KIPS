/**
 * KIPS-SMS — Form validation utilities
 *
 * Provides client-side validation rules and error messages for the login form.
 * All rules are intentionally strict: they validate shape/format but never
 * leak whether an account exists (generic failure messages are handled by
 * the auth slice / API response).
 */

// Minimum password length accepted at login. Kept low enough to allow the
// configured demo accounts while still enforcing a real password policy.
export const MIN_PASSWORD_LENGTH = 6;

// Email regex — allows common local-part characters, a single @, and a domain
// with at least one dot and a 2+ character TLD.
export const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * Validate an email address.
 * Returns null when valid, otherwise a user-facing error message string.
 */
export const validateEmail = (value) => {
  if (!value || !String(value).trim()) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(String(value).trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
};

/**
 * Validate a password at login time.
 * Returns null when valid, otherwise a user-facing error message string.
 */
export const validatePassword = (value) => {
  if (!value || value.length === 0) {
    return 'Password is required.';
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
};

/**
 * Build a validation error map from field values.
 * Keys are field names; values are error strings (or null when valid).
 */
export const validateLoginForm = ({ email, password }) => {
  const errors = {};
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  return errors;
};

/**
 * Return true when the error map is empty (form is valid).
 */
export const hasValidationErrors = (errors) => {
  return Object.values(errors).some(Boolean);
};