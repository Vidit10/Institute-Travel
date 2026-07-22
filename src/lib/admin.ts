// Admin access is env-driven, not a database role — keeps it out of the User
// schema entirely and lets it be changed via a redeploy without a migration.
// Comma-separated so it can grow past one address without a code change.
function adminEmailSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmailSet().has(email.toLowerCase());
}
