import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import ErrorBox from "../components/ErrorBox.jsx";

export default function QualityGate() {
  const [data, setData] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeCheckIndex, setActiveCheckIndex] = useState(-1); // -1 = idle/all passed
  const [err, setErr] = useState(null);

  const loadQualityGate = useCallback(() => {
    api.qualityGate()
      .then(setData)
      .catch(setErr);
  }, []);

  useEffect(() => {
    loadQualityGate();
  }, [loadQualityGate]);

  const handleRunGate = async () => {
    setRunning(true);
    setActiveCheckIndex(0);

    for (let i = 0; i < (data?.checks?.length || 5); i++) {
      setActiveCheckIndex(i);
      await new Promise((r) => setTimeout(r, 400));
    }

    setActiveCheckIndex(-1);
    setRunning(false);
    loadQualityGate();
  };

  if (err) return <div className="view"><ErrorBox error={err} /></div>;
  if (!data) return <Loading label="Loading corpus quality gate parameters…" />;

  return (
    <div className="view">
      {/* Header with Step 3 Badge */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: 8,
            background: "#d6a648",
            color: "#0f1725",
            fontSize: 20,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justify: "center",
            marginTop: 2,
          }}
        >
          3
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0 }}>
              Clean, De-duplicate & Quality Gate
            </h2>
            <span className="badge ok" style={{ background: "rgba(214, 166, 72, 0.18)", color: "#d6a648", borderColor: "#d6a648", fontSize: 11 }}>
              Scope: Target Base (FD &gt; ₹10L)
            </span>
          </div>
          <p style={{ fontSize: 14, color: "var(--dim)", marginTop: 6, lineHeight: 1.5, maxWidth: 850 }}>
            With all {data.records_in.toLocaleString("en-IN")} target records (FD &gt; ₹10L base) carrying synthesized feedback text from Gen AI synthesis, the target corpus is cleaned before it enters the RAG pipeline. Run the gate to see each check execute.
          </p>
        </div>

        <button
          onClick={handleRunGate}
          disabled={running}
          style={{
            background: running ? "var(--panel3)" : "linear-gradient(135deg, var(--gold), #b5862e)",
            color: running ? "var(--mut)" : "#0f1725",
            fontWeight: 800,
            padding: "10px 22px",
            borderRadius: 8,
            fontSize: 13.5,
            border: "none",
            cursor: running ? "not-allowed" : "pointer",
            boxShadow: running ? "none" : "0 4px 14px rgba(214, 166, 72, 0.3)",
          }}
        >
          {running ? "Executing Quality Gate..." : "⚡ Run Quality Gate Checks"}
        </button>
      </div>

      <div className="rule" style={{ marginBottom: 24 }} />

      {/* Metric Cards (4 Cards Grid) */}
      <div className="grid g4" style={{ marginBottom: 24 }}>
        <div
          className="stat"
          style={{
            padding: "20px 24px",
            background: "#0d131f",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
          }}
        >
          <div className="sv" style={{ fontSize: 32, fontWeight: 900, color: "#ffffff" }}>
            {data.records_in.toLocaleString("en-IN")}
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
            TARGET RECORDS IN (FD &gt; ₹10L)
          </div>
        </div>

        <div
          className="stat"
          style={{
            padding: "20px 24px",
            background: "#0d131f",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
          }}
        >
          <div className="sv" style={{ fontSize: 32, fontWeight: 900, color: "#d1584f" }}>
            {data.dropped.toLocaleString("en-IN")}
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
            DROPPED
          </div>
        </div>

        <div
          className="stat"
          style={{
            padding: "20px 24px",
            background: "#0d131f",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
          }}
        >
          <div className="sv" style={{ fontSize: 32, fontWeight: 900, color: "#4ea884" }}>
            {data.records_out.toLocaleString("en-IN")}
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
            CLEAN TARGET RECORDS OUT
          </div>
        </div>

        <div
          className="stat"
          style={{
            padding: "20px 24px",
            background: "#0d131f",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
          }}
        >
          <div className="sv" style={{ fontSize: 32, fontWeight: 900, color: "#d6a648" }}>
            {data.quality_score}%
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
            QUALITY SCORE
          </div>
        </div>
      </div>

      {/* Quality Check Execution Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {data.checks.map((c, idx) => {
          const isPassed = activeCheckIndex > idx || (!running && activeCheckIndex === -1);
          const isCurrent = running && activeCheckIndex === idx;

          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                background: "#0d131f",
                border: isCurrent ? "1px solid var(--gold)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: isPassed ? "#4ea884" : isCurrent ? "#d6a648" : "#3e4856",
                    boxShadow: isPassed ? "0 0 10px rgba(78, 168, 132, 0.6)" : isCurrent ? "0 0 10px rgba(214, 166, 72, 0.6)" : "none",
                    transition: "all 0.2s ease",
                  }}
                />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
                  {c.title}
                </span>
              </div>

              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: isPassed ? "#4ea884" : isCurrent ? "var(--gold)" : "var(--dim)",
                }}
                className="mono"
              >
                {isPassed ? `✓ ${c.detail}` : isCurrent ? "Checking..." : "Pending"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Step Transition Banner */}
      <div
        className="card"
        style={{
          marginTop: 28,
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--panel2), var(--panel3))",
          border: "1px solid var(--ok)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div className="badge ok" style={{ display: "inline-block", marginBottom: 6 }}>Next Pipeline Step</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
            Proceed to RAG Vector Processing Pipeline Architecture
          </h3>
          <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 4, maxWidth: 650 }}>
            With {data.records_out.toLocaleString("en-IN")} records cleaned, deduplicated, and validated through the Quality Gate, proceed to build document chunks, vector embeddings, and HNSW vector index.
          </p>
        </div>

        <Link
          to="/rag-pipeline"
          style={{
            background: "linear-gradient(135deg, var(--ok), #367d5e)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            padding: "12px 24px",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(78, 168, 132, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Go to RAG Pipeline →
        </Link>
      </div>
    </div>
  );
}
