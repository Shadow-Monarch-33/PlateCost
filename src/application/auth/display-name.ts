export function getSafeDisplayName(
  displayName: string | undefined | null,
  email: string | undefined | null
): string {
  if (displayName && displayName.trim() !== "") {
    return displayName.trim();
  }
  if (email && email.includes("@")) {
    return email.split("@")[0] || "User";
  }
  return "User";
}
