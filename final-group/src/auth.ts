export interface LoginInput {
  email: string;
  password: string;
}

export interface RegistrationInput extends LoginInput {
  displayName: string;
  confirmPassword: string;
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function validateLogin(input: LoginInput): FormErrors<LoginInput> {
  const errors: FormErrors<LoginInput> = {};
  if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = "Enter a valid email address.";
  if (!input.password) errors.password = "Enter your password.";
  return errors;
}

export function validateRegistration(input: RegistrationInput): FormErrors<RegistrationInput> {
  const errors: FormErrors<RegistrationInput> = { ...validateLogin(input) };
  if (!input.displayName.trim()) errors.displayName = "Enter a display name.";
  if (!STRONG_PASSWORD_PATTERN.test(input.password)) {
    errors.password = "Use at least 8 characters with upper- and lower-case letters plus a special character.";
  }
  if (input.confirmPassword !== input.password) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export function mapAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "This email address is already in use.",
    "auth/weak-password": "This password does not meet the security requirements.",
    "auth/network-request-failed": "Could not connect to Firebase. Check your network.",
    "permission-denied": "This account does not have permission for that action.",
  };
  return messages[code] ?? "Authentication failed. Try again.";
}
