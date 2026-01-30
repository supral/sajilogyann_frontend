// src/services/api.js

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

/**
 * ✅ Token helpers
 */
export const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

export const setToken = (token, { remember = true } = {}) => {
  if (!token) return;

  if (remember) {
    localStorage.setItem("bs_token", token);
    sessionStorage.removeItem("bs_token");
  } else {
    sessionStorage.setItem("bs_token", token);
    localStorage.removeItem("bs_token");
  }
};

export const clearToken = () => {
  localStorage.removeItem("bs_token");
  sessionStorage.removeItem("bs_token");
};

/**
 * ✅ INTERNAL: safe response parsing
 */
async function parseResponse(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text().catch(() => "");
  return text ? { message: text } : null;
}

/**
 * ✅ JSON request helper - tries both /api and /api/v1 prefixes
 */
export async function apiJson(path, { method = "GET", body, auth = true } = {}) {
  const token = getToken();

  let lastError = null;

  // ✅ Try both API prefixes
  for (const prefix of API_PREFIXES) {
    try {
      const url = `${API_HOST}${prefix}${path}`;
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        // If 404, try next prefix
        if (res.status === 404) {
          lastError = new Error(
            data?.message ||
            data?.error ||
            `Request failed (${res.status} ${res.statusText})`
          );
          lastError.status = res.status;
          lastError.data = data;
          continue; // Try next prefix
        }

        // ✅ never auto-redirect here
        let msg =
          data?.message ||
          data?.error ||
          `Request failed (${res.status} ${res.statusText})`;

        // ✅ make 401 clearer
        if (res.status === 401) {
          msg = "Session expired or Unauthorized. Please login again.";
        }

        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err; // Don't try other prefixes for non-404 errors
      }

      // ✅ Success - return data
      return data;
    } catch (e) {
      // Network errors should stop trying
      if (e.name === "TypeError" && e.message.includes("fetch")) {
        const err = new Error("Failed to fetch: Backend not reachable.");
        err.status = 0;
        throw err;
      }

      // If it's not a 404, throw immediately
      if (e.status && e.status !== 404) {
        throw e;
      }

      // For 404 or other errors, save and try next prefix
      lastError = e;
    }
  }

  // All prefixes failed
  if (lastError) {
    throw lastError;
  }

  throw new Error("Failed to fetch: Backend not reachable.");
}

/**
 * ✅ FormData request helper - tries both /api and /api/v1 prefixes
 */
export async function apiForm(path, { method = "POST", formData, auth = true } = {}) {
  const token = getToken();

  let lastError = null;

  // ✅ Try both API prefixes
  for (const prefix of API_PREFIXES) {
    try {
      const url = `${API_HOST}${prefix}${path}`;
      
      const res = await fetch(url, {
        method,
        headers: {
          ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        // If 404, try next prefix
        if (res.status === 404) {
          lastError = new Error(
            data?.message ||
            data?.error ||
            `Request failed (${res.status} ${res.statusText})`
          );
          lastError.status = res.status;
          lastError.data = data;
          continue; // Try next prefix
        }

        let msg =
          data?.message ||
          data?.error ||
          `Request failed (${res.status} ${res.statusText})`;

        if (res.status === 401) {
          msg = "Session expired or Unauthorized. Please login again.";
        }

        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err; // Don't try other prefixes for non-404 errors
      }

      // ✅ Success - return data
      return data;
    } catch (e) {
      // Network errors should stop trying
      if (e.name === "TypeError" && e.message.includes("fetch")) {
        const err = new Error("Failed to fetch: Backend not reachable.");
        err.status = 0;
        throw err;
      }

      // If it's not a 404, throw immediately
      if (e.status && e.status !== 404) {
        throw e;
      }

      // For 404 or other errors, save and try next prefix
      lastError = e;
    }
  }

  // All prefixes failed
  if (lastError) {
    throw lastError;
  }

  throw new Error("Failed to fetch: Backend not reachable.");
}

/* =========================
   ✅ AUTH APIs
========================= */

export const loginApi = async (payload) => {
  const token = getToken();
  let lastError = null;

  // Try both API prefixes for login
  for (const prefix of API_PREFIXES) {
    try {
      const url = `${API_HOST}${prefix}/auth/login`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        // For login, show the actual backend error message
        const errorMessage = data?.message || data?.error || `Login failed (${res.status})`;
        const err = new Error(errorMessage);
        err.status = res.status;
        err.data = data;
        
        // If 404, try next prefix
        if (res.status === 404) {
          lastError = err;
          continue;
        }
        
        // For other errors (including 401), throw immediately with actual message
        throw err;
      }

      // Success - extract token and user
      const loginToken = data?.token || data?.accessToken;
      const user = data?.user || data?.data?.user || null;

      // Store token
      if (loginToken) {
        setToken(loginToken, { remember: true });
      }

      return data;
    } catch (e) {
      // Network errors should stop trying
      if (e.name === "TypeError" && e.message.includes("fetch")) {
        const err = new Error("Failed to fetch: Backend not reachable.");
        err.status = 0;
        throw err;
      }

      // If it's not a 404, throw immediately (this includes 401 with actual error message)
      if (e.status && e.status !== 404) {
        throw e;
      }

      // For 404, save and try next prefix
      lastError = e;
    }
  }

  // All prefixes failed
  if (lastError) {
    throw lastError;
  }

  throw new Error("Failed to login: Backend not reachable.");
};

export const registerApi = async (payload) => {
  const data = await apiJson("/auth/register", { method: "POST", body: payload, auth: false });

  const token = data?.token || data?.accessToken;
  if (token) setToken(token, { remember: true });

  return data;
};

export const googleAuthApi = async (googleToken) => {
  const data = await apiJson("/auth/google", { method: "POST", body: { token: googleToken }, auth: false });

  const token = data?.token || data?.accessToken;
  if (token) setToken(token, { remember: true });

  return data;
};

export const healthCheck = () => apiJson("/health", { method: "GET", auth: false });

/* =========================
   ✅ TEACHER APIs
========================= */

export const teacherCreateCourse = (payload) =>
  apiJson("/teacher/courses", { method: "POST", body: payload });

export const teacherGetMyCourses = () =>
  apiJson("/teacher/courses", { method: "GET" });

export const teacherGetCourseById = (id) =>
  apiJson(`/teacher/courses/${id}`, { method: "GET" });

export const teacherCreateChapter = (courseId, formData) =>
  apiForm(`/teacher/courses/${courseId}/chapters`, { method: "POST", formData });

export const teacherCreateOldLesson = (courseId, formData) =>
  apiForm(`/teacher/courses/${courseId}/lessons`, { method: "POST", formData });

// ✅ Teacher Analytics APIs
export const teacherGetEnrolledStudents = () =>
  apiJson("/teacher/enrolled-students", { method: "GET" });

export const teacherGetMcqAttempts = () =>
  apiJson("/teacher/mcq-attempts", { method: "GET" });

export const teacherGetAnalytics = () =>
  apiJson("/teacher/analytics", { method: "GET" });