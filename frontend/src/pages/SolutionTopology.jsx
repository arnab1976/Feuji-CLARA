import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SolutionTopology() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("visual"); // "visual" or "code"

  return (
    <div className="view" style={{ maxWidth: 1380, padding: "16px 24px 40px" }}>
      {/* Sleek Header Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(214, 166, 72, 0.18), rgba(23, 34, 54, 0.95), rgba(66, 133, 244, 0.12))",
          border: "1px solid rgba(214, 166, 72, 0.4)",
          borderRadius: 10,
          padding: "16px 22px",
          marginBottom: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  background: "var(--gold)",
                  color: "#0f1725",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  fontWeight: 900,
                  padding: "2px 8px",
                  borderRadius: 4,
                  letterSpacing: "0.06em",
                }}
              >
                SYSTEM ARCHITECTURE TOPOLOGY
              </span>
              <span style={{ color: "var(--ok)", fontWeight: 800, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                ● END-TO-END BLUEPRINT
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.4px", margin: 0 }}>
              CLARA Platform Solution Architecture &amp; Data Pipeline Topology
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* View Mode Toggle */}
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 20, padding: 3, border: "1px solid var(--line-soft)" }}>
              <button
                onClick={() => setViewMode("visual")}
                style={{
                  padding: "5px 14px",
                  borderRadius: 16,
                  fontSize: 11.5,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "visual" ? "#4285F4" : "transparent",
                  color: viewMode === "visual" ? "#fff" : "var(--dim)",
                }}
              >
                🎨 Visual Topology Diagram
              </button>
              <button
                onClick={() => setViewMode("code")}
                style={{
                  padding: "5px 14px",
                  borderRadius: 16,
                  fontSize: 11.5,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "code" ? "#4285F4" : "transparent",
                  color: viewMode === "code" ? "#fff" : "var(--dim)",
                }}
              >
                ⚙️ Flowchart Definition
              </button>
            </div>

            <button
              onClick={() => navigate("/upload")}
              style={{
                background: "linear-gradient(135deg, var(--gold), #b5862e)",
                color: "#0f1725",
                fontWeight: 900,
                fontSize: 13,
                padding: "8px 20px",
                borderRadius: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 14px rgba(214, 166, 72, 0.4)",
                cursor: "pointer",
                border: "none",
              }}
            >
              Proceed to Upload Dataset →
            </button>
          </div>
        </div>
      </div>

      {/* VISUAL TOPOLOGY DIAGRAM MODE */}
      {viewMode === "visual" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          {/* ZONE A: Data Ingestion & Quality Pipeline */}
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              background: "rgba(66, 133, 244, 0.04)",
              border: "1.5px solid rgba(66, 133, 244, 0.4)",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(66, 133, 244, 0.2)", pb: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#4285F4", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>
                ZONE A: DATA INGESTION &amp; QUALITY PIPELINE
              </span>
              <span style={{ fontSize: 10, background: "rgba(66, 133, 244, 0.15)", color: "#4285F4", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                Phase 1 &amp; Phase 2
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "10px 18px", borderRadius: 8, textAlign: "center", width: "80%" }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>10,000 Customer Cohort (FD &gt; ₹10L)</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>Demographics &amp; Interaction Records</div>
              </div>

              <div style={{ color: "#4285F4", fontSize: 11, fontWeight: 800 }}>↓ Upload API &amp; Synthesizer</div>

              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "10px 18px", borderRadius: 8, textAlign: "center", width: "80%" }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>Gen AI Interaction Synthesizer</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>Structured Feedback Records (OpenAI / Claude)</div>
              </div>

              <div style={{ color: "#4285F4", fontSize: 11, fontWeight: 800 }}>↓ Structured Records</div>

              <div style={{ background: "rgba(66, 133, 244, 0.12)", border: "1px solid rgba(66, 133, 244, 0.5)", padding: "10px 18px", borderRadius: 8, textAlign: "center", width: "85%" }}>
                <div style={{ color: "#4285F4", fontWeight: 900, fontSize: 13 }}>5-Rule Quality Gate</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>Schema Validation • Range Integrity • Deduplication • Format Standards • Value Range Audit</div>
              </div>
            </div>
          </div>

          <div style={{ color: "#34A853", fontSize: 14, fontWeight: 900 }}>↓ Verified Profiles (Clean Customer Data)</div>

          {/* ZONE B: RAG Vector Memory Subsystem */}
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              background: "rgba(52, 168, 83, 0.04)",
              border: "1.5px solid rgba(52, 168, 83, 0.4)",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(52, 168, 83, 0.2)", pb: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#34A853", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>
                ZONE B: RAG VECTOR MEMORY SUBSYSTEM
              </span>
              <span style={{ fontSize: 10, background: "rgba(52, 168, 83, 0.15)", color: "#34A853", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                Phase 3 (Embeddings &amp; Vector DB)
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "10px 18px", borderRadius: 8, textAlign: "center", width: "80%" }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>Profile Chunker &amp; SentenceTransformers</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>Model: <code>all-mpnet-base-v2</code> (768-dimensional Float Vectors)</div>
              </div>

              <div style={{ color: "#34A853", fontSize: 11, fontWeight: 800 }}>↓ 768-dim Vector Floats</div>

              <div style={{ background: "rgba(52, 168, 83, 0.12)", border: "1px solid rgba(52, 168, 83, 0.5)", padding: "10px 18px", borderRadius: 8, textAlign: "center", width: "85%" }}>
                <div style={{ color: "#34A853", fontWeight: 900, fontSize: 13 }}>PostgreSQL 16 + pgvector</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>HNSW Cosine Similarity Vector Index (Port 5432)</div>
              </div>
            </div>
          </div>

          <div style={{ color: "#EA4335", fontSize: 14, fontWeight: 900 }}>↓ Filtered Active Cohort</div>

          {/* ZONE C: AI Reasoning & Nudge Engine */}
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              background: "rgba(234, 67, 53, 0.04)",
              border: "1.5px solid rgba(234, 67, 53, 0.4)",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(234, 67, 53, 0.2)", pb: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#EA4335", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>
                ZONE C: AI REASONING &amp; NUDGE ENGINE
              </span>
              <span style={{ fontSize: 10, background: "rgba(234, 67, 53, 0.15)", color: "#EA4335", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                Phase 4 &amp; Phase 5
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "10px 18px", borderRadius: 8, textAlign: "center", width: "80%" }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>Cross-Sell Propensity Scoring Model</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>Scores target customers and ranks RM Work Queue</div>
              </div>

              <div style={{ color: "#EA4335", fontSize: 11, fontWeight: 800 }}>↓ RAG Top-K Vector Retrieval</div>

              <div style={{ background: "rgba(234, 67, 53, 0.12)", border: "1px solid rgba(234, 67, 53, 0.5)", padding: "10px 18px", borderRadius: 8, textAlign: "center", width: "85%" }}>
                <div style={{ color: "#EA4335", fontWeight: 900, fontSize: 13 }}>OpenAI gpt-4o-mini Reasoning Engine</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>Grounded Rationale Synthesis • Term-Life, Health, ULIP, MF, Pension Recommendations</div>
              </div>
            </div>
          </div>

          <div style={{ color: "#FBBC05", fontSize: 14, fontWeight: 900 }}>↓ Recommendation Audit</div>

          {/* ZONE D: Dual-Perspective Validation Engine */}
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              background: "rgba(251, 188, 5, 0.04)",
              border: "1.5px solid rgba(251, 188, 5, 0.4)",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(251, 188, 5, 0.2)", pb: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#FBBC05", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>
                ZONE D: DUAL-PERSPECTIVE VALIDATION ENGINE
              </span>
              <span style={{ fontSize: 10, background: "rgba(251, 188, 5, 0.15)", color: "#FBBC05", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                Phase 6
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--panel)", border: "1px solid rgba(251, 188, 5, 0.3)", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ color: "#FBBC05", fontWeight: 800, fontSize: 12.5 }}>Global Wealth Perspective</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>Risk-Adjusted Yield &amp; Portfolio Allocation Standards</div>
              </div>

              <div style={{ background: "var(--panel)", border: "1px solid rgba(251, 188, 5, 0.3)", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ color: "#FBBC05", fontWeight: 800, fontSize: 12.5 }}>India Banking Context</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>RBI Guidelines • SEBI Norms • Tax Exemption 80C</div>
              </div>
            </div>
          </div>

          <div style={{ color: "#AB47BC", fontSize: 14, fontWeight: 900 }}>↓ Cloud Run Hosting &amp; VPC Database Connection</div>

          {/* ZONE E: GCP Production Cloud Infrastructure ($0.00 Always Free) */}
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              background: "rgba(171, 71, 188, 0.04)",
              border: "1.5px solid rgba(171, 71, 188, 0.4)",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(171, 71, 188, 0.2)", pb: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#AB47BC", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>
                ZONE E: GCP PRODUCTION CLOUD INFRASTRUCTURE ($0.00 ALWAYS FREE)
              </span>
              <span style={{ fontSize: 10, background: "rgba(171, 71, 188, 0.15)", color: "#AB47BC", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                Serverless Cloud Architecture
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: 12, borderRadius: 8 }}>
                <div style={{ color: "#4285F4", fontWeight: 800, fontSize: 12 }}>xsell-db-vm</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                  Compute Engine e2-micro VM (PostgreSQL 16 + pgvector container, VPC Port 5432)
                </div>
              </div>

              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: 12, borderRadius: 8 }}>
                <div style={{ color: "#EA4335", fontWeight: 800, fontSize: 12 }}>feuji-clara-backend</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                  Cloud Run Backend Service (Django 5 REST API, Port 8000, Auto-scales 0 to N)
                </div>
              </div>

              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: 12, borderRadius: 8 }}>
                <div style={{ color: "#34A853", fontWeight: 800, fontSize: 12 }}>feuji-clara-frontend</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                  Cloud Run Frontend Service (React 18 SPA + Nginx Web Server, Port 8080/80)
                </div>
              </div>

              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: 12, borderRadius: 8 }}>
                <div style={{ color: "#FBBC05", fontWeight: 800, fontSize: 12 }}>CI/CD Deployment</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                  GitHub Repo → Google Cloud Build → Artifact Registry (xsell-repo)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CODE / FLOWCHART DEFINITION MODE */}
      {viewMode === "code" && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--gold)", fontWeight: 800 }}>
              ✦ END-TO-END SOLUTION ARCHITECTURE &amp; DEPLOYMENT FLOWCHART
            </span>
            <span style={{ fontSize: 10, color: "var(--ok)", fontFamily: "JetBrains Mono, monospace" }}>
              ● Verified Enterprise Architecture
            </span>
          </div>
          <pre
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              color: "#9098b0",
              whiteSpace: "pre-wrap",
              lineHeight: 1.4,
              margin: 0,
              background: "var(--ink)",
              border: "1px solid var(--line-soft)",
              borderRadius: 6,
              padding: 12,
            }}
          >
{`flowchart TD
    subgraph ZoneA["ZONE A: Data Ingestion & Quality Pipeline"]
        RawCSV["10,000 Customer Dataset (FD > ₹10L)"] -->|Upload API| IngestEngine["Ingestion Engine"]
        IngestEngine -->|Raw Notes| GenAISynth["Gen AI Interaction Synthesizer"]
        GenAISynth -->|Structured Records| QualityGate["5-Rule Quality Gate"]
    end

    subgraph ZoneB["ZONE B: RAG Vector Memory Subsystem"]
        QualityGate -->|Verified Profiles| ProfileChunker["SentenceTransformers Embedder (all-mpnet-base-v2)"]
        ProfileChunker -->|768-dim Floats| PGVector["PostgreSQL 16 + pgvector (HNSW Index)"]
    end

    subgraph ZoneC["ZONE C: AI Reasoning & Nudge Engine"]
        PGVector -->|Active Cohort| PropensityScorer["Propensity Scorer"] --> NudgeQueue["RM Nudge Work Queue"]
        NudgeQueue -->|RAG Vector Retrieval| LLMReasoning["OpenAI gpt-4o-mini Reasoning Engine"]
        LLMReasoning -->|Grounded Rationale| FinalNudge["Targeted Product Recommendations"]
    end

    subgraph ZoneD["ZONE D: Dual-Perspective Validation"]
        FinalNudge --> AuditEngine["Dual-Perspective Audit"]
        AuditEngine --> GlobalAudit["Global Wealth Best Practices"]
        AuditEngine --> IndiaAudit["India Banking Context (RBI / SEBI / Tax 80C)"]
    end

    subgraph ZoneE["ZONE E: GCP Production Cloud Infrastructure ($0.00 Always Free)"]
        DB_VM["xsell-db-vm (Compute Engine e2-micro VM, PostgreSQL + pgvector)"]
        BackendContainer["feuji-clara-backend (Cloud Run Django API, Port 8000)"]
        FrontendContainer["feuji-clara-frontend (Cloud Run React SPA, Port 8080/80)"]
        GitHub["GitHub Repo: Arnab-Feuji/Feuji-CLARA"] --> CloudBuild["Google Cloud Build"] --> ArtifactRegistry["Artifact Registry"]
        ArtifactRegistry --> BackendContainer
        ArtifactRegistry --> FrontendContainer
    end

    PGVector -.->|VPC Port 5432| DB_VM
    FrontendContainer -->|REST API| BackendContainer`}
          </pre>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div
        style={{
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          background: "var(--panel2)",
          border: "1px solid var(--gold)",
          borderRadius: 8,
          padding: "12px 20px",
          marginTop: 20,
        }}
      >
        <div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Ready to execute the data pipeline?</span>
          <span style={{ fontSize: 11.5, color: "var(--dim)", display: "block" }}>
            Proceed to Phase 1: Upload Dataset &amp; Demographics Ingestion
          </span>
        </div>
        <button
          onClick={() => navigate("/upload")}
          style={{
            background: "linear-gradient(135deg, var(--gold), #b5862e)",
            color: "#0f1725",
            fontWeight: 900,
            fontSize: 13,
            padding: "8px 20px",
            borderRadius: 6,
            cursor: "pointer",
            border: "none",
            boxShadow: "0 3px 10px rgba(214, 166, 72, 0.35)",
          }}
        >
          Proceed to Upload Dataset →
        </button>
      </div>
    </div>
  );
}
