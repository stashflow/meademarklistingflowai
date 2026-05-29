export function isConfiguredAppAdmin(email?: string | null) {
  if (!email) return false;
  const admins = (process.env.LISTINGFLOW_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
