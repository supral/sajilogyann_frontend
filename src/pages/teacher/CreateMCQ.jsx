import React, { useMemo, useState } from "react";
import NavbarAfterLogin from "../teacher/NavbarAfterLogin";
import TeacherSidebar from "../teacher/TeacherSidebar";
import "../../styles/CreateMCQ.css";

const emptyQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

const CreateMCQ = () => {
  const [meta, setMeta] = useState({
    subject: "",
    chapter: "All Chapters",
    difficulty: "Medium",
    timeLimit: 30,
  });

  const [questions, setQuestions] = useState(
    Array.from({ length: 10 }, () => emptyQuestion())
  );

  const totalFilled = useMemo(
    () =>
      questions.filter(
        (q) =>
          q.question.trim() &&
          q.options.every((opt) => opt.trim())
      ).length,
    [questions]
  );

  const addQuestion = () =>
    setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (index) => {
    if (questions.length <= 10) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (questions.length < 10) {
      alert("❌ Minimum 10 MCQs required");
      return;
    }

    const payload = {
      ...meta,
      questions,
    };

    console.log("MCQ Payload:", payload);
    alert("✅ MCQs Created Successfully!");
  };

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin />

      <div className="teacher-body">
        <TeacherSidebar />

        <main className="teacher-content">
          <div className="mcq-page">
            <div className="mcq-header">
              <div>
                <h2>Create MCQ Set</h2>
                <p>Create structured MCQs for student assessments.</p>
              </div>

              <div className="mcq-progress">
                <span className="pill">
                  Filled: <b>{totalFilled}</b> / {questions.length}
                </span>
              </div>
            </div>

            <form className="mcq-form" onSubmit={handleSubmit}>
              {questions.map((q, index) => (
                <div className="mcq-card" key={index}>
                  <div className="mcq-card-top">
                    <h4>Question {index + 1}</h4>
                    <button
                      type="button"
                      className="danger-link"
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length <= 10}
                    >
                      Remove
                    </button>
                  </div>

                  <textarea
                    placeholder="Enter question"
                    value={q.question}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[index].question = e.target.value;
                      setQuestions(copy);
                    }}
                    required
                  />

                  <div className="options-grid">
                    {q.options.map((opt, oIndex) => (
                      <input
                        key={oIndex}
                        placeholder={`Option ${"ABCD"[oIndex]}`}
                        value={opt}
                        onChange={(e) => {
                          const copy = [...questions];
                          copy[index].options[oIndex] = e.target.value;
                          setQuestions(copy);
                        }}
                        required
                      />
                    ))}
                  </div>

                  <select
                    value={q.correctIndex}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[index].correctIndex = Number(e.target.value);
                      setQuestions(copy);
                    }}
                  >
                    <option value={0}>A</option>
                    <option value={1}>B</option>
                    <option value={2}>C</option>
                    <option value={3}>D</option>
                  </select>
                </div>
              ))}

              <div className="mcq-actions">
                <button type="button" onClick={addQuestion}>
                  ➕ Add Question
                </button>
                <button type="submit">✅ Submit MCQs</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateMCQ;
