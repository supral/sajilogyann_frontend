import React from "react";
import StudentPageLayout from "./StudentPageLayout";
import ActivityLogPanel from "../../components/ActivityLogPanel";

export default function StudentActivityLog() {
  return (
    <StudentPageLayout title="Activity log" activePath="/student/activity-log">
      <p style={{ marginTop: 0, marginBottom: 18, color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>
        A timeline of your sign-ins, profile updates, MCQ attempts, certificates, and course progress. Newer
        events appear first.
      </p>
      <ActivityLogPanel />
    </StudentPageLayout>
  );
}
