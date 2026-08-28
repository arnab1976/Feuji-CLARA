import { useNavigate } from "react";

export default function SolutionTopology() {
  const navigate = useNavigate();

  return (
    <div className="view" style={{ maxWidth: 1380, padding: "16px 24px 40px" }}>
      {/* Sleek Compact Header */}
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
                PHASE 0: SYSTEM BLUEPRINT
              </span>
              <span style={{ color: "var(--ok)", fontWeight: 800, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                ● END-TO-END SOLUTION ARCHITECTURE TOPOLOGY
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.4px", margin: 0 }}>
              CLARA Platform Solution Architecture &amp; Data Pipeline Topology
            </h1>
            <p style={{ color: "var(--dim)", fontSize: 12.5, margin: "4px 0 0 0", maxWidth: 900 }}>
              Complete architectural blueprint governing raw customer ingestion, 5-rule quality validation, 768-dim RAG vector indexing, OpenAI LLM reasoning, and dual-perspective global vs. India compliance.
            </p>
          </div>

          <button
            onClick={() => navigate("/upload")}
            style={{
              background: "linear-gradient(135deg, var(--gold), #b5862e)",
              color: "#0f1725",
              fontWeight: 900,
              fontSize: 13,
              padding: "10px 22px",
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(214, 166, 72, 0.4)",
              cursor: "pointer",
              border: "none",
            }}
          >
            Proceed to Upload Dataset →
          </button>
        </div>
      </div>

      {/* 5 Architectural Zone Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "var(--panel2)", border: "1px solid rgba(66, 133, 244, 0.4)", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 10.5, color: "#4285F4" }}>ZONE A: INGESTION &amp; QUALITY</span>
            <span style={{ fontSize: 9, background: "rgba(66, 133, 244, 0.2)", color: "#4285F4", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono, monospace" }}>
              PIPELINE
            </span>
          </div>
          <h4 style={{ color: "#fff", fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
            CSV Ingest &amp; 5-Rule Gate
          </h4>
          <p style={{ fontSize: 11, color: "var(--dim)", margin: 0, lineHeight: 1.35 }}>
            Parses 10,000 synthetic FD cohort (&gt; ₹10L), synthesizes unstructured notes, and executes 5-rule quality audit.
          </p>
        </div>

        <div style={{ background: "var(--panel2)", border: "1px solid rgba(52, 168, 83, 0.4)", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 10.5, color: "#34A853" }}>ZONE B: RAG VECTOR MEMORY</span>
            <span style={{ fontSize: 9, background: "rgba(52, 168, 83, 0.2)", color: "#34A853", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono, monospace" }}>
              PGVECTOR
            </span>
          </div>
          <h4 style={{ color: "#fff", fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
            SentenceTransformers (768-dim)
          </h4>
          <p style={{ fontSize: 11, color: "var(--dim)", margin: 0, lineHeight: 1.35 }}>
            Generates vector embeddings using <code>all-mpnet-base-v2</code> and indexes profiles in PostgreSQL HNSW vector DB.
          </p>
        </div>

        <div style={{ background: "var(--panel2)", border: "1px solid rgba(234, 67, 53, 0.4)", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 10.5, color: "#EA4335" }}>ZONE C: AI NUDGE REASONING</span>
            <span style={{ fontSize: 9, background: "rgba(234, 67, 53, 0.2)", color: "#EA4335", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono, monospace" }}>
              LLM ENGINE
            </span>
          </div>
          <h4 style={{ color: "#fff", fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
            OpenAI gpt-4o-mini RAG
          </h4>
          <p style={{ fontSize: 11, color: "var(--dim)", margin: 0, lineHeight: 1.35 }}>
            Calculates propensity scores, ranks Nudge Queue, and synthesizes grounded natural language cross-sell recommendations.
          </p>
        </div>

        <div style={{ background: "var(--panel2)", border: "1px solid rgba(251, 188, 5, 0.4)", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 10.5, color: "#FBBC05" }}>ZONE D: DUAL VALIDATION</span>
            <span style={{ fontSize: 9, background: "rgba(251, 188, 5, 0.2)", color: "#FBBC05", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono, monospace" }}>
              AUDIT
            </span>
          </div>
          <h4 style={{ color: "#fff", fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
            Global vs. India Audit
          </h4>
          <p style={{ fontSize: 11, color: "var(--dim)", margin: 0, lineHeight: 1.35 }}>
            Audits recommendations against Global Wealth standards and India-specific regulatory context (RBI, SEBI, Tax 80C).
          </p>
        </div>

        <div style={{ background: "var(--panel2)", border: "1px solid rgba(171, 71, 188, 0.4)", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 10.5, color: "#AB47BC" }}>ZONE E: GCP CLOUD INFRA</span>
            <span style={{ fontSize: 9, background: "rgba(171, 71, 188, 0.2)", color: "#AB47BC", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono, monospace" }}>
              SERVERLESS
            </span>
          </div>
          <h4 style={{ color: "#fff", fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
            Cloud Run &amp; Compute Engine
          </h4>
          <p style={{ fontSize: 11, color: "var(--dim)", margin: 0, lineHeight: 1.35 }}>
            Hosts DB on <code>e2-micro</code> VM, backend &amp; frontend on Cloud Run with Cloud Build CI/CD at <b>$0.00 monthly cost</b>.
          </p>
        </div>
      </div>

      {/* Main Solution Architecture Flowchart Terminal */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--gold)", fontWeight: 800 }}>
            🏛️ END-TO-END SOLUTION ARCHITECTURE &amp; DEPLOYMENT FLOWCHART
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
        GitHub["GitHub Repo: Arnab-Feuji/Feuji-CLARA"] --> CloudBuild["Google Cloud Build"] --> ArtifactRegistry["Artifact Registry"] --> BackendContainer & FrontendContainer
    end

    PGVector -.->|VPC Port 5432| DB_VM
    FrontendContainer -->|REST API| BackendContainer`}
        </pre>
      </div>

      {/* Bottom CTA Bar */}
      <div
        style={{
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          background: "var(--panel2)",
          border: "1px solid var(--gold)",
          borderRadius: 8,
          padding: "12px 20px",
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
