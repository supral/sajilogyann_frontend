import React, { useEffect, useMemo, useRef, useState } from "react";
import NavbarAfterLogin from "./NavbarAfterLogin";
import { useNavigate } from "react-router-dom";
import "../../styles/TeacherDashboard.css";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const emptySchool = () => ({ name: "", gpa: "" });
const emptyCollege12 = () => ({ name: "", gpa: "", subject: "" });

const TeacherProfile = () => {
  const navigate = useNavigate();

  const token =
    localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // view mode by default
  const [isEdit, setIsEdit] = useState(false);

  const [profile, setProfile] = useState(null);

  // editable form
  const [form, setForm] = useState({
    // existing
    name: "",
    email: "",
    phone: "",
    department: "",
    bio: "",
    address: "",
    role: "",
    createdAt: "",
    updatedAt: "",
    profileImage: "",
    file: null,

    // NEW personal info
    gender: "",
    fatherName: "",
    motherName: "",
    dob: "", // store as yyyy-mm-dd
    experience: "",

    // NEW citizenship / national ids
    idImages: [], // existing paths from backend (array of strings)
    idFiles: [], // new uploads (File[] max 3)

    // NEW education
    schools: [], // [{name,gpa}] up to 10
    colleges12: [], // [{name,gpa,subject}] up to 12
    bachelor: {
      collegeName: "",
      faculty: "",
      program: "",
      gpa: "",
    },
  });

  // snapshot for cancel
  const originalRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  // profile image preview
  const profileImageUrl = useMemo(() => {
    if (form.file) return URL.createObjectURL(form.file);

    const path = form.profileImage || profile?.profileImage;
    if (path) return `${API_BASE}${path}`;

    return "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  }, [form.file, form.profileImage, profile?.profileImage]);

  // citizenship/national id preview urls (existing + newly selected)
  const idPreviewUrls = useMemo(() => {
    const existing = (form.idImages || []).map((p) =>
      p?.startsWith("http") ? p : `${API_BASE}${p}`
    );
    const newly = (form.idFiles || []).map((f) => URL.createObjectURL(f));
    return [...existing, ...newly].slice(0, 3);
  }, [form.idImages, form.idFiles]);

  useEffect(() => {
    return () => {
      // revoke object urls
      if (form.file && profileImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(profileImageUrl);
      }
      (form.idFiles || []).forEach((f) => {
        try {
          const url = URL.createObjectURL(f);
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
    // eslint-disable-next-line
  }, []);

  const fetchProfile = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/teacher/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load profile");

      const data = await res.json();
      setProfile(data);

      const hydrated = {
        // existing
        name: data?.name || "",
        email: data?.email || "",
        phone: data?.phone || "",
        department: data?.department || "",
        bio: data?.bio || "",
        address: data?.address || "",
        role: data?.role || "teacher",
        createdAt: data?.createdAt || "",
        updatedAt: data?.updatedAt || "",
        profileImage: data?.profileImage || "",
        file: null,

        // NEW personal info
        gender: data?.gender || "",
        fatherName: data?.fatherName || "",
        motherName: data?.motherName || "",
        dob: data?.dob ? String(data.dob).slice(0, 10) : "", // yyyy-mm-dd
        experience: data?.experience || "",

        // NEW citizenship / national ids
        idImages: Array.isArray(data?.idImages) ? data.idImages : [],
        idFiles: [],

        // NEW education
        schools: Array.isArray(data?.schools) ? data.schools : [],
        colleges12: Array.isArray(data?.colleges12) ? data.colleges12 : [],
        bachelor: {
          collegeName: data?.bachelor?.collegeName || "",
          faculty: data?.bachelor?.faculty || "",
          program: data?.bachelor?.program || "",
          gpa: data?.bachelor?.gpa || "",
        },
      };

      // ensure minimum rows when editing later
      if (!hydrated.schools.length) hydrated.schools = [emptySchool()];
      if (!hydrated.colleges12.length) hydrated.colleges12 = [emptyCollege12()];

      setForm(hydrated);
      originalRef.current = hydrated;
    } catch (e) {
      setError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
      setIsEdit(false);
    }
  };

  const onEdit = () => {
    setError("");
    setSuccess("");
    setIsEdit(true);

    // ensure at least one entry in each list
    setForm((prev) => ({
      ...prev,
      schools: prev.schools?.length ? prev.schools : [emptySchool()],
      colleges12: prev.colleges12?.length ? prev.colleges12 : [emptyCollege12()],
    }));

    originalRef.current = { ...form, file: null, idFiles: [] };
  };

  const onCancel = () => {
    setError("");
    setSuccess("");
    setIsEdit(false);

    if (originalRef.current) {
      setForm({ ...originalRef.current, file: null, idFiles: [] });
    } else {
      setForm((prev) => ({ ...prev, file: null, idFiles: [] }));
    }
  };

  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBachelorChange = (e) => {
    setError("");
    setSuccess("");
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      bachelor: { ...prev.bachelor, [name]: value },
    }));
  };

  const handleFile = (e) => {
    setError("");
    setSuccess("");
    const f = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file: f }));
  };

  // up to 3 citizenship/national id images
  const handleIdFiles = (e) => {
    setError("");
    setSuccess("");
    const files = Array.from(e.target.files || []);
    const merged = [...(form.idFiles || []), ...files].slice(0, 3);
    setForm((prev) => ({ ...prev, idFiles: merged }));
  };

  const removeIdPreviewAt = (index) => {
    // index refers to combined previews (existing first then new)
    const existingCount = (form.idImages || []).length;
    if (index < existingCount) {
      // remove from existing paths array
      const next = [...(form.idImages || [])];
      next.splice(index, 1);
      setForm((prev) => ({ ...prev, idImages: next }));
    } else {
      // remove from new file uploads
      const fileIndex = index - existingCount;
      const next = [...(form.idFiles || [])];
      next.splice(fileIndex, 1);
      setForm((prev) => ({ ...prev, idFiles: next }));
    }
  };

  // Education list handlers
  const updateSchool = (idx, key, value) => {
    setForm((prev) => {
      const next = [...(prev.schools || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, schools: next };
    });
  };

  const addSchool = () => {
    setForm((prev) => {
      const next = [...(prev.schools || [])];
      if (next.length >= 10) return prev;
      next.push(emptySchool());
      return { ...prev, schools: next };
    });
  };

  const removeSchool = (idx) => {
    setForm((prev) => {
      const next = [...(prev.schools || [])];
      next.splice(idx, 1);
      return { ...prev, schools: next.length ? next : [emptySchool()] };
    });
  };

  const updateCollege12 = (idx, key, value) => {
    setForm((prev) => {
      const next = [...(prev.colleges12 || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, colleges12: next };
    });
  };

  const addCollege12 = () => {
    setForm((prev) => {
      const next = [...(prev.colleges12 || [])];
      if (next.length >= 12) return prev;
      next.push(emptyCollege12());
      return { ...prev, colleges12: next };
    });
  };

  const removeCollege12 = (idx) => {
    setForm((prev) => {
      const next = [...(prev.colleges12 || [])];
      next.splice(idx, 1);
      return { ...prev, colleges12: next.length ? next : [emptyCollege12()] };
    });
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const fd = new FormData();

      // existing
      fd.append("name", form.name || "");
      fd.append("phone", form.phone || "");
      fd.append("department", form.department || "");
      fd.append("bio", form.bio || "");
      fd.append("address", form.address || "");
      if (form.file) fd.append("profileImage", form.file);

      // NEW personal info
      fd.append("gender", form.gender || "");
      fd.append("fatherName", form.fatherName || "");
      fd.append("motherName", form.motherName || "");
      fd.append("dob", form.dob || "");
      fd.append("experience", form.experience || "");

      // NEW keep remaining existing id images paths (so backend can keep them)
      fd.append("idImages", JSON.stringify(form.idImages || []));

      // NEW upload up to 3 images
      (form.idFiles || []).slice(0, 3).forEach((f) => fd.append("idPhotos", f));

      // NEW education (send JSON)
      fd.append("schools", JSON.stringify((form.schools || []).slice(0, 10)));
      fd.append("colleges12", JSON.stringify((form.colleges12 || []).slice(0, 12)));
      fd.append("bachelor", JSON.stringify(form.bachelor || {}));

      const res = await fetch(`${API_BASE}/api/teacher/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const msg = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(msg.message || "Failed to update profile");

      setSuccess("Profile updated successfully ✅");
      setIsEdit(false);
      setForm((prev) => ({ ...prev, file: null, idFiles: [] }));
      await fetchProfile();
    } catch (e) {
      setError(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="teacher-dashboard-layout">
        <NavbarAfterLogin />
        <main className="teacher-content">
          <div className="tp__skeleton">
            <div className="tp__skHead" />
            <div className="tp__skCard" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin />

      <main className="teacher-content">
        <div className="tp__wrap">
          {/* Header */}
          <div className="tp__header">
            <div>
              <h2 className="tp__title">Teacher Profile</h2>
              <p className="tp__sub">
                View your details. Click <b>Edit Profile</b> to update.
              </p>
            </div>

            <div className="tp__actions">
              <button
                type="button"
                className="tp__btn tp__btnGhost"
                onClick={fetchProfile}
                disabled={saving}
                title="Reload profile"
              >
                Refresh
              </button>

              <button
                type="button"
                className="tp__btn tp__btnDanger"
                onClick={() => navigate("/change-password")}
                disabled={saving}
              >
                Change Password
              </button>

              {!isEdit ? (
                <button
                  type="button"
                  className="tp__btn tp__btnPrimary"
                  onClick={onEdit}
                  disabled={saving}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="tp__btn tp__btnPrimary"
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    className="tp__btn tp__btnGhost"
                    onClick={onCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Alerts */}
          {error && <div className="tp__alert tp__alertErr">{error}</div>}
          {success && <div className="tp__alert tp__alertOk">{success}</div>}

          {/* Card */}
          <div className="tp__card">
            {/* Left */}
            <aside className="tp__side">
              <div className="tp__avatarWrap">
                <img className="tp__avatar" src={profileImageUrl} alt="Profile" />
              </div>

              <div className="tp__sideInfo">
                <h3 className="tp__name">{form.name || "—"}</h3>
                <p className="tp__email">{form.email || "—"}</p>

                <div className="tp__chips">
                  <span className="tp__chip">🧑‍🏫 {form.role || "teacher"}</span>
                  <span className="tp__chip">🏫 {form.department || "No department"}</span>
                </div>

                <div className="tp__note">
                  Account created: <b>{formatDate(form.createdAt)}</b>
                  <br />
                  Last updated: <b>{formatDate(form.updatedAt)}</b>
                </div>

                {isEdit && (
                  <div className="tp__note" style={{ marginTop: 10 }}>
                    Tip: Upload a clear face photo (JPG/PNG) for best look.
                  </div>
                )}
              </div>
            </aside>

            {/* Right */}
            <section className="tp__main">
              {!isEdit ? (
                // VIEW MODE
                <div className="tp__view">
                  {/* PERSONAL INFO (kept + extended) */}
                  <div className="tp__sectionTitle">Personal Information</div>

                  <div className="tp__viewGrid">
                    <div className="tp__viewItem">
                      <span className="tp__k">Full Name</span>
                      <span className="tp__v">{form.name || "—"}</span>
                    </div>

                    <div className="tp__viewItem">
                      <span className="tp__k">Email</span>
                      <span className="tp__v">{form.email || "—"}</span>
                    </div>

                    <div className="tp__viewItem">
                      <span className="tp__k">Phone</span>
                      <span className="tp__v">{form.phone || "—"}</span>
                    </div>

                    <div className="tp__viewItem">
                      <span className="tp__k">Department</span>
                      <span className="tp__v">{form.department || "—"}</span>
                    </div>

                    <div className="tp__viewItem">
                      <span className="tp__k">Gender</span>
                      <span className="tp__v">{form.gender || "—"}</span>
                    </div>

                    <div className="tp__viewItem">
                      <span className="tp__k">Date of Birth</span>
                      <span className="tp__v">{form.dob || "—"}</span>
                    </div>

                    <div className="tp__viewItem">
                      <span className="tp__k">Father’s Name</span>
                      <span className="tp__v">{form.fatherName || "—"}</span>
                    </div>

                    <div className="tp__viewItem">
                      <span className="tp__k">Mother’s Name</span>
                      <span className="tp__v">{form.motherName || "—"}</span>
                    </div>

                    <div className="tp__viewItem tp__viewFull">
                      <span className="tp__k">Address</span>
                      <span className="tp__v">{form.address || "—"}</span>
                    </div>

                    <div className="tp__viewItem tp__viewFull">
                      <span className="tp__k">Bio</span>
                      <span className="tp__v">{form.bio || "—"}</span>
                    </div>

                    <div className="tp__viewItem tp__viewFull">
                      <span className="tp__k">Experience</span>
                      <span className="tp__v">{form.experience || "—"}</span>
                    </div>
                  </div>

                  {/* ID PHOTOS */}
                  <div className="tp__sectionTitle" style={{ marginTop: 18 }}>
                    Citizenship / National ID Photos
                  </div>

                  <div className="tp__idGrid">
                    {idPreviewUrls.length ? (
                      idPreviewUrls.map((src, i) => (
                        <div className="tp__idCard" key={i}>
                          <img src={src} alt={`ID-${i}`} />
                        </div>
                      ))
                    ) : (
                      <div className="tp__muted">No ID photos uploaded.</div>
                    )}
                  </div>

                  {/* EDUCATION */}
                  <div className="tp__sectionTitle" style={{ marginTop: 18 }}>
                    Education
                  </div>

                  {/* School */}
                  <div className="tp__eduBlock">
                    <div className="tp__eduHeading">School</div>
                    {(form.schools || []).length ? (
                      <div className="tp__eduList">
                        {form.schools.slice(0, 10).map((s, idx) => (
                          <div className="tp__eduRow" key={idx}>
                            <div>
                              <span className="tp__k">School Name</span>
                              <div className="tp__v">{s?.name || "—"}</div>
                            </div>
                            <div>
                              <span className="tp__k">GPA / %</span>
                              <div className="tp__v">{s?.gpa || "—"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="tp__muted">No school records.</div>
                    )}
                  </div>

                  {/* +2 / 12 */}
                  <div className="tp__eduBlock">
                    <div className="tp__eduHeading">College (+2 / 12)</div>
                    {(form.colleges12 || []).length ? (
                      <div className="tp__eduList">
                        {form.colleges12.slice(0, 12).map((c, idx) => (
                          <div className="tp__eduRow" key={idx}>
                            <div>
                              <span className="tp__k">College Name</span>
                              <div className="tp__v">{c?.name || "—"}</div>
                            </div>
                            <div>
                              <span className="tp__k">GPA</span>
                              <div className="tp__v">{c?.gpa || "—"}</div>
                            </div>
                            <div>
                              <span className="tp__k">Taken Subject</span>
                              <div className="tp__v">{c?.subject || "—"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="tp__muted">No +2 records.</div>
                    )}
                  </div>

                  {/* Bachelor */}
                  <div className="tp__eduBlock">
                    <div className="tp__eduHeading">Bachelor</div>
                    <div className="tp__viewGrid">
                      <div className="tp__viewItem">
                        <span className="tp__k">College Name</span>
                        <span className="tp__v">{form.bachelor?.collegeName || "—"}</span>
                      </div>
                      <div className="tp__viewItem">
                        <span className="tp__k">Faculty</span>
                        <span className="tp__v">{form.bachelor?.faculty || "—"}</span>
                      </div>
                      <div className="tp__viewItem">
                        <span className="tp__k">Program</span>
                        <span className="tp__v">{form.bachelor?.program || "—"}</span>
                      </div>
                      <div className="tp__viewItem">
                        <span className="tp__k">GPA</span>
                        <span className="tp__v">{form.bachelor?.gpa || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // EDIT MODE
                <form className="tp__form" onSubmit={(e) => e.preventDefault()}>
                  {/* PERSONAL INFO */}
                  <div className="tp__sectionTitle">Personal Information</div>

                  <div className="tp__grid">
                    <div className="tp__field">
                      <label>Full Name</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="tp__field">
                      <label>Email (readonly)</label>
                      <input value={form.email} disabled />
                    </div>

                    <div className="tp__field">
                      <label>Phone</label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="98XXXXXXXX"
                      />
                    </div>

                    <div className="tp__field">
                      <label>Department</label>
                      <input
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        placeholder="e.g., Management"
                      />
                    </div>

                    {/* NEW FIELDS */}
                    <div className="tp__field">
                      <label>Gender</label>
                      <select name="gender" value={form.gender} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="tp__field">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={form.dob}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="tp__field">
                      <label>Father’s Name</label>
                      <input
                        name="fatherName"
                        value={form.fatherName}
                        onChange={handleChange}
                        placeholder="Enter father's name"
                      />
                    </div>

                    <div className="tp__field">
                      <label>Mother’s Name</label>
                      <input
                        name="motherName"
                        value={form.motherName}
                        onChange={handleChange}
                        placeholder="Enter mother's name"
                      />
                    </div>

                    <div className="tp__field tp__fieldFull">
                      <label>Address</label>
                      <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Enter address"
                      />
                    </div>

                    <div className="tp__field tp__fieldFull">
                      <label>Bio</label>
                      <textarea
                        name="bio"
                        rows="3"
                        value={form.bio}
                        onChange={handleChange}
                        placeholder="Write a short bio..."
                      />
                    </div>

                    <div className="tp__field tp__fieldFull">
                      <label>Experience</label>
                      <textarea
                        name="experience"
                        rows="3"
                        value={form.experience}
                        onChange={handleChange}
                        placeholder="Write teaching experience, years, schools, etc..."
                      />
                    </div>

                    {/* Profile image */}
                    <div className="tp__field tp__fieldFull">
                      <label>Profile Image</label>
                      <div className="tp__fileRow">
                        <input type="file" accept="image/*" onChange={handleFile} />
                        {form.file && (
                          <span className="tp__fileHint">
                            Selected: <b>{form.file.name}</b>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ID PHOTOS */}
                  <div className="tp__sectionTitle" style={{ marginTop: 18 }}>
                    Citizenship / National ID Photos (max 3)
                  </div>

                  <div className="tp__grid">
                    <div className="tp__field tp__fieldFull">
                      <label>Upload ID Photos</label>
                      <div className="tp__fileRow">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleIdFiles}
                        />
                        <span className="tp__fileHint">
                          Selected: <b>{(form.idFiles || []).length}</b> new files
                        </span>
                      </div>

                      <div className="tp__idGrid" style={{ marginTop: 10 }}>
                        {idPreviewUrls.length ? (
                          idPreviewUrls.map((src, i) => (
                            <div className="tp__idCard" key={i}>
                              <img src={src} alt={`ID-${i}`} />
                              <button
                                type="button"
                                className="tp__miniDanger"
                                onClick={() => removeIdPreviewAt(i)}
                                title="Remove"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="tp__muted">No ID photos selected.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* EDUCATION */}
                  <div className="tp__sectionTitle" style={{ marginTop: 18 }}>
                    Education
                  </div>

                  {/* Schools */}
                  <div className="tp__eduEditor">
                    <div className="tp__eduHeadRow">
                      <div>
                        <div className="tp__eduHeading">School (up to 10)</div>
                        <div className="tp__mutedSmall">
                          Add your school records with GPA/Percentage.
                        </div>
                      </div>

                      <button
                        type="button"
                        className="tp__btn tp__btnGhost"
                        onClick={addSchool}
                        disabled={(form.schools || []).length >= 10}
                      >
                        + Add School
                      </button>
                    </div>

                    {(form.schools || []).slice(0, 10).map((s, idx) => (
                      <div className="tp__eduRowEdit" key={idx}>
                        <input
                          value={s?.name || ""}
                          onChange={(e) => updateSchool(idx, "name", e.target.value)}
                          placeholder="School Name"
                        />
                        <input
                          value={s?.gpa || ""}
                          onChange={(e) => updateSchool(idx, "gpa", e.target.value)}
                          placeholder="GPA / Percentage"
                        />
                        <button
                          type="button"
                          className="tp__miniDanger"
                          onClick={() => removeSchool(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* College +2 */}
                  <div className="tp__eduEditor" style={{ marginTop: 16 }}>
                    <div className="tp__eduHeadRow">
                      <div>
                        <div className="tp__eduHeading">College (+2 / 12) (up to 12)</div>
                        <div className="tp__mutedSmall">
                          Add your +2 college records, GPA, and taken subject.
                        </div>
                      </div>

                      <button
                        type="button"
                        className="tp__btn tp__btnGhost"
                        onClick={addCollege12}
                        disabled={(form.colleges12 || []).length >= 12}
                      >
                        + Add College
                      </button>
                    </div>

                    {(form.colleges12 || []).slice(0, 12).map((c, idx) => (
                      <div className="tp__eduRowEdit" key={idx}>
                        <input
                          value={c?.name || ""}
                          onChange={(e) => updateCollege12(idx, "name", e.target.value)}
                          placeholder="College Name"
                        />
                        <input
                          value={c?.gpa || ""}
                          onChange={(e) => updateCollege12(idx, "gpa", e.target.value)}
                          placeholder="GPA"
                        />
                        <input
                          value={c?.subject || ""}
                          onChange={(e) => updateCollege12(idx, "subject", e.target.value)}
                          placeholder="Taken Subject (e.g., Science/Management)"
                        />
                        <button
                          type="button"
                          className="tp__miniDanger"
                          onClick={() => removeCollege12(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Bachelor */}
                  <div className="tp__eduEditor" style={{ marginTop: 16 }}>
                    <div className="tp__eduHeading">Bachelor</div>

                    <div className="tp__grid" style={{ marginTop: 10 }}>
                      <div className="tp__field">
                        <label>College Name</label>
                        <input
                          name="collegeName"
                          value={form.bachelor?.collegeName || ""}
                          onChange={handleBachelorChange}
                          placeholder="Bachelor college name"
                        />
                      </div>

                      <div className="tp__field">
                        <label>Faculty</label>
                        <input
                          name="faculty"
                          value={form.bachelor?.faculty || ""}
                          onChange={handleBachelorChange}
                          placeholder="e.g., Science & Technology"
                        />
                      </div>

                      <div className="tp__field">
                        <label>Program</label>
                        <input
                          name="program"
                          value={form.bachelor?.program || ""}
                          onChange={handleBachelorChange}
                          placeholder="e.g., BCIS"
                        />
                      </div>

                      <div className="tp__field">
                        <label>GPA</label>
                        <input
                          name="gpa"
                          value={form.bachelor?.gpa || ""}
                          onChange={handleBachelorChange}
                          placeholder="e.g., 3.45"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="tp__footer">
                    <button
                      type="button"
                      className="tp__btn tp__btnPrimary"
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      className="tp__btn tp__btnGhost"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, file: null, idFiles: [] }))
                      }
                      disabled={saving}
                    >
                      Clear Selected Images
                    </button>

                    <button
                      type="button"
                      className="tp__btn tp__btnGhost"
                      onClick={onCancel}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherProfile;
