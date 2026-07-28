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
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function validateLogin(input: LoginInput): FormErrors<LoginInput> {
  const errors: FormErrors<LoginInput> = {};
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = "Email không đúng định dạng.";
  }
  if (!input.password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  }
  return errors;
}

export function validateRegistration(
  input: RegistrationInput,
): FormErrors<RegistrationInput> {
  const errors: FormErrors<RegistrationInput> = {
    ...validateLogin(input),
  };

  if (!input.displayName.trim()) {
    errors.displayName = "Vui lòng nhập tên hiển thị.";
  }
  if (!STRONG_PASSWORD_PATTERN.test(input.password)) {
    errors.password =
      "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và ký tự đặc biệt.";
  }
  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = "Mật khẩu xác nhận không trùng khớp.";
  }
  return errors;
}

export function mapAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email hoặc mật khẩu không chính xác.",
    "auth/invalid-email": "Email không đúng định dạng.",
    "auth/email-already-in-use": "Email này đã được sử dụng.",
    "auth/weak-password": "Mật khẩu chưa đạt yêu cầu bảo mật.",
    "auth/network-request-failed":
      "Không thể kết nối Firebase. Vui lòng kiểm tra mạng.",
    "permission-denied": "Tài khoản không có quyền thực hiện thao tác này.",
  };
  return messages[code] ?? "Không thể xác thực. Vui lòng thử lại.";
}
