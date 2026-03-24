import React, { useEffect, useMemo, useState } from "react";
import { buildProfileImageUrl } from "../utils/profileImageUrl.js";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

/**
 * Circular avatar for admin user/teacher lists (profile image or initials).
 */
export default function AdminPersonAvatar({
  profileImage,
  name,
  size = 44,
  title,
  className = "",
}) {
  const [broken, setBroken] = useState(false);
  const url = useMemo(
    () => buildProfileImageUrl(API_HOST, profileImage),
    [profileImage]
  );

  useEffect(() => {
    setBroken(false);
  }, [profileImage]);

  const initials = useMemo(() => {
    const n = String(name || "?").trim();
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "?";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [name]);

  const px = Math.max(32, Math.min(96, Number(size) || 44));

  return (
    <span
      className={`admin-person-avatar ${className}`.trim()}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
      title={title || name || ""}
    >
      {url && !broken ? (
        <img
          src={url}
          alt=""
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="admin-person-avatar__initials">{initials}</span>
      )}
    </span>
  );
}
