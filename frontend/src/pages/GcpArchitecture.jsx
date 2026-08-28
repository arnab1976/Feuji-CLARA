import { useState } from "react";

export default function GcpArchitecture() {
  const [activeSection, setActiveSection] = useState("all");

  return (
    <div className="view" style={{ maxWidth: 1320 }}>
      {/* Hero Header */}
      <div
        className="card hero"
        style={{
          background: "linear-gradient(135deg, rgba(66, 133, 244, 0.12), rgba(54, 179, 126, 0.08), rgba(244, 180, 26, 0.06))",
          border: "1px solid rgba(66, 133, 244, 0.3)",
          borderRadius: 14,
          padding: "28px 32px",
          marginBottom: 30,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  background: "#4285F4",
                  color: "#fff",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 6,
                  letterSpacing: "0.08em",
                }}
              >
                GCP PRODUCTION DEPLOYMENT
              </span>
              <span style={{ color: "#34A853", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                ● 100% ALWAYS FREE TIER APPROVED
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
              CLARA Cloud System Architecture &amp; Deployment Manual
            </h1>
            <p style={{ color: "var(--text)", fontSize: 14, maxWidth: 840, lineHeight: 1.6 }}>
              Full architectural blueprint, component mapping, connection topologies, environment variable specifications, and
              reproducible step-by-step instructions for hosting CLARA on Google Cloud Platform at <b>$0.00 monthly cost</b>.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <a
              href="https://feuji-clara-backend-351505823409.us-central1.run.app/api/health/"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "var(--panel2)",
                border: "1px solid var(--line)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--gold)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚙️ Live Cloud Run Backend URL ↗</span>
            </a>
            <a
              href="https://github.com/Arnab-Feuji/Feuji-CLARA"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--line)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--hi)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🐙 GitHub Source Repository ↗</span>
            </a>
          </div>
        </div>

        {/* Quick Filter Navigation */}
        <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
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
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: 700,
                background: activeSection === tab.id ? "#4285F4" : "rgba(255, 255, 255, 0.06)",
                color: activeSection === tab.id ? "#fff" : "var(--dim)",
                border: "1px solid",
                borderColor: activeSection === tab.id ? "#4285F4" : "var(--line)",
                transition: "0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: ARCHITECTURE TOPOLOGY */}
      {(activeSection === "all" || activeSection === "topology") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20, color: "#4285F4" }}>🌐</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>1. Architecture Topology</h2>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", marginBottom: 14 }}>
              System Interaction &amp; Data Flow Diagram
            </h3>

            {/* Visual Box Architecture Representation */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ background: "var(--panel2)", border: "1px solid #4285F4", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#4285F4" }}>LAYER 1: USER / INGRESS</span>
                  <span style={{ fontSize: 10, background: "rgba(66, 133, 244, 0.2)", color: "#4285F4", padding: "2px 6px", borderRadius: 4 }}>
                    HTTPS / Port 443
                  </span>
                </div>
                <h4 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  React 18 + Vite SPA (Nginx)
                </h4>
                <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>
                  Hosted on <b>GCP Cloud Run</b> (or <b>Firebase Hosting</b>). Renders Nudge Queue dashboard, interactive charts, and RM Chatbot UI.
                </p>
              </div>

              <div style={{ background: "var(--panel2)", border: "1px solid #EA4335", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#EA4335" }}>LAYER 2: APPLICATION API</span>
                  <span style={{ fontSize: 10, background: "rgba(234, 67, 53, 0.2)", color: "#EA4335", padding: "2px 6px", borderRadius: 4 }}>
                    Port 8000 / REST
                  </span>
                </div>
                <h4 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  Django 5 + Gunicorn + RAG
                </h4>
                <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>
                  Hosted on <b>GCP Cloud Run</b> (Auto-scaling 0 to N). Handles DRF endpoints, OpenAI LLM calls, and vector retrieval.
                </p>
              </div>

              <div style={{ background: "var(--panel2)", border: "1px solid #34A853", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#34A853" }}>LAYER 3: DATABASE ENGINE</span>
                  <span style={{ fontSize: 10, background: "rgba(52, 168, 83, 0.2)", color: "#34A853", padding: "2px 6px", borderRadius: 4 }}>
                    Port 5432 / TCP
                  </span>
                </div>
                <h4 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  PostgreSQL 16 + pgvector
                </h4>
                <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>
                  Hosted on <b>Compute Engine e2-micro VM</b> (us-central1). Stores 10,000 synthetic customers &amp; 768-dim vector embeddings.
                </p>
              </div>

              <div style={{ background: "var(--panel2)", border: "1px solid #FBBC05", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#FBBC05" }}>LAYER 4: CI/CD PIPELINE</span>
                  <span style={{ fontSize: 10, background: "rgba(251, 188, 5, 0.2)", color: "#FBBC05", padding: "2px 6px", borderRadius: 4 }}>
                    Git Push Automation
                  </span>
                </div>
                <h4 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  GitHub + Cloud Build
                </h4>
                <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>
                  Repo: <code>Arnab-Feuji/Feuji-CLARA</code>. Cloud Build compiles Docker images into <b>Artifact Registry</b> upon git push.
                </p>
              </div>
            </div>

            {/* Mermaid Architecture Code Box */}
            <div style={{ background: "var(--ink)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--mut)", marginBottom: 8 }}>
                MERMAID TOPOLOGY ARCHITECTURE DEFINITION
              </div>
              <pre
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  color: "#a6accd",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
{`graph TD
    Client["User Browser / RM Mobile Device"] -->|HTTPS / SSL| Frontend["Cloud Run: feuji-clara-frontend (React 18 + Nginx)"]
    Frontend -->|REST API Calls| Backend["Cloud Run: feuji-clara-backend (Django 5 + Gunicorn)"]
    Backend -->|Internal VPC / Port 5432| DB["Compute Engine VM: xsell-db-vm (PostgreSQL 16 + pgvector)"]
    Backend -->|External API Key| OpenAI["OpenAI API (gpt-4o-mini Reasoning Engine)"]
    
    GitPush["Developer Git Push"] -->|Webhook| GitHub["GitHub Repo: Arnab-Feuji/Feuji-CLARA"]
    GitHub -->|Trigger| Build["Cloud Build CI/CD Service"]
    Build -->|Store Docker Image| Registry["Artifact Registry: xsell-repo"]
    Registry -->|Automated Deploy| Backend
    Registry -->|Automated Deploy| Frontend`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: GCP TOOLS MATRIX */}
      {(activeSection === "all" || activeSection === "matrix") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20, color: "#FBBC05" }}>🛠️</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>2. GCP Tools &amp; Hardware Matrix</h2>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textStyle: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--panel2)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "14px 18px", color: "var(--gold)", fontWeight: 800 }}>GCP Service</th>
                  <th style={{ padding: "14px 18px", color: "#fff", fontWeight: 800 }}>Resource Name</th>
                  <th style={{ padding: "14px 18px", color: "#fff", fontWeight: 800 }}>Hardware Specs</th>
                  <th style={{ padding: "14px 18px", color: "#fff", fontWeight: 800 }}>Protocol / Port</th>
                  <th style={{ padding: "14px 18px", color: "#fff", fontWeight: 800 }}>GCP Free Tier Allowance</th>
                  <th style={{ padding: "14px 18px", color: "#34A853", fontWeight: 800 }}>Monthly Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#4285F4" }}>Google Compute Engine</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>xsell-db-vm</td>
                  <td style={{ padding: "14px 18px" }}>e2-micro (2 vCPU, 1 GB RAM, 30 GB Disk + 2GB Swap)</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>TCP / 5432</td>
                  <td style={{ padding: "14px 18px", color: "var(--dim)" }}>1 instance/mo (us-central1, us-east1, us-west1)</td>
                  <td style={{ padding: "14px 18px", color: "#34A853", fontWeight: 800 }}>$0.00 (100% Free)</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#EA4335" }}>Google Cloud Run (Backend)</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>feuji-clara-backend</td>
                  <td style={{ padding: "14px 18px" }}>1 vCPU, 1 GiB RAM (Request-based scaling 0 to N)</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>HTTP/REST / 8000</td>
                  <td style={{ padding: "14px 18px", color: "var(--dim)" }}>2M requests/mo, 180k vCPU-sec, 360k GiB-sec</td>
                  <td style={{ padding: "14px 18px", color: "#34A853", fontWeight: 800 }}>$0.00 (100% Free)</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#4285F4" }}>Google Cloud Run (Frontend)</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>feuji-clara-frontend</td>
                  <td style={{ padding: "14px 18px" }}>1 vCPU, 512 MiB RAM (Nginx static web server)</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>HTTPS / 8080 (80)</td>
                  <td style={{ padding: "14px 18px", color: "var(--dim)" }}>Shared Cloud Run free tier pool</td>
                  <td style={{ padding: "14px 18px", color: "#34A853", fontWeight: 800 }}>$0.00 (100% Free)</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#FBBC05" }}>Google Cloud Build</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>GitHub Trigger</td>
                  <td style={{ padding: "14px 18px" }}>Cloud Build Runner (Docker compilation)</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>Git Webhook</td>
                  <td style={{ padding: "14px 18px", color: "var(--dim)" }}>120 build-minutes per day free</td>
                  <td style={{ padding: "14px 18px", color: "#34A853", fontWeight: 800 }}>$0.00 (100% Free)</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#AB47BC" }}>Artifact Registry</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>xsell-repo</td>
                  <td style={{ padding: "14px 18px" }}>Docker Image Repository (us-central1)</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>gcr.io / pkg.dev</td>
                  <td style={{ padding: "14px 18px", color: "var(--dim)" }}>0.5 GB storage per month free</td>
                  <td style={{ padding: "14px 18px", color: "#34A853", fontWeight: 800 }}>$0.00 (100% Free)</td>
                </tr>

                <tr>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#FF6F00" }}>Firebase &amp; GCP IAM</td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>Feuji-CLARA</td>
                  <td style={{ padding: "14px 18px" }}>Project ID: <code>oval-tributary-463011-f8</code></td>
                  <td style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace" }}>Project #351505823409</td>
                  <td style={{ padding: "14px 18px", color: "var(--dim)" }}>10 GB storage, 360 MB/day egress + ₹28,689 Trial</td>
                  <td style={{ padding: "14px 18px", color: "#34A853", fontWeight: 800 }}>$0.00 (100% Free)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: CONNECTION & ENVIRONMENT MAP */}
      {(activeSection === "all" || activeSection === "connections") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20, color: "#34A853" }}>🔑</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>3. Connection &amp; Environment Map</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            {/* Live Endpoints Card */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
                📡 Live Production Endpoints
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                <div>
                  <div style={{ color: "var(--mut)", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>BACKEND REST API</div>
                  <code style={{ background: "var(--ink)", padding: "6px 10px", borderRadius: 6, color: "var(--gold)", display: "block" }}>
                    https://feuji-clara-backend-351505823409.us-central1.run.app/api/
                  </code>
                </div>

                <div>
                  <div style={{ color: "var(--mut)", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>FRONTEND WEB APPLICATION</div>
                  <code style={{ background: "var(--ink)", padding: "6px 10px", borderRadius: 6, color: "#4285F4", display: "block" }}>
                    https://feuji-clara-frontend-351505823409.us-central1.run.app
                  </code>
                </div>

                <div>
                  <div style={{ color: "var(--mut)", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>POSTGRESQL DATABASE INTERNAL IP</div>
                  <code style={{ background: "var(--ink)", padding: "6px 10px", borderRadius: 6, color: "#34A853", display: "block" }}>
                    10.128.0.x:5432 (Internal VPC Network)
                  </code>
                </div>
              </div>
            </div>

            {/* Environment Variables Table */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
                ⚙️ Backend Environment Variables (Cloud Run)
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "6px 8px", color: "var(--gold)", textAlign: "left" }}>Variable Name</th>
                    <th style={{ padding: "6px 8px", color: "#fff", textAlign: "left" }}>Value / Purpose</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--dim)" }}>POSTGRES_HOST</td>
                    <td style={{ padding: "6px 8px", color: "#34A853" }}>Internal VM IP (e.g. 10.128.0.2)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--dim)" }}>POSTGRES_DB</td>
                    <td style={{ padding: "6px 8px", color: "#fff" }}>crosssell</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--dim)" }}>POSTGRES_USER</td>
                    <td style={{ padding: "6px 8px", color: "#fff" }}>crosssell</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--dim)" }}>LLM_PROVIDER</td>
                    <td style={{ padding: "6px 8px", color: "#FBBC05" }}>openai</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--dim)" }}>OPENAI_MODEL</td>
                    <td style={{ padding: "6px 8px", color: "#FBBC05" }}>gpt-4o-mini</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px", color: "var(--dim)" }}>OPENAI_API_KEY</td>
                    <td style={{ padding: "6px 8px", color: "#EA4335" }}>sk-proj-... (Encrypted API Key)</td>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20, color: "#EA4335" }}>🚀</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>4. Step-by-Step Deployment Guide</h2>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 26 }}>
            {[
              {
                phase: "PHASE 1: GCP PROJECT SETUP & SOURCE CODE COMMIT",
                color: "#4285F4",
                steps: [
                  "Create or select GCP Project ID: oval-tributary-463011-f8 (Project #351505823409).",
                  "Initialize Git in workspace and push full codebase to GitHub repository: https://github.com/Arnab-Feuji/Feuji-CLARA (branch main).",
                  "Ensure frontend/.env.production contains VITE_API_BASE=https://feuji-clara-backend-351505823409.us-central1.run.app/api.",
                ],
              },
              {
                phase: "PHASE 2: DATABASE VM DEPLOYMENT (Compute Engine e2-micro)",
                color: "#34A853",
                steps: [
                  "Navigate to Compute Engine > VM Instances > Create Instance.",
                  "Name: xsell-db-vm | Region: us-central1 (Iowa) | Machine Type: e2-micro (2 vCPU, 1 GB RAM).",
                  "Boot Disk: 30 GB Standard Persistent Disk (pd-standard) with Ubuntu 22.04 LTS.",
                  "Automation Startup Script: Installs Docker, sets up 2GB swap space, and launches pgvector/pgvector:pg16 container on port 5432.",
                ],
              },
              {
                phase: "PHASE 3: BACKEND API SERVICE DEPLOYMENT (Cloud Run)",
                color: "#EA4335",
                steps: [
                  "Navigate to Cloud Run > Create Service > Name: feuji-clara-backend | Region: us-central1.",
                  "Deployment type: Continuously deploy from repository > Connect GitHub Arnab-Feuji/Feuji-CLARA.",
                  "Build configuration: Select Dockerfile > Source location: backend/Dockerfile.",
                  "Authentication: Select 'Allow public access' | Container port: 8000 | Memory: 1 GiB.",
                  "Variables: Add POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, LLM_PROVIDER, OPENAI_MODEL, OPENAI_API_KEY.",
                  "Click Create. Cloud Run compiles backend container image via Cloud Build and issues live URL.",
                ],
              },
              {
                phase: "PHASE 4: FRONTEND WEB APP DEPLOYMENT (Cloud Run)",
                color: "#FBBC05",
                steps: [
                  "Navigate to Cloud Run > Create Service > Name: feuji-clara-frontend | Region: us-central1.",
                  "Deployment type: Continuously deploy from repository > Select Arnab-Feuji/Feuji-CLARA.",
                  "Build configuration: Select Dockerfile > Source location: frontend/Dockerfile.",
                  "Authentication: Select 'Allow public access' | Container port: 8080.",
                  "Note: frontend/nginx.conf uses official listen ${PORT}; template so Nginx binds to Cloud Run port 8080 automatically.",
                  "Click Create. Cloud Run compiles Nginx static web container and launches live application URL.",
                ],
              },
              {
                phase: "PHASE 5: DATABASE AUTO-MIGRATION & DATASET INITIALIZATION",
                color: "#AB47BC",
                steps: [
                  "Backend container features automatic database initializer in backend/api/apps.py.",
                  "Upon container startup, Django automatically detects missing database tables and runs python manage.py migrate.",
                  "If database records are empty, it automatically populates the 10,000 synthetic customer records from data/customers.csv.",
                  "Health endpoint https://feuji-clara-backend-351505823409.us-central1.run.app/api/health/ returns status: ok with 10,000 customers loaded.",
                ],
              },
            ].map((p, idx) => (
              <div key={idx} style={{ marginBottom: idx < 4 ? 24 : 0, borderBottom: idx < 4 ? "1px solid var(--line-soft)" : "none", paddingBottom: idx < 4 ? 20 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: p.color, letterSpacing: "0.08em", marginBottom: 8 }}>
                  {p.phase}
                </div>
                <ul style={{ paddingLeft: 20, color: "var(--text)", fontSize: 13.5, lineHeight: 1.6 }}>
                  {p.steps.map((st, sIdx) => (
                    <li key={sIdx} style={{ marginBottom: 4 }}>
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
