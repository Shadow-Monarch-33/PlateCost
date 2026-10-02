export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Display name is required.";
  if (trimmed.length > 50) return "Display name cannot exceed 50 characters.";
  return null;
}

export function validateSignupPayload(
  displayName: string,
  email: string,
  password: string,
  confirmPassword?: string
): string | null {
  const nameError = validateDisplayName(displayName);
  if (nameError) return nameError;

  if (!email.trim()) return "Email is required.";
  if (!password) return "Password is required.";
  if (confirmPassword !== undefined && !confirmPassword) return "Confirm password is required.";
  if (confirmPassword !== undefined && password !== confirmPassword) return "Passwords do not match.";
  if (password.length < 6) return "Password must be at least 6 characters.";

  return null;
}
