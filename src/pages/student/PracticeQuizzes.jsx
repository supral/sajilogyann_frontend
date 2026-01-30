import React, { useEffect, useState } from "react";
import StudentPageLayout from "./StudentPageLayout";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

// Pass threshold (50% is standard, but can be adjusted)
const PASS_PERCENT = 50;

export default function PracticeQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState(""); // "pass" or "fail"

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = getToken();
        for (const p of API_PREFIXES) {
          const res = await fetch(`${API_HOST}${p}/students/practice-quizzes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setQuizzes(data?.quizzes || []);
            break;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  const handleStart = () => {
    if (quizzes.length === 0) return;
    setStarted(true);
    setSubmitted(false);
    setAnswers({});
    setScore(0);
    setResultMessage("");
    setResultType("");
  };

  const handleAnswerSelect = (qIndex, optionValue) => {
    if (!started || submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optionValue }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    quizzes.forEach((q, idx) => {
      const correct = String(q?.correct ?? "").trim();
      const picked = String(answers[idx] || "").trim();
      if (correct && picked && correct === picked) {
        correctCount += 1;
      }
    });
    return correctCount;
  };

  const handleSubmit = () => {
    if (submitted || !started) return;

    const correctCount = calculateScore();
    const totalQuestions = quizzes.length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    setScore(scorePercent);
    setSubmitted(true);

    // Check pass/fail and set message
    if (scorePercent >= PASS_PERCENT) {
      setResultType("pass");
      setResultMessage("Congratulations! Your progress is improving.");
    } else {
      setResultType("fail");
      setResultMessage("Please study harder.");
    }
  };

  const handleReset = () => {
    setStarted(false);
    setSubmitted(false);
    setAnswers({});
    setScore(0);
    setResultMessage("");
    setResultType("");
  };

  const getAnswerStyle = (qIndex, option) => {
    if (!submitted) {
      return answers[qIndex] === option
        ? { backgroundColor: "#e3f2fd", borderColor: "#2196f3", borderWidth: "2px" }
        : {};
    }

    const correct = String(quizzes[qIndex]?.correct ?? "").trim();
    const isCorrect = correct === option;
    const isSelected = answers[qIndex] === option;

    if (isCorrect) {
      return { backgroundColor: "#e8f5e9", borderColor: "#4caf50", borderWidth: "2px", color: "#2e7d32" };
    }
    if (isSelected && !isCorrect) {
      return { backgroundColor: "#ffebee", borderColor: "#f44336", borderWidth: "2px", color: "#c62828" };
    }
    return {};
  };

  return (
    <StudentPageLayout title="Practice Quizzes" activePath="/student/practice-quizzes">
      {loading && (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Loading practice quizzes...</p>
        </div>
      )}

      {!loading && quizzes.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          <p>No practice quizzes available.</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Practice quizzes will appear here when courses have MCQs.
          </p>
        </div>
      )}

      {!loading && quizzes.length > 0 && !started && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ margin: "0 0 1rem 0", color: "#333" }}>Practice Quiz</h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Test your knowledge with randomly selected questions from all courses.
          </p>
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.875rem", color: "#666" }}>
              Total Questions: <strong>{quizzes.length}</strong>
            </p>
            <p style={{ fontSize: "0.875rem", color: "#666" }}>
              Passing Score: <strong>{PASS_PERCENT}%</strong>
            </p>
          </div>
          <button
            onClick={handleStart}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2196f3")}
          >
            Start Practice Quiz
          </button>
        </div>
      )}

      {!loading && quizzes.length > 0 && started && (
        <div>
          {/* Result Message */}
          {submitted && resultMessage && (
            <div
              style={{
                padding: "1.5rem",
                borderRadius: "8px",
                marginBottom: "2rem",
                backgroundColor: resultType === "pass" ? "#e8f5e9" : "#ffebee",
                border: `2px solid ${resultType === "pass" ? "#4caf50" : "#f44336"}`,
                color: resultType === "pass" ? "#2e7d32" : "#c62828",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                {resultType === "pass" ? "✓ " : "✗ "}
                {resultMessage}
              </div>
              <div style={{ fontSize: "1rem" }}>
                Your Score: <strong>{score}%</strong> ({calculateScore()} out of {quizzes.length} correct)
              </div>
            </div>
          )}

          {/* Quiz Questions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
            {quizzes.map((quiz, qIndex) => (
              <div
                key={qIndex}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ marginBottom: "1rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "#f5f5f5",
                      color: "#666",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Question {qIndex + 1} of {quizzes.length}
                  </span>
                  <h3 style={{ margin: "0.5rem 0", color: "#333" }}>{quiz.question}</h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {quiz.options?.map((option, optIndex) => (
                    <label
                      key={optIndex}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0.75rem",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        cursor: submitted ? "default" : "pointer",
                        transition: "all 0.2s",
                        ...getAnswerStyle(qIndex, option),
                      }}
                      onMouseEnter={
                        !submitted
                          ? (e) => {
                              if (answers[qIndex] !== option) {
                                e.currentTarget.style.backgroundColor = "#f5f5f5";
                              }
                            }
                          : undefined
                      }
                      onMouseLeave={
                        !submitted
                          ? (e) => {
                              if (answers[qIndex] !== option) {
                                e.currentTarget.style.backgroundColor = "";
                              }
                            }
                          : undefined
                      }
                    >
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={option}
                        checked={answers[qIndex] === option}
                        onChange={() => handleAnswerSelect(qIndex, option)}
                        disabled={submitted}
                        style={{ marginRight: "0.75rem", cursor: submitted ? "default" : "pointer" }}
                      />
                      <span>{option}</span>
                      {submitted && String(quiz.correct) === option && (
                        <span style={{ marginLeft: "auto", color: "#4caf50", fontWeight: "bold" }}>✓ Correct</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit/Reset Button */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length === 0}
                style={{
                  padding: "0.75rem 2rem",
                  backgroundColor: Object.keys(answers).length === 0 ? "#ccc" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: Object.keys(answers).length === 0 ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (Object.keys(answers).length > 0) {
                    e.currentTarget.style.backgroundColor = "#45a049";
                  }
                }}
                onMouseLeave={(e) => {
                  if (Object.keys(answers).length > 0) {
                    e.currentTarget.style.backgroundColor = "#4caf50";
                  }
                }}
              >
                Submit Quiz
              </button>
            )}

            {submitted && (
              <button
                onClick={handleReset}
                style={{
                  padding: "0.75rem 2rem",
                  backgroundColor: "#2196f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2196f3")}
              >
                Try Another Quiz
              </button>
            )}
          </div>
        </div>
      )}
    </StudentPageLayout>
  );
}
