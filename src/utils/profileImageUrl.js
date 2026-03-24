/**
 * Build absolute URL for a stored profile image path (or full URL).
 */
export function buildProfileImageUrl(apiBase, path) {
  const base = String(apiBase || "").replace(/\/$/, "");
  const p = String(path || "").trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/")) return `${base}${p}`;
  return `${base}/${p}`;
}
