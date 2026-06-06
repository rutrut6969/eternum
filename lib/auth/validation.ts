export const usernamePattern = /^[A-Za-z0-9_]+$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordRule = {
  id: "length" | "uppercase" | "number" | "symbol";
  label: string;
  valid: boolean;
};

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 24) {
    return { valid: false, message: "Username must be 3-24 characters." };
  }
  if (!usernamePattern.test(trimmed)) {
    return { valid: false, message: "Use only letters, numbers, and underscores." };
  }
  return { valid: true, message: "Username available." };
}

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { id: "length", label: "At least 8 characters", valid: password.length >= 8 },
    { id: "uppercase", label: "At least 1 uppercase letter", valid: /[A-Z]/.test(password) },
    { id: "number", label: "At least 1 number", valid: /\d/.test(password) },
    { id: "symbol", label: "At least 1 symbol", valid: /[^A-Za-z0-9]/.test(password) }
  ];
}

export function validatePassword(password: string) {
  const rules = getPasswordRules(password);
  const failed = rules.find((rule) => !rule.valid);
  if (failed) return { valid: false, message: failed.label };
  return { valid: true, message: "Password meets all requirements." };
}

export function validateEmailFormat(email: string) {
  return emailPattern.test(email.trim());
}
