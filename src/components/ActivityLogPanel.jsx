import React, { useEffect, useState } from "react";
import { fetchActivityLogMe } from "../services/api";
import "../styles/activityLog.css";

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SummaryBox({ summary, role }) {
  if (!summary || typeof summary !== "object") return null;

  if (role === "student") {
    return (
      <div className="act-summary">
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.totalMcqAttempts ?? "—"}</div>
          <div className="act-summary-card__label">MCQ attempts</div>
        </div>
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.totalCertificates ?? "—"}</div>
          <div className="act-summary-card__label">Certificates</div>
        </div>
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.enrolledCoursesTracked ?? "—"}</div>
          <div className="act-summary-card__label">Courses tracked</div>
        </div>
      </div>
    );
  }

  if (role === "teacher") {
    return (
      <div className="act-summary">
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.activeCourses ?? "—"}</div>
          <div className="act-summary-card__label">Active courses</div>
        </div>
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.newEnrollments14d ?? "—"}</div>
          <div className="act-summary-card__label">New enrollments (14d)</div>
        </div>
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.mcqPass14d ?? "—"}</div>
          <div className="act-summary-card__label">MCQ passed (14d)</div>
        </div>
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.mcqFail14d ?? "—"}</div>
          <div className="act-summary-card__label">MCQ failed (14d)</div>
        </div>
        {summary.note ? <p className="act-summary-note">{summary.note}</p> : null}
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div className="act-summary">
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.totalStoredEvents ?? "—"}</div>
          <div className="act-summary-card__label">Stored events</div>
        </div>
        <div className="act-summary-card">
          <div className="act-summary-card__value">{summary.yourRecordedActions ?? "—"}</div>
          <div className="act-summary-card__label">Your recorded actions</div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Fetches GET /activity/me (role derived from JWT) and renders a timeline.
 */
export default function ActivityLogPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const d = await fetchActivityLogMe();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load activity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="act-log act-log--loading">Loading activity…</div>;
  }
  if (err) {
    return <div className="act-log act-log--error">{err}</div>;
  }

  const role = data?.role || "student";
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className="act-log">
      <SummaryBox summary={data?.summary} role={role} />
      {items.length === 0 ? (
        <div className="act-log act-log--empty">No activity recorded yet. Sign in, take quizzes, or update your profile to see entries here.</div>
      ) : (
        <ul className="act-log-list">
          {items.map((item) => {
            const src = String(item.source || "log").replace(/[^a-z]/gi, "");
            return (
              <li key={item.id} className={`act-log-item act-log-item--${src}`}>
                <span className="act-log-dot" aria-hidden />
                <div className="act-log-body">
                  <div className="act-log-time">{formatWhen(item.at)}</div>
                  <div className="act-log-title">{item.title}</div>
                  {item.detail ? <div className="act-log-detail">{item.detail}</div> : null}
                  <div className="act-log-meta">
                    {item.category ? (
                      <span className="act-log-pill">{item.category}</span>
                    ) : null}
                    {item.source ? (
                      <span className="act-log-pill act-log-pill--muted">{item.source}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
