import React, { useEffect, useMemo, useState } from "react";
import { buildProfileImageUrl } from "../../utils/profileImageUrl.js";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

/**
 * Teacher-facing avatar: student profile photo or initial on gradient (matches .student-avatar).
 */
export default function StudentAvatar({ profileImage, name, className = "student-avatar" }) {
  const [broken, setBroken] = useState(false);
  const url = useMemo(
    () => buildProfileImageUrl(API_HOST, profileImage),
    [profileImage]
  );
  const initial = (name || "S").trim()[0]?.toUpperCase() || "S";

  useEffect(() => {
    setBroken(false);
  }, [profileImage]);

  return (
    <div className={className}>
      {url && !broken ? (
        <img
          src={url}
          alt=""
          className="student-avatar-img"
          onError={() => setBroken(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
