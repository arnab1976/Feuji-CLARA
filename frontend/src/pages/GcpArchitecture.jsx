import { useState } from "react";

export default function GcpArchitecture() {
  const [activeSection, setActiveSection] = useState("all");
  const [copiedUrl, setCopiedUrl] = useState("");

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(""), 2000);
  };

  return (
    <div className="view" style={{ maxWidth: 1380, padding: "16px 24px 40px" }}>
      {/* Sleek Compact Header */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(23, 34, 54, 0.95), rgba(54, 179, 126, 0.1))",
          border: "1px solid rgba(66, 133, 244, 0.35)",
          borderRadius: 10,
          padding: "14px 20px",
          marginBottom: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  background: "#4285F4",
                  color: "#fff",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 4,
                  letterSpacing: "0.06em",
                }}
              >
                END-TO-END SOLUTION ARCHITECTURE
              </span>
              <span style={{ color: "#34A853", fontWeight: 800, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                ● 100% ALWAYS FREE GCP TIER ($0.00/MO)
              </span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.4px", margin: 0 }}>
              CLARA Cloud System Architecture &amp; Deployment Manual
            </h1>
          </div>

          {/* Inline Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href="https://feuji-clara-backend-351505823409.us-central1.run.app/api/health/"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "rgba(214, 166, 72, 0.15)",
                border: "1px solid rgba(214, 166, 72, 0.4)",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--gold)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                textDecoration: "none",
              }}
            >
              <span>⚙️ Cloud Run Backend ↗</span>
            </a>
            <a
              href="https://github.com/Arnab-Feuji/Feuji-CLARA"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid var(--line)",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: "JetBrains Mono, monospace",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                textDecoration: "none",
              }}
            >
              <span>🐙 GitHub Repo ↗</span>
            </a>
          </div>
        </div>

        {/* Compact Navigation Bar */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
          {[
            { id: "all", label: "Overview & All Sections" },
            { id: "topology", label: "1. Architecture Topology" },
            { id: "matrix", label: "2. GCP Tools Matrix" },
            { id: "connections", label: "3. Connection & Environment Map" },
            { id: "guide", label: "4. Step-by-Step Deployment Guide" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                padding: "4px 12px",
                borderRadius: 14,
                fontSize: 11.5,
                fontWeight: 700,
                background: activeSection === tab.id ? "#4285F4" : "rgba(255, 255, 255, 0.05)",
                color: activeSection === tab.id ? "#fff" : "var(--dim)",
                border: "1px solid",
                borderColor: activeSection === tab.id ? "#4285F4" : "transparent",
                cursor: "pointer",
                transition: "0.12s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: END-TO-END SOLUTION ARCHITECTURE TOPOLOGY */}
      {(activeSection === "all" || activeSection === "topology") && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 4, height: 18, background: "#4285F4", borderRadius: 2 }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>
              1. End-to-End Solution Architecture &amp; Execution Topology
            </h2>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 18px" }}>
            {/* 5 Architectural Zone Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 14 }}>
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

            {/* Mermaid Solution Architecture Code Box */}
            <div style={{ background: "var(--ink)", border: "1px solid var(--line-soft)", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "var(--mut)", fontWeight: 700 }}>
                  SOLUTION ARCHITECTURE &amp; DEPLOYMENT FLOWCHART
                </span>
                <span style={{ fontSize: 10, color: "var(--gold)", fontFamily: "JetBrains Mono, monospace" }}>
                  End-to-End Enterprise Flow
                </span>
              </div>
              <pre
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10.5,
                  color: "#9098b0",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.4,
                  margin: 0,
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
          </div>
        </div>
      )}

      {/* SECTION 2: GCP TOOLS MATRIX */}
      {(activeSection === "all" || activeSection === "matrix") && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 4, height: 18, background: "#FBBC05", borderRadius: 2 }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>
              2. GCP Tools &amp; Hardware Specifications Matrix
            </h2>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--panel2)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px 12px", color: "var(--gold)", fontWeight: 800, textAlign: "left" }}>GCP Service</th>
                  <th style={{ padding: "8px 12px", color: "#fff", fontWeight: 800, textAlign: "left" }}>Resource Name</th>
                  <th style={{ padding: "8px 12px", color: "#fff", fontWeight: 800, textAlign: "left" }}>Hardware Specs</th>
                  <th style={{ padding: "8px 12px", color: "#fff", fontWeight: 800, textAlign: "left" }}>Port / Protocol</th>
                  <th style={{ padding: "8px 12px", color: "#fff", fontWeight: 800, textAlign: "left" }}>Free Tier Allowance</th>
                  <th style={{ padding: "8px 12px", color: "#34A853", fontWeight: 800, textAlign: "right" }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#4285F4" }}>Google Compute Engine</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>xsell-db-vm</td>
                  <td style={{ padding: "8px 12px" }}>e2-micro (2 vCPU, 1 GB RAM, 30 GB Disk + 2GB Swap)</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>TCP / 5432</td>
                  <td style={{ padding: "8px 12px", color: "var(--dim)" }}>1 instance/mo (us-central1 free tier)</td>
                  <td style={{ padding: "8px 12px", color: "#34A853", fontWeight: 800, textAlign: "right" }}>$0.00</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#EA4335" }}>Google Cloud Run (Backend)</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>feuji-clara-backend</td>
                  <td style={{ padding: "8px 12px" }}>1 vCPU, 1 GiB RAM (Auto-scaling 0 to N)</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>HTTP/REST / 8000</td>
                  <td style={{ padding: "8px 12px", color: "var(--dim)" }}>2M req/mo, 180k vCPU-sec, 360k GiB-sec</td>
                  <td style={{ padding: "8px 12px", color: "#34A853", fontWeight: 800, textAlign: "right" }}>$0.00</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#4285F4" }}>Google Cloud Run (Frontend)</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>feuji-clara-frontend</td>
                  <td style={{ padding: "8px 12px" }}>1 vCPU, 512 MiB RAM (Nginx SPA web server)</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>HTTPS / 8080 (80)</td>
                  <td style={{ padding: "8px 12px", color: "var(--dim)" }}>Shared Cloud Run free tier pool</td>
                  <td style={{ padding: "8px 12px", color: "#34A853", fontWeight: 800, textAlign: "right" }}>$0.00</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#FBBC05" }}>Google Cloud Build</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>GitHub Trigger</td>
                  <td style={{ padding: "8px 12px" }}>Automated Docker Builder</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>Git Webhook</td>
                  <td style={{ padding: "8px 12px", color: "var(--dim)" }}>120 build-minutes per day free</td>
                  <td style={{ padding: "8px 12px", color: "#34A853", fontWeight: 800, textAlign: "right" }}>$0.00</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#AB47BC" }}>Artifact Registry</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>xsell-repo</td>
                  <td style={{ padding: "8px 12px" }}>Docker Image Repository (us-central1)</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>gcr.io / pkg.dev</td>
                  <td style={{ padding: "8px 12px", color: "var(--dim)" }}>0.5 GB storage per month free</td>
                  <td style={{ padding: "8px 12px", color: "#34A853", fontWeight: 800, textAlign: "right" }}>$0.00</td>
                </tr>

                <tr>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#FF6F00" }}>Firebase &amp; GCP IAM</td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>Feuji-CLARA</td>
                  <td style={{ padding: "8px 12px" }}>Project ID: <code>oval-tributary-463011-f8</code></td>
                  <td style={{ padding: "8px 12px", fontFamily: "JetBrains Mono, monospace" }}>#351505823409</td>
                  <td style={{ padding: "8px 12px", color: "var(--dim)" }}>10 GB storage, 360 MB/day egress + ₹28.6k Trial</td>
                  <td style={{ padding: "8px 12px", color: "#34A853", fontWeight: 800, textAlign: "right" }}>$0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: CONNECTION & ENVIRONMENT MAP */}
      {(activeSection === "all" || activeSection === "connections") && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 4, height: 18, background: "#34A853", borderRadius: 2 }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>
              3. Connection Topologies &amp; Environment Variables
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
            {/* Endpoints Card */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
                📡 Live Production Endpoints
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ color: "var(--mut)", fontSize: 10, fontWeight: 800, marginBottom: 2 }}>BACKEND REST API</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <code style={{ background: "var(--ink)", padding: "4px 8px", borderRadius: 4, color: "var(--gold)", flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                      https://feuji-clara-backend-351505823409.us-central1.run.app/api/
                    </code>
                    <button
                      onClick={() => copyToClipboard("https://feuji-clara-backend-351505823409.us-central1.run.app/api/", "backend")}
                      style={{ background: "var(--panel2)", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: 4, fontSize: 10, color: "#fff", cursor: "pointer" }}
                    >
                      {copiedUrl === "backend" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ color: "var(--mut)", fontSize: 10, fontWeight: 800, marginBottom: 2 }}>FRONTEND WEB APPLICATION</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <code style={{ background: "var(--ink)", padding: "4px 8px", borderRadius: 4, color: "#4285F4", flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                      https://feuji-clara-frontend-351505823409.us-central1.run.app
                    </code>
                    <button
                      onClick={() => copyToClipboard("https://feuji-clara-frontend-351505823409.us-central1.run.app", "frontend")}
                      style={{ background: "var(--panel2)", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: 4, fontSize: 10, color: "#fff", cursor: "pointer" }}
                    >
                      {copiedUrl === "frontend" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ color: "var(--mut)", fontSize: 10, fontWeight: 800, marginBottom: 2 }}>POSTGRESQL DATABASE INTERNAL VPC IP</div>
                  <code style={{ background: "var(--ink)", padding: "4px 8px", borderRadius: 4, color: "#34A853", display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                    10.128.0.x:5432 (Internal Compute Engine VPC Network)
                  </code>
                </div>
              </div>
            </div>

            {/* Environment Variables Card */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
                ⚙️ Backend Environment Variables (Cloud Run)
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "4px 6px", color: "var(--gold)", textAlign: "left" }}>Variable Name</th>
                    <th style={{ padding: "4px 6px", color: "#fff", textAlign: "left" }}>Configured Value / Function</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "4px 6px", color: "var(--dim)" }}>POSTGRES_HOST</td>
                    <td style={{ padding: "4px 6px", color: "#34A853" }}>Internal VM IP (e.g. 10.128.0.2)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "4px 6px", color: "var(--dim)" }}>POSTGRES_DB</td>
                    <td style={{ padding: "4px 6px", color: "#fff" }}>crosssell</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "4px 6px", color: "var(--dim)" }}>POSTGRES_USER</td>
                    <td style={{ padding: "4px 6px", color: "#fff" }}>crosssell</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "4px 6px", color: "var(--dim)" }}>LLM_PROVIDER</td>
                    <td style={{ padding: "4px 6px", color: "#FBBC05" }}>openai</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "4px 6px", color: "var(--dim)" }}>OPENAI_MODEL</td>
                    <td style={{ padding: "4px 6px", color: "#FBBC05" }}>gpt-4o-mini</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 6px", color: "var(--dim)" }}>OPENAI_API_KEY</td>
                    <td style={{ padding: "4px 6px", color: "#EA4335" }}>sk-proj-... (Encrypted API Key)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: STEP-BY-STEP DEPLOYMENT GUIDE */}
      {(activeSection === "all" || activeSection === "guide") && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 4, height: 18, background: "#EA4335", borderRadius: 2 }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>
              4. Step-by-Step Production Deployment Guide
            </h2>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 20px" }}>
            {[
              {
                phase: "PHASE 1: GCP PROJECT SETUP & SOURCE COMMIT",
                color: "#4285F4",
                steps: [
                  "Create GCP Project ID: oval-tributary-463011-f8 (Project #351505823409).",
                  "Push workspace codebase to GitHub: https://github.com/Arnab-Feuji/Feuji-CLARA (branch main).",
                  "Verify frontend/.env.production points to VITE_API_BASE=https://feuji-clara-backend-351505823409.us-central1.run.app/api.",
                ],
              },
              {
                phase: "PHASE 2: DATABASE VM DEPLOYMENT (Compute Engine e2-micro)",
                color: "#34A853",
                steps: [
                  "Compute Engine > VM Instances > Create Instance: Name xsell-db-vm | Region us-central1.",
                  "Machine Type: e2-micro (2 vCPU, 1 GB RAM, 30 GB Standard Persistent Disk + 2GB Swap).",
                  "Startup script installs Docker and launches pgvector/pgvector:pg16 container on port 5432.",
                ],
              },
              {
                phase: "PHASE 3: BACKEND SERVICE DEPLOYMENT (Cloud Run)",
                color: "#EA4335",
                steps: [
                  "Cloud Run > Create Service: Name feuji-clara-backend | Region us-central1 | Container Port: 8000 | Memory: 1 GiB.",
                  "Source: GitHub repository Arnab-Feuji/Feuji-CLARA > Build via backend/Dockerfile.",
                  "Set Environment Variables: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, LLM_PROVIDER, OPENAI_MODEL, OPENAI_API_KEY.",
                ],
              },
              {
                phase: "PHASE 4: FRONTEND APPLICATION DEPLOYMENT (Cloud Run)",
                color: "#FBBC05",
                steps: [
                  "Cloud Run > Create Service: Name feuji-clara-frontend | Region us-central1 | Container Port: 8080.",
                  "Source: GitHub repository Arnab-Feuji/Feuji-CLARA > Build via frontend/Dockerfile.",
                  "Nginx configuration dynamically binds to Cloud Run port 8080 via official default.conf.template.",
                ],
              },
              {
                phase: "PHASE 5: AUTOMATED DB MIGRATION & DATASET INITIALIZATION",
                color: "#AB47BC",
                steps: [
                  "Backend container features automatic database initializer in backend/api/apps.py.",
                  "On container boot, Django executes python manage.py migrate and loads 10,000 customer records from customers.csv.",
                  "Health endpoint https://feuji-clara-backend-351505823409.us-central1.run.app/api/health/ returns status: ok.",
                ],
              },
            ].map((p, idx) => (
              <div key={idx} style={{ marginBottom: idx < 4 ? 14 : 0, borderBottom: idx < 4 ? "1px solid var(--line-soft)" : "none", paddingBottom: idx < 4 ? 12 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: p.color, letterSpacing: "0.06em", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
                  {p.phase}
                </div>
                <ul style={{ paddingLeft: 18, color: "var(--text)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {p.steps.map((st, sIdx) => (
                    <li key={sIdx} style={{ marginBottom: 2 }}>
                      {st}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
