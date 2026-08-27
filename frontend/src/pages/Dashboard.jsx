import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div
      className="view"
      style={{
        padding: "14px 28px",
        height: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        maxWidth: 1440,
        margin: "0 auto",
      }}
    >
      {/* Top Header Bar with Tech Stack Badge at Top Right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--gold), var(--feedback))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f1725",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            C
          </div>
          <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "0.5px" }}>
            CLARA <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>| Precision Banking Intelligence</span>
          </span>
        </div>

        {/* Tech Stack & Powered By Badge at Top Right */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 11,
            color: "var(--dim)",
          }}
        >
          <span style={{ color: "var(--gold)", fontWeight: 800 }}>⚡ Powered by</span>
          <span style={{ color: "#fff", fontWeight: 700 }}>GenAI RAG</span> •
          <span style={{ color: "#fff", fontWeight: 700 }}>Vector DB</span> •
          <span style={{ color: "#fff", fontWeight: 700 }}>Django Backend</span> •
          <span style={{ color: "#fff", fontWeight: 700 }}>React UI</span>
        </div>
      </div>

      {/* Hero Section */}
      <div
        className="card"
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #0d1627 0%, #17243c 100%)",
          border: "1px solid rgba(214, 166, 72, 0.4)",
          borderRadius: 12,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
          flexShrink: 0,
        }}
      >
        <div className="grid g2" style={{ alignItems: "stretch", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(214, 166, 72, 0.15)", border: "1px solid var(--gold)", padding: "2px 10px", borderRadius: 16, marginBottom: 8, width: "fit-content" }}>
              <span className="mono" style={{ color: "var(--gold)", fontSize: 10, fontWeight: 800 }}>✦ ENTERPRISE AI PLATFORM</span>
              <span style={{ color: "var(--dim)", fontSize: 10 }}>|</span>
              <span style={{ color: "var(--ok)", fontSize: 10, fontWeight: 700 }}>Bank Cross-Sell Copilot</span>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1.15, marginBottom: 6 }}>
              CLARA: Precision Banking Intelligence
            </h1>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--gold)", marginBottom: 8 }}>
              Cross-sell Lead Analysis &amp; Reasoning Assistant
            </h3>

            <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.45, marginBottom: 12, maxWidth: 600 }}>
              A warm, human-sounding AI co-pilot designed for Bank Relationship Managers to daily analyze customer profiles, synthesize interaction feedback, enforce quality gates, and deliver data-grounded cross-sell recommendations with natural language reasoning.
            </p>

            <div>
              <Link
                to="/upload"
                style={{
                  background: "linear-gradient(135deg, var(--gold), #b5862e)",
                  color: "#0f1725",
                  fontWeight: 900,
                  fontSize: 13,
                  padding: "9px 20px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 3px 10px rgba(214, 166, 72, 0.35)",
                }}
              >
                Upload Dataset &amp; Begin Workflow →
              </Link>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid rgba(214, 166, 72, 0.4)", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.5)", flex: 1, height: "100%", display: "flex" }}>
              <img
                src="/clara_hero_bank.jpg"
                alt="CLARA Banking AI Copilot Assistant"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 140 }}
              />
              <div style={{ position: "absolute", bottom: 0, inset: "auto 0 0 0", background: "linear-gradient(0deg, rgba(11, 17, 28, 0.92) 0%, transparent 100%)", padding: "6px 12px", textAlign: "left" }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#fff" }}>CLARA Banking Copilot Executive Interface</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* End-to-End Architecture & Workflow Sequence Section - Single Horizontal Flow Row */}
      <div style={{ flexShrink: 0, marginTop: 10 }}>
        <div style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }}>
            End-to-End Architecture &amp; Workflow Sequence
          </h3>
          <p style={{ fontSize: 11, color: "var(--dim)", margin: "1px 0 0 0" }}>
            Sequential phases governing data ingestion, synthesis, quality validation, vector indexing, and AI co-pilot reasoning
          </p>
        </div>

        {/* 8 Workflow Phase Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "var(--cap)", marginBottom: 2 }}>INGESTION</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Upload CSV</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Ingests raw customer demographics.
            </p>
          </div>

          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "var(--model)", marginBottom: 2 }}>SYNTHESIS</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Gen AI Synthesis</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Synthesizes customer interaction feedback.
            </p>
          </div>

          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "#d6a648", marginBottom: 2 }}>QUALITY</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Quality Gate</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Enforces 5 quality checks &amp; de-duplication.
            </p>
          </div>

          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "var(--ok)", marginBottom: 2 }}>RAG VECTOR</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>RAG Pipeline</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Chunks profiles into vector embeddings.
            </p>
          </div>

          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "var(--cap)", marginBottom: 2 }}>WORK QUEUE</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Nudge Queue</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Ranks target customers by propensity scores.
            </p>
          </div>

          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid var(--gold)", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "var(--gold)", marginBottom: 2 }}>FINAL OUTPUT</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Recommendations</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Product recommendations with reasoning list.
            </p>
          </div>

          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid #56a0d3", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "#56a0d3", marginBottom: 2 }}>VALIDATION</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Global vs. India</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Dual perspective recommendation audit.
            </p>
          </div>

          <div className="card" style={{ padding: "8px 8px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: "var(--feedback)", marginBottom: 2 }}>RM COPILOT</div>
            <h4 style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", marginBottom: 2 }}>CLARA Chatbot</h4>
            <p style={{ fontSize: 9.5, color: "var(--dim)", margin: 0, lineHeight: 1.25 }}>
              Delivers grounded Q&amp;A &amp; visual charts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
