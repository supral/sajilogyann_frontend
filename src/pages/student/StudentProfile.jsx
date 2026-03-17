// src/pages/student/StudentProfile.jsx  (REPLACE THIS WHOLE FILE)
// ✅ FIX: Full certificate downloads (no crop / no blank page)
// ✅ FIX: Removes the weird dotted/-- meta line by not rendering placeholders
// ✅ Keeps your existing logic intact

import React, { useEffect, useMemo, useRef, useState } from "react";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import "../../styles/StudentProfile.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const SYSTEM_NAME = "Sajilo Gyann";
const CERT_MIN_SCORE = 50;

// Your backend certificate routes
const CERT_ENDPOINT_ISSUE = "/api/v1/certificates/issue";
const CERT_ENDPOINT_ME = "/api/v1/certificates/me";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

// ✅ keep safeStr but don't use it for program/semester display
const safeStr = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

// ✅ treat placeholder values as EMPTY so they won't render
const cleanValue = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const lower = s.toLowerCase();

  const bad = new Set(["—", "-", "--", "n/a", "na", "null", "undefined"]);
  if (bad.has(s) || bad.has(lower)) return "";

  // if it's only punctuation/dashes/dots like "— — · · ·"
  if (/^[\s—\-•·.]+$/.test(s)) return "";

  return s;
};

const normalizePct = (val) => {
  if (val === null || val === undefined) return NaN;
  if (typeof val === "number") return val;
  const s = String(val).replace("%", "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const computeGPAFromPercentage = (pct) => {
  if (!Number.isFinite(pct)) return null;
  if (pct >= 90) return 4.0;
  if (pct >= 80) return 3.6;
  if (pct >= 70) return 3.2;
  if (pct >= 60) return 2.8;
  if (pct >= 50) return 2.4;
  return 0.0;
};

const formatGPA = (gpa) => {
  if (gpa === null || gpa === undefined) return "—";
  return Number(gpa).toFixed(2);
};

const gpaLetterFromPoints = (gpa) => {
  if (!Number.isFinite(gpa)) return "—";
  if (gpa >= 3.6) return "A";
  if (gpa >= 3.2) return "B+";
  if (gpa >= 2.8) return "B";
  if (gpa >= 2.4) return "C+";
  if (gpa > 0) return "C";
  return "F";
};

// ✅ only accept real ObjectId, else null
const oidOrNull = (v) => {
  const s = String(v ?? "").trim();
  return /^[a-fA-F0-9]{24}$/.test(s) ? s : null;
};

const StudentProfile = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [marks, setMarks] = useState([]);
  const [, setSubscriptionHistory] = useState([]);
  const [recentMcqs, setRecentMcqs] = useState([]);

  // ✅ DB certificates
  const [dbCertsLoading, setDbCertsLoading] = useState(false);
  const [dbCertificates, setDbCertificates] = useState([]); // normalized

  const [activeCertKey, setActiveCertKey] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [issuingCourseKey, setIssuingCourseKey] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveErr, setProfileSaveErr] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    gender: "",
    fatherName: "",
    motherName: "",
    dob: "",
    department: "",
    bio: "",
    experience: "",
  });

  const certRefs = useRef({});
  const didAutoIssueRef = useRef(false);

  const token = getToken();

  const authHeaders = useMemo(
    () =>
      token
        ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
        : { Accept: "application/json" },
    [token]
  );

  const authHeadersJson = useMemo(() => {
    const base = { ...authHeaders };
    base["Content-Type"] = "application/json";
    return base;
  }, [authHeaders]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(`${API_HOST}/api/v1/students/me/profile`, {
          headers: authHeaders,
        });

        const data = await safeJson(res);

        if (!res.ok) {
          throw new Error(data?.message || `Request failed (${res.status})`);
        }

        const p = data?.profile || null;

        const joinedRaw =
          p?.joinedOn ||
          p?.joinedAt ||
          p?.enrolledAt ||
          p?.createdAt ||
          p?.created_on ||
          p?.created ||
          null;

        const joinedOn = joinedRaw ? new Date(joinedRaw).toLocaleDateString() : "";

        setProfile(p ? { ...p, joinedOn } : null);
        setEditForm({
          name: p?.name ?? "",
          phone: p?.phone ?? "",
          address: p?.address ?? "",
          gender: p?.gender ?? "",
          fatherName: p?.fatherName ?? "",
          motherName: p?.motherName ?? "",
          dob: p?.dob ? (typeof p.dob === "string" ? p.dob.slice(0, 10) : new Date(p.dob).toISOString().slice(0, 10)) : "",
          department: p?.department ?? "",
          bio: p?.bio ?? "",
          experience: p?.experience ?? "",
        });

        setEnrolledCourses(Array.isArray(data?.enrolledCourses) ? data.enrolledCourses : []);
        setMarks(Array.isArray(data?.marks) ? data.marks : []);
        setSubscriptionHistory(
          Array.isArray(data?.subscriptionHistory) ? data.subscriptionHistory : []
        );
        setRecentMcqs(Array.isArray(data?.recentMcqs) ? data.recentMcqs : []);
      } catch (e) {
        setErr(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authHeaders]);

  const profileImageUrl = useMemo(() => {
    const path = profile?.profileImage || "";
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return path.startsWith("/") ? `${API_HOST}${path}` : `${API_HOST}/${path}`;
  }, [profile?.profileImage]);

  const saveProfile = async () => {
    if (!token) return;
    setProfileSaveErr("");
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("name", (editForm.name || "").trim());
      formData.append("phone", editForm.phone || "");
      formData.append("address", editForm.address || "");
      formData.append("gender", editForm.gender || "");
      formData.append("fatherName", editForm.fatherName || "");
      formData.append("motherName", editForm.motherName || "");
      formData.append("dob", editForm.dob || "");
      formData.append("department", editForm.department || "");
      formData.append("bio", editForm.bio || "");
      formData.append("experience", editForm.experience || "");
      if (profileImageFile) formData.append("profileImage", profileImageFile);

      const res = await fetch(`${API_HOST}/api/v1/students/me/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to update profile");

      const updated = data?.profile || data;
      setProfile((prev) => (prev ? { ...prev, ...updated, joinedOn: prev.joinedOn } : { ...updated }));
      setProfileImageFile(null);
      setEditOpen(false);

      const forStorage = {
        ...(JSON.parse(localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user") || "{}")),
        name: updated.name,
        email: updated.email,
        profileImage: updated.profileImage || "",
        phone: updated.phone,
        address: updated.address,
        gender: updated.gender,
        fatherName: updated.fatherName,
        motherName: updated.motherName,
        dob: updated.dob,
        department: updated.department,
        bio: updated.bio,
        experience: updated.experience,
      };
      if (localStorage.getItem("bs_token")) localStorage.setItem("bs_user", JSON.stringify(forStorage));
      if (sessionStorage.getItem("bs_token")) sessionStorage.setItem("bs_user", JSON.stringify(forStorage));
      window.dispatchEvent(new CustomEvent("bs-user-updated", { detail: forStorage }));
    } catch (e) {
      setProfileSaveErr(e?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const student = useMemo(
    () =>
      profile || {
        name: "Student",
        email: "",
        program: "",
        semester: "",
        studentId: "",
        joinedOn: "",
        _id: "",
        id: "",
      },
    [profile]
  );

  // ✅ show studentId if exists else fallback to _id (so ID never becomes blank)
  const displayId = useMemo(() => {
    return (
      cleanValue(student?.studentId) ||
      cleanValue(student?._id) ||
      cleanValue(student?.id) ||
      ""
    );
  }, [student]);

  const metaLine = useMemo(() => {
    const program = cleanValue(student?.program);
    const semester = cleanValue(student?.semester);
    const idPart = displayId ? `ID: ${displayId}` : "";
    return [program, semester, idPart].filter(Boolean).join(" · ");
  }, [student, displayId]);

  const attemptCountMap = useMemo(() => {
    const map = new Map();
    for (const a of recentMcqs) {
      const key = `${String(a.courseId || a.courseName)}::${String(
        a.chapterId || a.chapterName
      )}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [recentMcqs]);

  const enrichedCourses = useMemo(() => {
    return enrolledCourses.map((c) => {
      const totalChapters = Number(c.totalChapters) > 0 ? Number(c.totalChapters) : null;
      const passedChaptersCount =
        Number(c.passedChaptersCount) >= 0 ? Number(c.passedChaptersCount) : null;

      let progressPercent = null;

      if (totalChapters && passedChaptersCount !== null) {
        progressPercent = Math.round((passedChaptersCount / totalChapters) * 100);
      } else {
        const fromStr = String(c.progress || "").replace("%", "").trim();
        const asNum = Number(fromStr);
        progressPercent = Number.isFinite(asNum) ? asNum : 0;
      }

      progressPercent = Math.max(0, Math.min(100, progressPercent));
      const status = progressPercent >= 100 ? "Completed" : "Ongoing";
      return { ...c, status, progressPercent };
    });
  }, [enrolledCourses]);

  const activeCount = enrichedCourses.filter((c) => c.status !== "Completed").length;

  const resolveUserId = () =>
    student?._id || student?.id || profile?._id || profile?.id || "";

  const resolveTeacherIdFromCourse = (mOrCourse) =>
    mOrCourse?.teacherId ||
    mOrCourse?.teacher ||
    mOrCourse?.createdBy ||
    mOrCourse?.instructorId ||
    "";

  const resolveCourseIdFromCourse = (mOrCourse) =>
    mOrCourse?.courseId || mOrCourse?._id || mOrCourse?.id || "";

  const resolveChapterIdFromMarksOrAttempts = (courseId) => {
    const a = (recentMcqs || []).find((x) => String(x.courseId) === String(courseId));
    return a?.chapterId || a?.lessonId || a?.chapter || a?.lesson || "";
  };

  const normalizeDbCert = (c) => {
    const courseId = oidOrNull(c?.courseId?._id || c?.courseId || "");
    const courseKey = courseId || String(c?._id || c?.certificateNo || Math.random());

    return {
      key: courseKey,
      courseId,
      certificateNo: safeStr(c?.certificateNo, "—"),
      issuedAt: c?.issuedAt || c?.createdAt || new Date().toISOString(),

      studentName: safeStr(c?.studentName || c?.student?.name || student?.name, "Student"),
      courseTitle: safeStr(
        c?.courseTitle || c?.course?.title || c?.courseName || c?.course,
        "Course"
      ),

      gpaLetter: safeStr(c?.gpaLetter || c?.gpa || c?.grade, "—"),
      gpaPointsText: safeStr(
        c?.gpaPointsText || (c?.gpaPoints != null ? String(c?.gpaPoints) : ""),
        "—"
      ),

      praiseLine:
        safeStr(c?.praiseLine, "") ||
        "with successful completion and admirable commitment.",

      stored: true,
      _raw: c,
    };
  };

  const loadDbCertificates = async () => {
    if (!token) return;
    setDbCertsLoading(true);
    try {
      const res = await fetch(`${API_HOST}${CERT_ENDPOINT_ME}`, { headers: authHeaders });
      const data = await safeJson(res);

      if (!res.ok) {
        console.warn("GET certificates/me failed:", data?.message || res.status);
        setDbCertificates([]);
        return;
      }

      const arr =
        Array.isArray(data?.certificates)
          ? data.certificates
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

      setDbCertificates(arr.map(normalizeDbCert));
    } catch (e) {
      console.warn("loadDbCertificates error:", e);
      setDbCertificates([]);
    } finally {
      setDbCertsLoading(false);
    }
  };

  useEffect(() => {
    loadDbCertificates();

  }, [token]);

  const dbByCourseId = useMemo(() => {
    const map = new Map();
    for (const c of dbCertificates) {
      if (c?.courseId) map.set(String(c.courseId), c);
    }
    return map;
  }, [dbCertificates]);

  const dbCourseIdSet = useMemo(() => new Set([...dbByCourseId.keys()]), [dbByCourseId]);

  const localCandidates = useMemo(() => {
    const issuedAt = new Date().toISOString();
    const studentName = safeStr(student?.name, "Student");
    const userId = oidOrNull(resolveUserId());

    return (marks || [])
      .map((m, idx) => {
        const courseTitle = safeStr(m.course || m.courseTitle || m.title, `Course ${idx + 1}`);
        const totalPct = normalizePct(m.total);
        const eligible = Number.isFinite(totalPct) && totalPct >= CERT_MIN_SCORE;

        const gpaPoints = computeGPAFromPercentage(totalPct);
        const gpaLetter = gpaLetterFromPoints(gpaPoints);

        const courseId = oidOrNull(resolveCourseIdFromCourse(m));
        const teacherId = oidOrNull(resolveTeacherIdFromCourse(m));
        const chapterId = oidOrNull(
          resolveChapterIdFromMarksOrAttempts(courseId) || m.chapterId || m.lessonId || ""
        );

        const praise =
          Number.isFinite(totalPct) && totalPct >= 85
            ? "with outstanding performance and excellent dedication."
            : Number.isFinite(totalPct) && totalPct >= 70
            ? "with strong performance and consistent effort."
            : "with successful completion and admirable commitment.";

        return {
          key: courseId || `TEMP-${idx}`,
          courseId,
          teacherId,
          chapterId,
          userId,

          certificateNo: "Not issued yet",
          issuedAt,

          studentName,
          courseTitle,
          gpaLetter,
          gpaPointsText: formatGPA(gpaPoints),
          praiseLine: praise,

          totalPercentage: Number.isFinite(totalPct) ? Number(totalPct) : null,
          gpaPoints: Number.isFinite(gpaPoints) ? Number(gpaPoints) : null,

          stored: false,
          passed: eligible,
        };
      })
      .filter((c) => c.passed && c.courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolveChapterIdFromMarksOrAttempts, resolveUserId are stable
  }, [marks, student, profile, recentMcqs]);

  const certificates = useMemo(() => {
    const merged = [];

    for (const cand of localCandidates) {
      const db = cand.courseId ? dbByCourseId.get(String(cand.courseId)) : null;
      merged.push(db || cand);
    }

    for (const db of dbCertificates) {
      const exists = localCandidates.some((c) => String(c.courseId) === String(db.courseId));
      if (!exists) merged.push(db);
    }

    merged.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    return merged;
  }, [dbByCourseId, dbCertificates, localCandidates]);

  const activeCert = useMemo(
    () => certificates.find((c) => String(c.key) === String(activeCertKey)) || null,
    [certificates, activeCertKey]
  );

  const issueCertificateToDb = async (certCandidate) => {
    if (!token) {
      alert("Please login again (token missing).");
      return;
    }

    const courseId = oidOrNull(certCandidate?.courseId);
    if (!courseId) {
      alert("courseId missing or invalid. Cannot issue certificate.");
      return;
    }

    if (dbCourseIdSet.has(String(courseId))) return;

    try {
      setIssuingCourseKey(String(courseId));

      const payload = {
        courseId,
        teacherId: oidOrNull(certCandidate.teacherId),
        chapterId: oidOrNull(certCandidate.chapterId),
        studentName: certCandidate.studentName,
        courseTitle: certCandidate.courseTitle,
        totalPercentage: certCandidate.totalPercentage,
        gpaLetter: certCandidate.gpaLetter,
        gpaPoints: certCandidate.gpaPoints,
        systemName: SYSTEM_NAME,
      };

      const res = await fetch(`${API_HOST}${CERT_ENDPOINT_ISSUE}`, {
        method: "POST",
        headers: authHeadersJson,
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.message || `Failed to store certificate (${res.status})`);
      }

      await loadDbCertificates();
      setActiveCertKey(String(courseId));
    } catch (e) {
      alert(e?.message || "Failed to store certificate in database");
    } finally {
      setIssuingCourseKey(null);
    }
  };

  // =========================
  // ✅ AUTO-ISSUE once
  // =========================
  useEffect(() => {
    if (loading) return;
    if (!token) return;
    if (didAutoIssueRef.current) return;

    if (!localCandidates || localCandidates.length === 0) {
      didAutoIssueRef.current = true;
      return;
    }

    const toIssue = localCandidates.filter((c) => !dbCourseIdSet.has(String(c.courseId)));
    if (toIssue.length === 0) {
      didAutoIssueRef.current = true;
      return;
    }

    (async () => {
      try {
        for (const c of toIssue) {
          // eslint-disable-next-line no-await-in-loop
          await issueCertificateToDb(c);
        }
      } catch (e) {
        console.warn("auto issue error:", e);
      } finally {
        didAutoIssueRef.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, localCandidates, dbCourseIdSet]);

  const isDbStoredByCourse = (cert) => {
    const cid = oidOrNull(cert?.courseId);
    return cid ? dbCourseIdSet.has(String(cid)) : false;
  };

  // =========================
  // ✅ FIXED: Download Certificate PDF (FULL IMAGE like preview)
  // =========================
  const downloadCertificate = async (cert) => {
    const key = String(cert?.key);
    const sourceEl = certRefs.current?.[key];

    if (!sourceEl) {
      alert("Certificate preview is not ready. Click Preview first, then Download.");
      return;
    }

    try {
      setDownloadingKey(key);

      // ✅ wait for fonts (prevents broken/cropped text)
      try {
        // eslint-disable-next-line no-unused-expressions
        await document.fonts?.ready;
      } catch {}

      // ✅ CLONE the cert into a hidden fixed-size stage so html2canvas captures FULL area
      const stage = document.createElement("div");
      stage.setAttribute("aria-hidden", "true");
      stage.style.position = "fixed";
      stage.style.left = "-10000px";
      stage.style.top = "0";
      stage.style.width = "1200px";
      stage.style.padding = "0";
      stage.style.margin = "0";
      stage.style.background = "#ffffff";
      stage.style.zIndex = "-1";

      const clone = sourceEl.cloneNode(true);

      // force predictable sizing (prevents crop)
      clone.style.width = "1200px";
      clone.style.height = "675px"; // 16:9
      clone.style.maxWidth = "none";
      clone.style.maxHeight = "none";
      clone.style.transform = "none";
      clone.style.overflow = "hidden";

      stage.appendChild(clone);
      document.body.appendChild(stage);

      // ✅ wait layout
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        windowHeight: 675,
      });

      document.body.removeChild(stage);

      const imgData = canvas.toDataURL("image/png", 1.0);

      // ✅ A4 Landscape export
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 18;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;

      const imgW = canvas.width;
      const imgH = canvas.height;

      const ratio = Math.min(maxW / imgW, maxH / imgH);
      const renderW = imgW * ratio;
      const renderH = imgH * ratio;

      const x = (pageW - renderW) / 2;
      const y = (pageH - renderH) / 2;

      pdf.addImage(imgData, "PNG", x, y, renderW, renderH, undefined, "FAST");

      const certNoSafe = String(cert.certificateNo || "CERT")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]+/g, "");

      const safeFile = `${certNoSafe}_${cert.studentName}_${cert.courseTitle}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]+/g, "");

      pdf.save(`${safeFile}.pdf`);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to download certificate");
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <>
      <StudentNavbar />

      <main className="profile-page">
        {/* ✅ hard override to kill any injected pseudo content */}
        <style>{`
          .profile-meta::before,
          .profile-meta::after,
          .profile-meta *::before,
          .profile-meta *::after{
            content: "" !important;
            display: none !important;
          }
        `}</style>

        {/* HEADER SECTION */}
        <section className="profile-header-card">
          <div className="profile-avatar">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="Profile" className="profile-avatar-img" />
            ) : (
              <span>{(student.name || "S").charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="profile-header-info">
            <h2>{student.name}</h2>
            <p className="profile-email">{student.email}</p>

            {metaLine ? <p className="profile-meta">{metaLine}</p> : null}

            {cleanValue(student?.joinedOn) ? (
              <p className="profile-joined">
                Enrolled on <strong>{student.joinedOn}</strong>
              </p>
            ) : null}

            {loading ? (
              <p className="sub-text" style={{ marginTop: 10 }}>
                Loading your data…
              </p>
            ) : err ? (
              <p className="sub-text" style={{ marginTop: 10, color: "crimson" }}>
                {err}
              </p>
            ) : null}

            <button
              type="button"
              className="profile-edit-btn"
              onClick={() => setEditOpen((o) => !o)}
              style={{ marginTop: 12 }}
            >
              {editOpen ? "Cancel" : "Edit profile & photo"}
            </button>
          </div>
        </section>

        {/* EDIT PROFILE SECTION */}
        {editOpen && (
          <section className="profile-card" style={{ marginBottom: 24 }}>
            <div className="profile-card-header">
              <h3>Personal information & profile photo</h3>
            </div>
            {profileSaveErr && (
              <p className="sub-text" style={{ color: "crimson", marginBottom: 12 }}>{profileSaveErr}</p>
            )}
            <div className="profile-edit-grid">
              <div className="profile-edit-avatar-wrap">
                <label>Profile photo</label>
                <div className="profile-edit-avatar">
                  {(profileImageUrl || profileImageFile) ? (
                    <img
                      src={profileImageFile ? URL.createObjectURL(profileImageFile) : profileImageUrl}
                      alt="Profile"
                      className="profile-avatar-img"
                    />
                  ) : (
                    <span>{(editForm.name || "S").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && setProfileImageFile(e.target.files[0])}
                  style={{ marginTop: 8, fontSize: 14 }}
                />
              </div>
              <div className="profile-edit-fields">
                <label>Full name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                />
                <label>Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                />
                <label>Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Address"
                />
                <label>Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <label>Father&apos;s name</label>
                <input
                  type="text"
                  value={editForm.fatherName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fatherName: e.target.value }))}
                  placeholder="Father's name"
                />
                <label>Mother&apos;s name</label>
                <input
                  type="text"
                  value={editForm.motherName}
                  onChange={(e) => setEditForm((f) => ({ ...f, motherName: e.target.value }))}
                  placeholder="Mother's name"
                />
                <label>Date of birth</label>
                <input
                  type="date"
                  value={editForm.dob}
                  onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                />
                <label>Department / Program</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="Department or program"
                />
                <label>Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Short bio"
                  rows={3}
                />
                <label>Experience</label>
                <input
                  type="text"
                  value={editForm.experience}
                  onChange={(e) => setEditForm((f) => ({ ...f, experience: e.target.value }))}
                  placeholder="Experience"
                />
                <button
                  type="button"
                  className="profile-save-btn"
                  onClick={saveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* MAIN GRID */}
        <section className="profile-main-grid">
          {/* LEFT */}
          <div className="profile-left-column">
            {/* Personal information (read-only display) */}
            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Personal information</h3>
              </div>
              <div className="profile-info-grid">
                {cleanValue(student?.phone) ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Phone</span>
                    <span className="profile-info-value">{student.phone}</span>
                  </div>
                ) : null}
                {cleanValue(student?.address) ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Address</span>
                    <span className="profile-info-value">{student.address}</span>
                  </div>
                ) : null}
                {cleanValue(student?.gender) ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Gender</span>
                    <span className="profile-info-value">{student.gender}</span>
                  </div>
                ) : null}
                {cleanValue(student?.fatherName) ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Father&apos;s name</span>
                    <span className="profile-info-value">{student.fatherName}</span>
                  </div>
                ) : null}
                {cleanValue(student?.motherName) ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Mother&apos;s name</span>
                    <span className="profile-info-value">{student.motherName}</span>
                  </div>
                ) : null}
                {student?.dob ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Date of birth</span>
                    <span className="profile-info-value">
                      {typeof student.dob === "string"
                        ? student.dob.slice(0, 10)
                        : new Date(student.dob).toLocaleDateString()}
                    </span>
                  </div>
                ) : null}
                {cleanValue(student?.department) ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Department / Program</span>
                    <span className="profile-info-value">{student.department}</span>
                  </div>
                ) : null}
                {cleanValue(student?.bio) ? (
                  <div className="profile-info-row profile-info-row--full">
                    <span className="profile-info-label">Bio</span>
                    <span className="profile-info-value">{student.bio}</span>
                  </div>
                ) : null}
                {cleanValue(student?.experience) ? (
                  <div className="profile-info-row">
                    <span className="profile-info-label">Experience</span>
                    <span className="profile-info-value">{student.experience}</span>
                  </div>
                ) : null}
                {!loading && !cleanValue(student?.phone) && !cleanValue(student?.address) && !cleanValue(student?.gender) &&
                 !cleanValue(student?.fatherName) && !cleanValue(student?.motherName) && !student?.dob &&
                 !cleanValue(student?.department) && !cleanValue(student?.bio) && !cleanValue(student?.experience) ? (
                  <p className="sub-text">No personal information added yet. Click &quot;Edit profile & photo&quot; above to add details.</p>
                ) : null}
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Enrolled Courses</h3>
                <span className="badge-pill">{activeCount} Active</span>
              </div>

              <table className="profile-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="3">Loading…</td>
                    </tr>
                  ) : enrichedCourses.length === 0 ? (
                    <tr>
                      <td colSpan="3">No courses yet (attempt an MCQ to start tracking).</td>
                    </tr>
                  ) : (
                    enrichedCourses.map((course, idx) => (
                      <tr key={idx}>
                        <td>{course.title}</td>
                        <td>{course.status}</td>
                        <td>{course.progressPercent}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Enrollment & Marks</h3>
                <span className="sub-text">Derived from your MCQ attempts</span>
              </div>

              <table className="profile-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Internal</th>
                    <th>Final</th>
                    <th>Total (%)</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5">Loading…</td>
                    </tr>
                  ) : marks.length === 0 ? (
                    <tr>
                      <td colSpan="5">No marks yet. Complete MCQs to generate grades.</td>
                    </tr>
                  ) : (
                    marks.map((m, idx) => (
                      <tr key={idx}>
                        <td>{m.course}</td>
                        <td>{m.internal}</td>
                        <td>{m.final}</td>
                        <td>{m.total}</td>
                        <td>{m.grade}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {!loading && marks.length > 0 ? (
                <p className="sub-text" style={{ marginTop: 10 }}>
                  Certificates are generated for courses with <b>Total (%) ≥ {CERT_MIN_SCORE}</b>.{" "}
                  Certificate shows only <b>GPA</b> and <b>GPA Points</b>.
                </p>
              ) : null}
            </div>

            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Recent MCQ Attempts</h3>
                <span className="sub-text">Your latest chapter tests</span>
              </div>

              <table className="profile-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Lesson/Chapter</th>
                    <th>Score</th>
                    <th>Result</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5">Loading…</td>
                    </tr>
                  ) : recentMcqs.length === 0 ? (
                    <tr>
                      <td colSpan="5">No MCQ attempts found yet.</td>
                    </tr>
                  ) : (
                    recentMcqs.map((r, idx) => {
                      const key2 = `${String(r.courseId || r.courseName)}::${String(
                        r.chapterId || r.chapterName
                      )}`;
                      const totalAttemptsForThisQuiz = attemptCountMap.get(key2) || 1;

                      const attemptLabel = r.attemptNo
                        ? `Attempt ${r.attemptNo}/${totalAttemptsForThisQuiz}`
                        : `Attempts: ${totalAttemptsForThisQuiz}`;

                      return (
                        <tr key={idx}>
                          <td>{r.courseName}</td>
                          <td>{r.chapterName}</td>
                          <td>
                            {r.marksObtained} / {r.totalMarks}
                          </td>
                          <td
                            style={{
                              fontWeight: 800,
                              color: r.result === "pass" ? "green" : "crimson",
                            }}
                          >
                            {String(r.result || "").toUpperCase()}
                          </td>
                          <td>{attemptLabel}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT */}
          <div className="profile-right-column">
            <div className="profile-card certificates-card">
              <div className="profile-card-header">
                <div>
                  <h3 style={{ marginBottom: 2 }}>Certificates</h3>
                  <span className="sub-text">
                    Certificate No is generated by server · <b>{SYSTEM_NAME}</b>
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    className="btn-lite"
                    onClick={loadDbCertificates}
                    disabled={dbCertsLoading || !token}
                    title={!token ? "Login required" : "Refresh"}
                  >
                    {dbCertsLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="certificate-placeholder">
                  <p>Loading certificates…</p>
                </div>
              ) : certificates.length === 0 ? (
                <div className="certificate-placeholder">
                  <p>No certificates available</p>
                  <p className="small-muted">
                    Get <b>{CERT_MIN_SCORE}%</b> or higher to generate certificate.
                  </p>
                </div>
              ) : (
                <div className="cert-list">
                  {certificates.map((c) => {
                    const stored = isDbStoredByCourse(c);
                    const courseIdStr = oidOrNull(c.courseId) ? String(c.courseId) : "";
                    const isIssuingThis =
                      issuingCourseKey && courseIdStr && issuingCourseKey === courseIdStr;

                    return (
                      <div key={String(c.key)} className="cert-item">
                        <div className="cert-item-left">
                          <div className="cert-badge">SG</div>
                          <div>
                            <div className="cert-course">{c.courseTitle}</div>
                            <div className="cert-meta">
                              <span>GPA: {c.gpaLetter}</span>
                              <span className="dot">•</span>
                              <span>GPA Points: {c.gpaPointsText}</span>
                              <span className="dot">•</span>
                              <span>Cert No: {safeStr(c.certificateNo, "Not issued yet")}</span>
                              <span className="dot">•</span>
                              <span
                                style={{
                                  fontWeight: 900,
                                  color: stored ? "green" : "rgba(0,0,0,0.55)",
                                }}
                              >
                                {stored ? "Saved" : "Not Saved"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="cert-item-actions">
                          {!stored ? (
                            <button
                              className="btn-lite"
                              onClick={() => issueCertificateToDb(c)}
                              disabled={isIssuingThis || !token}
                              title={!token ? "Login required" : "Store in database"}
                            >
                              {isIssuingThis ? "Saving…" : "Save"}
                            </button>
                          ) : (
                            <button className="btn-lite" disabled title="Already stored in DB">
                              Saved
                            </button>
                          )}

                          <button className="btn-lite" onClick={() => setActiveCertKey(String(c.key))}>
                            Preview
                          </button>

                          <button
                            className="btn-primary"
                            onClick={() => downloadCertificate(c)}
                            disabled={downloadingKey === String(c.key)}
                          >
                            {downloadingKey === String(c.key) ? "Generating…" : "Download"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CERTIFICATE PREVIEW MODAL */}
        {activeCert ? (
          <div className="sg-modal-overlay" onClick={() => setActiveCertKey(null)}>
            <div className="sg-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sg-modal-top">
                <div>
                  <h3 style={{ margin: 0 }}>Certificate Preview</h3>
                  <p className="sub-text" style={{ margin: "6px 0 0" }}>
                    {activeCert.courseTitle} · GPA {activeCert.gpaLetter} · GPA Points{" "}
                    {activeCert.gpaPointsText}
                  </p>
                </div>
                <button className="btn-close" onClick={() => setActiveCertKey(null)}>
                  ✕
                </button>
              </div>

              <div
                ref={(node) => {
                  if (node) certRefs.current[String(activeCert.key)] = node;
                }}
                className="sg-cert"
              >
                <div className="sg-top">
                  <div className="sg-brand">
                    <div className="sg-logoMark">SG</div>
                    <div className="sg-brandText">
                      <div className="sg-brandName">{SYSTEM_NAME}</div>
                      <div className="sg-brandSmall">Learning Management System</div>
                    </div>
                  </div>

                  <div className="sg-titleWrap">
                    <div className="sg-title">CERTIFICATE</div>
                    <div className="sg-subtitle">OF ACHIEVEMENT</div>
                  </div>

                  <div className="sg-rightStack">
                    <div className="sg-certNoCard">
                      <div className="sg-certNoValue">{safeStr(activeCert.certificateNo, "Not issued yet")}</div>
                    </div>

                    <div className="sg-award">
                      <div className="sg-awardTop">{new Date(activeCert.issuedAt).getFullYear()}</div>
                    </div>
                  </div>
                </div>

                <div className="sg-strip" />

                <div className="sg-body">
                  <div className="sg-present">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>

                  <div className="sg-name">{activeCert.studentName}</div>

                  <div className="sg-courseLine">
                    for successfully completing the course <b>{activeCert.courseTitle}</b>
                  </div>

                  <div className="sg-praise">
                    The learner has demonstrated strong understanding, consistency, and discipline and securing
                    the GPA: <b>{activeCert.gpaLetter}</b> with GPA points{" "}
                    <b>{activeCert.gpaPointsText}</b> {activeCert.praiseLine}
                  </div>

                  <div className="sg-desc">
                    This certificate is digitally generated by <b>{SYSTEM_NAME}</b> and can be verified using
                    the Certificate Number shown in the header.
                  </div>

                  <div className="sg-bottomRow">
                    <div className="sg-signBox">
                      <div className="sg-dsig">{SYSTEM_NAME}</div>
                      <div className="sg-signLabel">DIGITAL SIGNATURE</div>
                      <div className="sg-signSub">Authorized Signatory</div>
                    </div>

                    <div className="sg-site">{SYSTEM_NAME.toLowerCase().replace(/\s+/g, "")}.com</div>

                    <div className="sg-dateBox">
                      <div className="sg-signLabel">
                        DATE: {new Date(activeCert.issuedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sg-watermark">{SYSTEM_NAME}</div>
              </div>

              <div className="sg-modal-actions">
                <button className="btn-lite" onClick={() => setActiveCertKey(null)}>
                  Close
                </button>
                <button
                  className="btn-primary"
                  onClick={() => downloadCertificate(activeCert)}
                  disabled={downloadingKey === String(activeCert.key)}
                >
                  {downloadingKey === String(activeCert.key) ? "Generating…" : "Download PDF"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </>
  );
};

export default StudentProfile;
