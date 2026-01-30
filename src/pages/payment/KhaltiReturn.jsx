import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const useQuery = () => new URLSearchParams(useLocation().search);

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export default function KhaltiReturn() {
  const navigate = useNavigate();
  const query = useQuery();
  const pidx = query.get("pidx");

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    if (!pidx) {
      setStatus("error");
      setMessage("Missing pidx in return URL.");
      return;
    }

    const run = async () => {
      try {
        let lastErr = null;

        for (const prefix of API_PREFIXES) {
          const url = `${API_HOST}${prefix}/payments/khalti/verify?pidx=${encodeURIComponent(pidx)}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await safeJson(res);

          if (res.ok) {
            if (data.status === "completed") {
              setStatus("completed");
              setMessage("Payment completed. Chapter unlocked!");
              setTimeout(() => navigate("/student-dashboard"), 1200);
              return;
            }
            if (data.status === "pending") {
              setStatus("pending");
              setMessage("Payment is pending. Please refresh after a moment.");
              return;
            }
            setStatus("failed");
            setMessage("Payment failed or cancelled.");
            return;
          }

          lastErr = data?.message || "Verification failed";
        }

        setStatus("error");
        setMessage(lastErr || "Verification error");
      } catch (e) {
        setStatus("error");
        setMessage(e?.message || "Verification error");
      }
    };

    run();
  }, [pidx, navigate, token]);

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 20 }}>
      <h2>Khalti Payment Status</h2>

      {status === "verifying" && <p>Verifying payment...</p>}
      {status === "completed" && <p style={{ color: "green" }}>{message}</p>}
      {status === "pending" && <p style={{ color: "orange" }}>{message}</p>}
      {status === "failed" && <p style={{ color: "red" }}>{message}</p>}
      {status === "error" && <p style={{ color: "red" }}>{message}</p>}

      <button
        style={{
          marginTop: 20,
          padding: "10px 14px",
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
        onClick={() => navigate("/student-dashboard")}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
