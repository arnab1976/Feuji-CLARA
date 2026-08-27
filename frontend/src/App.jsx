import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import UploadDataset from "./pages/UploadDataset.jsx";
import NudgeQueue from "./pages/NudgeQueue.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import Synthesis from "./pages/Synthesis.jsx";
import QualityGate from "./pages/QualityGate.jsx";
import RagPipeline from "./pages/RagPipeline.jsx";
import FinalOutput from "./pages/FinalOutput.jsx";
import Validation from "./pages/Validation.jsx";
import { api } from "./api/client.js";

const NAV = [
  { to: "/", label: "Home / Overview", ix: "⌂", tint: "var(--gold)", end: true },
  { to: "/upload", label: "Upload Dataset", ix: "⬆", tint: "var(--cap)" },
  { to: "/synthesis", label: "Gen AI Synthesis", ix: "⟳", tint: "var(--model)" },
  { to: "/quality-gate", label: "Quality Gate", ix: "✓", tint: "#d6a648" },
  { to: "/rag-pipeline", label: "RAG Pipeline", ix: "⚡", tint: "var(--ok)" },
  { to: "/nudges", label: "Nudge Queue", ix: "▶", tint: "var(--cap)" },
  { to: "/final-output", label: "Final Output", ix: "🎯", tint: "var(--gold)" },
  { to: "/validation", label: "Validation", ix: "⚖️", tint: "#56a0d3" },
  { to: "/chat", label: "CLARA RM Assistant", ix: "✦", tint: "var(--feedback)" },
];

export default function App() {
  const [health, setHealth] = useState(null);
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ status: "down" }));
  }, []);

  const isHome = loc.pathname === "/";

  return (
    <div
      className="app"
      style={{
        gridTemplateColumns: isHome ? "1fr" : "var(--rail) 1fr",
        minHeight: "100vh",
      }}
    >
      {/* Sidebar navigation: Hidden completely on Home Page */}
      {!isHome && (
        <aside>
          <div className="brand">
            <div className="brand-row" style={{ gap: 12 }}>
              <div
                className="mark"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--gold), var(--feedback))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0f1725",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                C
              </div>
              <div>
                <h1 style={{ fontSize: 17, fontWeight: 900, color: "#fff", letterSpacing: "0.5px" }}>
                  CLARA
                  <span style={{ fontSize: 8.5, color: "var(--gold)", letterSpacing: "0.10em", display: "block", marginTop: 2 }}>
                    PRECISION BANKING INTELLIGENCE
                  </span>
                </h1>
              </div>
            </div>
            <div className="meta" style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)", lineHeight: 1.5 }}>
              Target Cohort: <b>FD &gt; ₹10L</b>
              <br />
              Clean Records: <b>6,002</b>
              <br />
              Vector Chunks: <b>18,006</b>
              <br />
              Model: <b>{health?.llm_model ?? "GPT-4o-mini / RAG Engine"}</b>
            </div>
          </div>

          <div className="navsec">
            <div className="lbl">Pipeline Navigation</div>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `navlink${isActive ? " active" : ""}`}
                style={{ "--tint": n.tint }}
              >
                <span className="ix">{n.ix}</span>
                <span>{n.label}</span>
              </NavLink>
            ))}
          </div>
        </aside>
      )}

      <main style={{ minWidth: 0 }}>
        {/* Global Topbar Navigation: Omitted on Home Page to gain full vertical height */}
        {!isHome && (
          <div className="topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: 3 }}>
                <button
                  onClick={() => navigate(-1)}
                  title="Navigate Back"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  ‹ Back
                </button>

                <Link
                  to="/"
                  title="Go to CLARA Home Landing Page"
                  style={{
                    padding: "5px 14px",
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text)",
                    fontSize: 12.5,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  ⌂ Home
                </Link>

                <button
                  onClick={() => navigate(1)}
                  title="Navigate Forward"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  Forward ›
                </button>
              </div>

              {/* Breadcrumb path */}
              <div className="crumb" style={{ fontSize: 12, color: "var(--dim)" }}>
                clara / <b style={{ color: "var(--gold)" }}>{loc.pathname.slice(1)}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`badge ${health?.status === "ok" ? "ok" : "bad"}`}>
                API {health?.status === "ok" ? "online" : "offline"}
              </span>
              <span className={`badge ${health?.llm_configured ? "ok" : "bad"}`}>
                LLM {health?.llm_configured ? "configured" : "RAG engine"}
              </span>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadDataset />} />
          <Route path="/synthesis" element={<Synthesis />} />
          <Route path="/quality-gate" element={<QualityGate />} />
          <Route path="/rag-pipeline" element={<RagPipeline />} />
          <Route path="/nudges" element={<NudgeQueue />} />
          <Route path="/final-output" element={<FinalOutput />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/customers/:customerId" element={<CustomerDetail />} />
          <Route path="/recommendations/:customerId" element={<CustomerDetail />} />
          <Route path="/chat" element={<Chatbot />} />
        </Routes>
      </main>
    </div>
  );
}
