// src/pages/student/MCQTest.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import "../../styles/StudentFileViewer.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const pickRandom = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

// ✅ robust id matcher
const matchByAnyId = (lessonItem, wantedId) => {
  const w = String(wantedId || "");

  const candidates = [
    lessonItem?._id,
    lessonItem?.lesson?._id,
    lessonItem?.chapterId, // if backend provides
    lessonItem?.lesson?.chapterId,
    lessonItem?.lesson?.chapter?._id,
    lessonItem?.lesson?.chapter?._id?.toString?.(),
    lessonItem?.lesson?.chapterId?.toString?.(),
  ]
    .filter(Boolean)
    .map((x) => String(x));

  return candidates.includes(w);
};

export default function MCQTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const courseId = location.state?.courseId || params.id;
  const lessonId =
    location.state?.lessonId ||
    location.state?.chapterId || // route uses :chapterId
    params.chapterId;

  const initialCourseTitle = location.state?.courseTitle || "";
  const initialLessonTitle =
    location.state?.lessonTitle || location.state?.chapterTitle || "";

  const [courseTitle, setCourseTitle] = useState(initialCourseTitle);
  const [lessonTitle, setLessonTitle] = useState(initialLessonTitle);

  const [loadingMcq, setLoadingMcq] = useState(false);
  const [mcqErr, setMcqErr] = useState("");
  const [mcqs, setMcqs] = useState([]);

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [scorePercent, setScorePercent] = useState(0);
  const [backendResult, setBackendResult] = useState(null);

  const [saveStatus, setSaveStatus] = useState("idle");

  // Timer
  const DEFAULT_MINUTES = 10;
  const [durationMinutes] = useState(DEFAULT_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_MINUTES * 60);
  const timerRef = useRef(null);

  const token = getToken();
  const authHeader = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const formatTime = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0"); // ✅ FIXED
    return `${mm}:${ss}`;
  };

  // ✅ fallback: load MCQs from public course endpoint if lesson not found in lessonsWithProgress
  const fetchMcqsFromPublicCourse = async () => {
    for (const prefix of API_PREFIXES) {
      const url = `${API_HOST}${prefix}/courses/${courseId}`;
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json", ...authHeader },
        });
        const data = await safeJson(res);
        if (!res.ok) continue;

        const course = data?.course || data;
        const chapters = Array.isArray(course?.chapters) ? course.chapters : [];

        // match chapter by id
        const ch = chapters.find((c) => String(c?._id) === String(lessonId));
        if (!ch) throw new Error("Lesson not found");

        setCourseTitle(course?.title || "");
        setLessonTitle(ch?.chapterName || ch?.title || "Lesson");

        const list = Array.isArray(ch?.mcqs) ? ch.mcqs : [];
        if (!list.length) throw new Error("No MCQs found for this lesson.");

        const examList = list.length > 10 ? pickRandom(list, 10) : list;
        setMcqs(examList);

        // reset exam
        setStarted(false);
        setSubmitted(false);
        setAnswers({});
        setScore(0);
        setSecondsLeft(durationMinutes * 60);

        return true;
      } catch {
        // try next prefix
      }
    }
    return false;
  };

  // ✅ main fetch
  const fetchMcqs = async () => {
    setMcqErr("");
    setLoadingMcq(true);
    setSaveStatus("idle");

    try {
      let lastError = null;

      for (const prefix of API_PREFIXES) {
        try {
          const res = await fetch(
            `${API_HOST}${prefix}/students/courses/${courseId}`,
            {
              headers: { Accept: "application/json", ...authHeader },
            }
          );

          const data = await safeJson(res);

          if (!res.ok) {
            lastError = new Error(
              data?.message || `Request failed (${res.status})`
            );
            continue;
          }

          const lessons = Array.isArray(data?.lessonsWithProgress)
            ? data.lessonsWithProgress
            : [];

          // ✅ match by many ids (fixes "Lesson not found" after submit/refresh)
          const found = lessons.find((x) => matchByAnyId(x, lessonId));

          if (!found) {
            // ✅ fallback to public course route (chapters)
            const ok = await fetchMcqsFromPublicCourse();
            if (!ok) throw new Error("Lesson not found");
            setLoadingMcq(false);
            return;
          }

          setCourseTitle(data?.course?.title || initialCourseTitle || "");
          const title =
            found?.title ||
            found?.lesson?.chapterName ||
            found?.lesson?.title ||
            found?.lesson?.chapter?.chapterName ||
            found?.lesson?.chapter?.title ||
            "Lesson";
          setLessonTitle(title);

          const list = Array.isArray(found?.lesson?.mcqs)
            ? found.lesson.mcqs
            : Array.isArray(found?.lesson?.chapter?.mcqs)
            ? found.lesson.chapter.mcqs
            : [];

          if (!list.length) throw new Error("No MCQs found for this lesson.");

          const examList = list.length > 10 ? pickRandom(list, 10) : list;
          setMcqs(examList);

          // reset exam
          setStarted(false);
          setSubmitted(false);
          setAnswers({});
          setScore(0);
          setSecondsLeft(durationMinutes * 60);

          setLoadingMcq(false);
          return;
        } catch (e) {
          lastError = e;
        }
      }

      throw lastError || new Error("Failed to load MCQs");
    } catch (e) {
      setMcqErr(e?.message || "Could not load MCQs");
      setLoadingMcq(false);
    }
  };

  useEffect(() => {
    if (!courseId || !lessonId) {
      setMcqErr("Missing courseId/lessonId.");
      return;
    }
    fetchMcqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId]);

  useEffect(() => {
    if (!started || submitted) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTimeout(() => handleSubmit(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted]);

  const onStart = () => {
    if (!mcqs.length) return;
    setStarted(true);
  };

  const onPick = (qIndex, optionValue) => {
    if (!started || submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optionValue }));
  };

  const calcScore = () => {
    let correctCount = 0;
    mcqs.forEach((q, idx) => {
      const correct = String(q?.correct ?? q?.correctAnswer ?? "").trim();
      const picked = String(answers[idx] || "").trim();
      if (correct && picked && correct === picked) correctCount += 1;
    });
    const score = correctCount * 2;
    console.log("Calculated score:", score, "Correct:", correctCount, "Total:", mcqs.length);
    return score;
  };

  const submitToBackend = async () => {
    const answerList = mcqs.map((q, idx) => ({
      mcqId: q?._id || `${idx}`,
      selected: answers[idx] ?? "",
    }));

    const payload = { courseId, lessonId, answers: answerList };

    let lastErr = null;

    for (const prefix of API_PREFIXES) {
      const url = `${API_HOST}${prefix}/students/lessons/mcq-attempt`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...authHeader,
          },
          body: JSON.stringify(payload),
        });

        const data = await safeJson(res);

        if (res.ok) return { ok: true, data };

        if (res.status === 402) return { ok: false, status: 402, data };
        if (res.status === 403) return { ok: false, status: 403, data };

        lastErr = data?.message || `Submit failed (${res.status})`;
      } catch (e) {
        lastErr = e?.message || "Submit error";
      }
    }

    return {
      ok: false,
      status: 500,
      data: { message: lastErr || "Submit failed" },
    };
  };

  const handleSubmit = async () => {
    if (submitted) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    // Calculate and display score immediately
    const marks = calcScore();
    const calculatedPercent = mcqs.length > 0 ? Math.round((marks / (mcqs.length * 2)) * 100) : 0;
    setScore(marks);
    setScorePercent(calculatedPercent);
    setSubmitted(true);

    setSaveStatus("saving");
    const res = await submitToBackend();

    if (!res.ok) {
      setSaveStatus("failed");

      if (res.status === 402) {
        alert(res.data?.message || "Payment required to continue.");
        navigate(`/student/courses/${courseId}`, { replace: true });
        return;
      }
      if (res.status === 403) {
        alert(res.data?.message || "Complete previous lesson first.");
        navigate(`/student/courses/${courseId}`, { replace: true });
        return;
      }

      setMcqErr(res.data?.message || "Result not saved");
      return;
    }

    // ✅ Use backend score data to update/confirm
    if (res.data) {
      console.log("Backend response data:", res.data);
      setBackendResult(res.data);
      
      // Update score percentage from backend (more accurate)
      if (res.data.scorePercent !== undefined && res.data.scorePercent !== null) {
        console.log("Setting scorePercent from backend:", res.data.scorePercent);
        setScorePercent(res.data.scorePercent);
      }
      
      // Update score to match backend calculation
      if (res.data.correct !== undefined && res.data.total !== undefined) {
        const backendScore = res.data.correct * 2; // 2 marks per question
        console.log("Setting score from backend:", backendScore, "Correct:", res.data.correct, "Total:", res.data.total);
        setScore(backendScore);
      }
    } else {
      console.warn("No backend data received in response");
    }

    setSaveStatus("saved");

    // ✅ Don't auto-navigate - let user see the score and click to continue
    // Removed auto-navigation so user can review their score
  };

  return (
    <>
      <StudentNavbar />

      <div className="sfv-page">
        <div className="sfv-top">
          <button className="sfv-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <div className="sfv-meta">
            <div className="sfv-course">{courseTitle || "Course"}</div>
            <div className="sfv-chapter">{lessonTitle || "Lesson"}</div>
            <div className="sfv-file">MCQ Exam</div>
          </div>

          <div className="sfv-examRight">
            <div className={`sfv-timer ${started ? "live" : ""}`}>
              ⏱ {formatTime(secondsLeft)}
            </div>

            {!started ? (
              <button
                className="sfv-btn sfv-btn-primary"
                onClick={onStart}
                disabled={loadingMcq || !mcqs.length}
              >
                Start
              </button>
            ) : (
              <button
                className="sfv-btn sfv-btn-primary"
                onClick={handleSubmit}
                disabled={submitted}
              >
                {submitted ? "Submitted" : "Submit"}
              </button>
            )}
          </div>
        </div>

        <div className="sfv-card">
          {loadingMcq ? (
            <div className="sfv-loading">Loading MCQs…</div>
          ) : mcqErr ? (
            <div className="sfv-errorBox">
              <h2>Could not load MCQs</h2>
              <div className="sfv-muted">{mcqErr}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button className="sfv-btn" onClick={fetchMcqs}>
                  Retry
                </button>
                <button
                  className="sfv-btn"
                  onClick={() => navigate(`/student/courses/${courseId}`, { replace: true })}
                >
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="sfv-examHeader">
                <div className="sfv-examTitle">Lesson MCQ Test</div>
                <div className="sfv-muted">{mcqs.length} questions • 2 marks each</div>

                {!started ? (
                  <div className="sfv-info">
                    Click <b>Start</b> to begin. Timer will run.
                  </div>
                ) : submitted ? (
                  <div className={`sfv-result ${(backendResult?.passed || scorePercent >= 80) ? "pass" : "fail"}`}>
                    <div className="sfv-resultBig" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                      Your Score: <b style={{ color: scorePercent >= 80 ? "#22c55e" : "#ef4444", fontSize: "1.8rem" }}>{score}</b> / {mcqs.length * 2}
                      <span style={{ fontSize: "1.3rem", marginLeft: "0.5rem", color: scorePercent >= 80 ? "#22c55e" : "#ef4444", fontWeight: "700" }}>
                        ({scorePercent}%)
                      </span>
                    </div>
                    <div className="sfv-resultMsg" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
                      {backendResult?.passed || scorePercent >= 80
                        ? "✅ Congratulations! You passed this lesson."
                        : "❌ You did not pass. If you fail 3 times, payment will be required."}
                    </div>
                    <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "8px", fontSize: "0.95rem" }}>
                      {backendResult ? (
                        <>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <strong>Correct Answers:</strong> <span style={{ color: "#22c55e", fontWeight: "700" }}>{backendResult.correct || 0}</span> / {backendResult.total || mcqs.length}
                          </div>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <strong>Score Percentage:</strong> <span style={{ color: scorePercent >= 80 ? "#22c55e" : "#ef4444", fontWeight: "700" }}>{backendResult.scorePercent || scorePercent}%</span>
                          </div>
                          {backendResult.attemptsUsed !== undefined && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong>Attempts Used:</strong> {backendResult.attemptsUsed} / {backendResult.maxAttempts || 3}
                            </div>
                          )}
                          {backendResult.passPercent && (
                            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
                              Passing Score: {backendResult.passPercent}%
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <strong>Correct Answers:</strong> <span style={{ color: "#22c55e", fontWeight: "700" }}>{Math.round(score / 2)}</span> / {mcqs.length}
                          </div>
                          <div>
                            <strong>Score Percentage:</strong> <span style={{ color: scorePercent >= 80 ? "#22c55e" : "#ef4444", fontWeight: "700" }}>{scorePercent}%</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: saveStatus === "saved" ? "#dcfce7" : saveStatus === "failed" ? "#fee2e2" : "#f3f4f6", borderRadius: "6px" }}>
                      {saveStatus === "saving" ? (
                        <span style={{ color: "#6b7280", fontWeight: 600 }}>⏳ Saving result…</span>
                      ) : saveStatus === "saved" ? (
                        <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "1rem" }}>
                          ✅ Result saved successfully
                        </span>
                      ) : saveStatus === "failed" ? (
                        <span style={{ color: "#dc2626", fontWeight: 700 }}>
                          ❌ Result not saved: {mcqErr || "Unknown error"}
                        </span>
                      ) : null}
                    </div>

                    {saveStatus === "saved" && (
                      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
                        <button
                          onClick={() => navigate(`/student/courses/${courseId}`, { replace: true })}
                          style={{
                            padding: "0.75rem 2rem",
                            backgroundColor: "#072e5c",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "1rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#0a3d7a";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#072e5c";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                          }}
                        >
                          Continue to Course →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="sfv-info">
                    Answer all questions and press <b>Submit</b>.
                  </div>
                )}
              </div>

              <div className={`sfv-questions ${started ? "" : "blurred"}`}>
                {mcqs.map((q, idx) => {
                  const opts = Array.isArray(q?.options) ? q.options : [];
                  return (
                    <div className="sfv-qCard" key={idx}>
                      <div className="sfv-qTitle">
                        Q{idx + 1}. {q?.question || "Untitled question"}
                      </div>

                      <div className="sfv-options">
                        {opts.map((op, oi) => {
                          const val = String(op);
                          const checked = String(answers[idx] || "") === val;

                          return (
                            <label
                              key={oi}
                              className={`sfv-opt ${checked ? "active" : ""} ${
                                submitted ? "locked" : ""
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${idx}`}
                                value={val}
                                checked={checked}
                                onChange={() => onPick(idx, val)}
                                disabled={!started || submitted}
                              />
                              <span className="sfv-optText">{val}</span>
                            </label>
                          );
                        })}
                      </div>

                      {submitted ? (
                        <div className="sfv-qFooter">
                          Correct: <b>{String(q?.correct ?? q?.correctAnswer ?? "-")}</b>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {!started ? (
                <div className="sfv-startHint">
                  🔒 Questions will unlock after you press <b>Start</b>.
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
