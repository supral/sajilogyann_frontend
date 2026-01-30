import React, { useEffect, useMemo, useState } from "react";
import "../../styles/CreateCourse.css";
import { useNavigate } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";

const API_HOST =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const getStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ✅ Try multiple backend prefixes (fixes your 404 instantly if backend uses /api/v1)
const API_PREFIXES = ["/api", "/api/v1"];

async function apiRequest(path, { method = "GET", body, requireAuth = true } = {}) {
  const token = getToken();
  
  // Only require token for authenticated requests
  if (requireAuth && !token) {
    const err = new Error("Session expired. Please login again.");
    err.status = 401;
    throw err;
  }

  let lastError = null;

  for (const prefix of API_PREFIXES) {
    try {
      const url = `${API_HOST}${prefix}${path}`;

      const headers = {
        ...(body ? { "Content-Type": "application/json" } : {}),
      };
      
      // Add auth header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (!res.ok) {
        const msg =
          data?.message ||
          data?.error ||
          `Request failed (${res.status}) ${res.statusText}`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;

        // If prefix mismatch -> backend returns 404, try next prefix
        if (res.status === 404) {
          lastError = err;
          continue;
        }

        throw err;
      }

      return data; // ✅ success
    } catch (e) {
      lastError = e;
      // network error => stop trying
      if (!String(e?.message || "").includes("404")) break;
    }
  }

  // If all prefixes failed
  const msg =
    lastError?.message ||
    "API route not found. Check your backend route/mount path.";
  const err = new Error(msg);
  err.status = lastError?.status || 0;
  throw err;
}

const CreateCourse = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("create-course");

  const token = getToken();
  const user = useMemo(() => getStoredUser(), []);

  // ✅ Dynamic categories from API
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    duration: "",
  });

  const [saving, setSaving] = useState(false);

  const [dialog, setDialog] = useState({
    open: false,
    type: "success",
    message: "",
  });

  const openDialog = (type, message) => setDialog({ open: true, type, message });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  // ✅ Fetch categories from API
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await apiRequest("/categories", { method: "GET", requireAuth: false });
      const cats = data?.categories || [];
      setCategories(cats.length > 0 ? cats : ["Management", "IT"]);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      // Fallback to default categories
      setCategories(["Management", "IT"]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // ✅ Add new category
  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || name.length < 2) {
      openDialog("error", "Category name must be at least 2 characters.");
      return;
    }

    // Check if category already exists (case-insensitive)
    if (categories.some(cat => cat.toLowerCase() === name.toLowerCase())) {
      openDialog("error", "This category already exists.");
      return;
    }

    setAddingCategory(true);
    try {
      const data = await apiRequest("/categories", {
        method: "POST",
        body: { name },
      });

      const addedCategory = data?.category?.name || name;
      setCategories(prev => [...prev, addedCategory].sort());
      setFormData(prev => ({ ...prev, category: addedCategory }));
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      openDialog("success", `Category "${addedCategory}" added successfully!`);
    } catch (err) {
      if (err?.status === 409) {
        openDialog("error", "This category already exists.");
      } else {
        openDialog("error", err.message || "Failed to add category.");
      }
    } finally {
      setAddingCategory(false);
    }
  };

  useEffect(() => {
    if (!token) {
      openDialog("error", "Session expired. Please login again.");
      setTimeout(() => navigate("/login", { replace: true }), 700);
      return;
    }

    const role = user?.role || "student";
    if (role !== "teacher") {
      if (role === "admin") navigate("/admin-dashboard", { replace: true });
      else navigate("/student-dashboard", { replace: true });
    }

    // Fetch categories on mount
    fetchCategories();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const title = formData.title.trim();
    const description = formData.description.trim();
    const category = formData.category.trim();
    const duration = String(formData.duration).trim();

    if (!title || !description || !category || !duration) {
      openDialog("error", "All fields are required.");
      return;
    }

    if (category.length < 2) {
      openDialog("error", "Please select or add a valid category.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/teacher/courses", {
        method: "POST",
        body: { title, description, category, duration },
      });

      setFormData({ title: "", description: "", category: "", duration: "" });
      openDialog("success", "✅ Course created successfully!");
      
      // Redirect to view courses page after successful creation
      setTimeout(() => {
        navigate("/view-courses");
      }, 1000);
    } catch (err) {
      if (err?.status === 401) {
        localStorage.removeItem("bs_token");
        sessionStorage.removeItem("bs_token");
        localStorage.removeItem("bs_user");
        sessionStorage.removeItem("bs_user");

        openDialog("error", "Session expired. Please login again.");
        setTimeout(() => navigate("/login", { replace: true }), 700);
        return;
      }

      // ✅ Helpful 404 message
      if (err?.status === 404) {
        openDialog(
          "error",
          `Request failed (404) Not Found\n\nTried:\n${API_HOST}/api/teacher/courses\n${API_HOST}/api/v1/teacher/courses\n\nFix: ensure your backend has POST /teacher/courses mounted under /api (or /api/v1).`
        );
        return;
      }

      openDialog("error", err.message || "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teacher-dashboard-layout">
      {dialog.open && (
        <div
          className="modal-overlay"
          onClick={closeDialog}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 14,
              padding: 18,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 22 }}>
                {dialog.type === "success" ? "✅" : "❌"}
              </div>
              <h3 style={{ margin: 0 }}>
                {dialog.type === "success" ? "Success" : "Error"}
              </h3>
            </div>

            <p style={{ marginTop: 10, marginBottom: 0, whiteSpace: "pre-line" }}>
              {dialog.message}
            </p>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="submit-btn"
                onClick={closeDialog}
                style={{ width: "auto", padding: "10px 18px" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <NavbarAfterLogin user={user} />

      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="create-course-form">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2>📘 Create a New Course</h2>
                <p>Fill out the form below to add a new course.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              <label>Course Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter course title"
                required
              />

              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter course description"
                required
              />

              <label>Category</label>
              {!showNewCategoryInput ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={loadingCategories}
                    style={{ flex: 1, minWidth: "200px" }}
                  >
                    <option value="">
                      {loadingCategories ? "Loading categories..." : "Select Category"}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput(true)}
                    style={{
                      padding: "10px 16px",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #059669, #047857)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #10b981, #059669)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <i className="fa-solid fa-plus"></i>
                    Add New
                  </button>
                </div>
              ) : (
                <div style={{ 
                  display: "flex", 
                  gap: "10px", 
                  alignItems: "center", 
                  flexWrap: "wrap",
                  padding: "12px",
                  background: "#f0fdf4",
                  borderRadius: "10px",
                  border: "2px solid #10b981"
                }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name..."
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "2px solid #10b981",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        background: "#fff",
                        outline: "none",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory();
                        }
                        if (e.key === "Escape") {
                          setShowNewCategoryInput(false);
                          setNewCategoryName("");
                        }
                      }}
                      autoFocus
                    />
                    <p style={{ 
                      margin: "6px 0 0 0", 
                      fontSize: "0.75rem", 
                      color: "#059669",
                      fontWeight: "500"
                    }}>
                      <i className="fa-solid fa-info-circle" style={{ marginRight: "4px" }}></i>
                      Type category name and click Add to create
                    </p>
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={addingCategory || !newCategoryName.trim() || newCategoryName.trim().length < 2}
                      style={{
                        padding: "12px 20px",
                        background: (addingCategory || !newCategoryName.trim() || newCategoryName.trim().length < 2) 
                          ? "#94a3b8" 
                          : "linear-gradient(135deg, #10b981, #059669)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: (addingCategory || !newCategoryName.trim() || newCategoryName.trim().length < 2) 
                          ? "not-allowed" 
                          : "pointer",
                        fontWeight: "600",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {addingCategory ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i>
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check"></i>
                          Add
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName("");
                      }}
                      style={{
                        padding: "12px 16px",
                        background: "#fff",
                        color: "#64748b",
                        border: "2px solid #e2e8f0",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      <i className="fa-solid fa-times"></i>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Show selected category badge */}
              {formData.category && (
                <div style={{ 
                  marginTop: "8px", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px" 
                }}>
                  <span style={{ 
                    fontSize: "0.8rem", 
                    color: "#64748b" 
                  }}>
                    Selected:
                  </span>
                  <span style={{
                    padding: "4px 12px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <i className="fa-solid fa-tag"></i>
                    {formData.category}
                  </span>
                </div>
              )}

              <label>Duration (Credit)</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="Enter course duration"
                required
                min="1"
              />

              <button type="submit" className="submit-btn" disabled={saving}>
                {saving ? "Creating..." : "Create Course"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateCourse;
