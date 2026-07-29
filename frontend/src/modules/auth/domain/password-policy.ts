export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export const validateStrongPassword = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must contain at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[!@#$%^&*]/.test(password)) return 'Password must include one of !@#$%^&*.';
  return null;
};
