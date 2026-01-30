import { useState, useEffect, useRef } from "react";

export default function PDFViewer({ url, fileName }) {
  const [numPages, setNumPages] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1.5);

  // Load PDF.js from CDN
  useEffect(() => {
    const loadPdfJs = async () => {
      if (window.pdfjsLib) return;
      
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        
        await loadPdfJs();
        
        const loadingTask = window.pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error("PDF load error:", err);
        setError("Failed to load PDF");
        setLoading(false);
      }
    };

    if (url) {
      loadDocument();
    }
  }, [url]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const pdfPage = await pdfDoc.getPage(page);
        const viewport = pdfPage.getViewport({ scale });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await pdfPage.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
      } catch (err) {
        console.error("Page render error:", err);
      }
    };

    renderPage();
  }, [pdfDoc, page, scale]);

  const goToPrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const goToNextPage = () => {
    if (page < numPages) setPage(page + 1);
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: 16, 
      alignItems: "center",
      width: "100%",
      padding: "20px",
      background: "#f8fafc",
      borderRadius: "16px"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        paddingBottom: "12px",
        borderBottom: "1px solid #e2e8f0"
      }}>
        <div style={{ 
          fontSize: "1rem", 
          fontWeight: 600, 
          color: "#1e293b"
        }}>
          📄 {fileName || "PDF Document"}
        </div>
        <a
          href={url}
          download
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "8px 16px",
            background: "#f1f5f9",
            color: "#475569",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: 500,
            fontSize: "0.85rem",
            border: "1px solid #e2e8f0"
          }}
        >
          📥 Download
        </a>
      </div>

      {/* Navigation Controls - Top */}
      <div style={{ 
        display: "flex", 
        gap: 16, 
        alignItems: "center",
        padding: "12px 20px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}>
        <button 
          disabled={page <= 1} 
          onClick={goToPrevPage}
          style={{
            padding: "12px 24px",
            background: page <= 1 ? "#e2e8f0" : "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: page <= 1 ? "#94a3b8" : "white",
            border: "none",
            borderRadius: "10px",
            cursor: page <= 1 ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "0.95rem",
            transition: "all 0.2s ease",
            boxShadow: page <= 1 ? "none" : "0 4px 12px rgba(99, 102, 241, 0.3)"
          }}
        >
          ← Prev
        </button>

        <span style={{ 
          fontSize: "1rem", 
          fontWeight: 600, 
          color: "#334155",
          minWidth: "120px",
          textAlign: "center"
        }}>
          Page {page} {numPages ? `of ${numPages}` : ""}
        </span>

        <button
          disabled={!numPages || page >= numPages}
          onClick={goToNextPage}
          style={{
            padding: "12px 24px",
            background: (!numPages || page >= numPages) ? "#e2e8f0" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: (!numPages || page >= numPages) ? "#94a3b8" : "white",
            border: "none",
            borderRadius: "10px",
            cursor: (!numPages || page >= numPages) ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "0.95rem",
            transition: "all 0.2s ease",
            boxShadow: (!numPages || page >= numPages) ? "none" : "0 4px 12px rgba(37, 99, 235, 0.3)"
          }}
        >
          Next →
        </button>
      </div>

      {/* Zoom Controls */}
      <div style={{ 
        display: "flex", 
        gap: 8, 
        alignItems: "center"
      }}>
        <button 
          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          style={{
            padding: "6px 12px",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          −
        </button>
        <span style={{ fontSize: "0.85rem", color: "#64748b", minWidth: "60px", textAlign: "center" }}>
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={() => setScale(s => Math.min(3, s + 0.25))}
          style={{
            padding: "6px 12px",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          +
        </button>
      </div>

      {/* Progress bar */}
      {numPages && (
        <div style={{ 
          width: "100%", 
          maxWidth: "500px",
          height: "6px", 
          background: "#e2e8f0", 
          borderRadius: "3px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${(page / numPages) * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #2563eb, #6366f1)",
            borderRadius: "3px",
            transition: "width 0.3s ease"
          }} />
        </div>
      )}

      {/* PDF Viewer Container - Fixed size, no scroll, like PPT */}
      <div
        style={{
          width: "min(900px, 95vw)",
          height: "min(550px, 65vh)",
          display: "grid",
          placeItems: "center",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
        }}
      >
        {/* Loading state */}
        {loading && !error && (
          <div style={{ textAlign: "center", color: "#64748b" }}>
            <div style={{ 
              width: "48px", 
              height: "48px", 
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px"
            }} />
            <p>Loading PDF...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ textAlign: "center", color: "#dc2626", padding: "20px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📄</div>
            <p style={{ marginBottom: "16px" }}>{error}</p>
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: 600
              }}
            >
              Download PDF Instead
            </a>
          </div>
        )}

        {/* Canvas for PDF rendering - ONE page at a time */}
        {!loading && !error && (
          <canvas 
            ref={canvasRef} 
            style={{ 
              maxWidth: "100%", 
              maxHeight: "100%",
              objectFit: "contain"
            }} 
          />
        )}
      </div>

      {/* Bottom Navigation - for easier access */}
      <div style={{ 
        display: "flex", 
        gap: 20, 
        alignItems: "center",
        marginTop: "8px"
      }}>
        <button 
          disabled={page <= 1} 
          onClick={goToPrevPage}
          style={{
            padding: "14px 32px",
            background: page <= 1 ? "#e2e8f0" : "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: page <= 1 ? "#94a3b8" : "white",
            border: "none",
            borderRadius: "12px",
            cursor: page <= 1 ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "1rem",
            transition: "all 0.2s ease",
            boxShadow: page <= 1 ? "none" : "0 4px 14px rgba(99, 102, 241, 0.35)",
            minWidth: "140px"
          }}
        >
          ← Previous
        </button>

        <button
          disabled={!numPages || page >= numPages}
          onClick={goToNextPage}
          style={{
            padding: "14px 32px",
            background: (!numPages || page >= numPages) ? "#e2e8f0" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: (!numPages || page >= numPages) ? "#94a3b8" : "white",
            border: "none",
            borderRadius: "12px",
            cursor: (!numPages || page >= numPages) ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "1rem",
            transition: "all 0.2s ease",
            boxShadow: (!numPages || page >= numPages) ? "none" : "0 4px 14px rgba(37, 99, 235, 0.35)",
            minWidth: "140px"
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
