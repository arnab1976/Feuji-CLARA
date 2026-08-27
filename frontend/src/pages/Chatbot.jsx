import { useEffect, useRef, useState } from "react";
import { api, inr } from "../api/client.js";
import Chart from "../components/Chart.jsx";
import ErrorBox from "../components/ErrorBox.jsx";

export default function Chatbot() {
  const [msgs, setMsgs] = useState([
    {
      role: "bot",
      text: "I am your Relationship Manager AI Assistant, completely grounded in the uploaded customer dataset and RAG Vector Database (6,002 clean target records). Ask me about target customers, product recommendations, or request visual charts (bar, pie, trend).",
      agents: ["Intent Agent", "Product Knowledge Bot"],
    },
  ]);
  const [chips, setChips] = useState([
    "Who should I target for Health-Insurance?",
    "Show me a pie chart of converts by product",
    "Show me a bar chart of eligible base by segment",
    "Which wealth product should I sell and why?",
    "What are the eligibility rules for cross-sell?",
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [sid, setSid] = useState(null);
  const bodyRef = useRef(null);

  // Dynamically load Top 5 High-Trending Questions semantically grounded in RAG database
  useEffect(() => {
    api.trendingQuestions()
      .then((d) => {
        if (d?.questions?.length > 0) {
          setChips(d.questions.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setErr(null);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);

    try {
      const r = await api.chat(q, sid);
      setSid(r.session_id);
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          text: r.answer,
          agents: r.agents_used,
          chart: r.chart,
          customers: r.customers,
          guardrail: r.guardrail,
        },
      ]);
    } catch (e) {
      setErr(e);
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          text: "⚠️ That query could not be completed. LLM response is restricted for unverified data.",
          agents: ["Intent Agent"],
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Helper to cleanly format Markdown and convert raw JSON if present
  const renderFormattedText = (rawText) => {
    if (!rawText) return "";
    let str = String(rawText);

    // If string is raw JSON, extract headline or format nicely
    if (str.trim().startsWith("{") && str.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(str);
        if (parsed.headline || parsed.product_to_recommend) {
          const prod = parsed.product_to_recommend || parsed.recommended_product || "Product";
          const head = parsed.headline || `Recommended ${prod}`;
          const points = parsed.reasoning_points || parsed.reasoning_bullets || [];
          const ptsText = Array.isArray(points) ? points.map((p) => `• ${p}`).join("\n") : String(points);
          str = `### ${head}\n\n**Recommended Product**: ${prod}\n\n**Reasoning**:\n${ptsText}`;
        }
      } catch (e) {
        // keep str as is if parse fails
      }
    }

    // Convert basic markdown tags to HTML
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/### (.+)/g, "<h4 style='margin: 4px 0 6px; color: #fff; font-size: 14.5px; font-weight: 800;'>$1</h4>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<i>$1</i>")
      .replace(/\n/g, "<br />");
  };

  return (
    <div
      className="view"
      style={{
        padding: "16px 28px 16px",
        height: "calc(100vh - 48px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      {/* Header - Compact Single Row Layout */}
      <div className="vhead" style={{ marginBottom: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0, whiteSpace: "nowrap" }}>
              Relationship Manager AI Chatbot Assistant
            </h2>
            <span className="badge ok" style={{ background: "rgba(78, 168, 132, 0.15)", color: "var(--ok)", borderColor: "var(--ok)", padding: "3px 8px", fontSize: 10.5, whiteSpace: "nowrap" }}>
              Scope: RAG Vector Database (18,006 Chunks)
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--dim)", margin: "2px 0 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Interactively query target customer profiles, vector reasoning, eligibility rules, and generate live analytical charts (bar, pie, trend).
          </p>
        </div>
      </div>

      <ErrorBox error={err} />

      {/* Main Full-Height Flex Chat Window */}
      <div
        className="chatwrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          overflow: "hidden",
          minHeight: 0,
          height: "100%",
        }}
      >
        {/* Chat Top Bar */}
        <div
          className="chathead"
          style={{
            flexShrink: 0,
            background: "var(--panel2)",
            padding: "10px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            className="ava"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--gold), var(--feedback))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#000",
              fontSize: 12,
            }}
          >
            AI
          </div>
          <div>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
              Cross-Sell AI Copilot
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ok)", display: "flex", alignItems: "center", gap: 5 }}>
              <span>●</span> Grounded on Target Databank &amp; RAG Vector Index
            </div>
          </div>
        </div>

        {/* Message Body Area - Generous Expandable Vertical Space */}
        <div
          className="chatbody"
          ref={bodyRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 0,
          }}
        >
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`msg ${m.role === "user" ? "user" : "bot"}`}
              style={{
                maxWidth: m.role === "user" ? "75%" : "88%",
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {m.role === "bot" && m.agents?.length > 0 && (
                <div className="agentline" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {m.agents.map((a) => (
                    <span
                      className="apill"
                      key={a}
                      style={{
                        fontSize: 10,
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 4,
                        padding: "2px 6px",
                        color: "var(--dim)",
                      }}
                    >
                      {a}
                    </span>
                  ))}
                  {m.guardrail && (
                    <span
                      className="apill"
                      style={{
                        borderColor: "var(--warn)",
                        color: "var(--warn)",
                        background: "rgba(224, 108, 117, 0.15)",
                        fontSize: 10,
                        padding: "2px 6px",
                      }}
                    >
                      GUARDRAIL ENFORCED
                    </span>
                  )}
                </div>
              )}

              <div
                style={{
                  background: m.role === "user" ? "linear-gradient(135deg, var(--cap), #2b569a)" : "var(--panel2)",
                  color: "#fff",
                  padding: "11px 15px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  border: m.role === "user" ? "none" : "1px solid var(--line-soft)",
                }}
                dangerouslySetInnerHTML={{ __html: renderFormattedText(m.text) }}
              />

              {/* Multi-Style Visual Chart Rendering */}
              {m.chart && (
                <div style={{ marginTop: 10, background: "#0d131f", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 8, padding: 12 }}>
                  <Chart spec={m.chart} height={200} />
                </div>
              )}

              {/* Customer Targets Table */}
              {m.customers?.length > 0 && (
                <div className="tblwrap" style={{ marginTop: 10, borderRadius: 6, border: "1px solid var(--line)", overflow: "hidden" }}>
                  <table className="tbl" style={{ width: "100%", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--panel3)" }}>
                        <th style={{ padding: "7px 10px", color: "#fff" }}>Customer ID</th>
                        <th style={{ padding: "7px 10px", color: "var(--gold)" }}>FD Balance</th>
                        <th style={{ padding: "7px 10px", color: "var(--ok)" }}>Propensity</th>
                        <th style={{ padding: "7px 10px", color: "#fff" }}>Target Product</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.customers.map((c) => (
                        <tr key={c.customer_id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                          <td className="cid" style={{ padding: "7px 10px", fontWeight: 700 }}>{c.customer_id}</td>
                          <td style={{ padding: "7px 10px", color: "var(--gold)" }}>{inr(c.fd_balance)}</td>
                          <td style={{ padding: "7px 10px", fontWeight: 700, color: c.propensity_score >= 0.75 ? "var(--ok)" : "var(--gold)" }}>
                            {c.propensity_score?.toFixed(2)}
                          </td>
                          <td style={{ padding: "7px 10px" }}>{c.product}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="typing" style={{ display: "flex", gap: 4, padding: "8px 12px", background: "var(--panel2)", width: "fit-content", borderRadius: 8 }}>
              <i style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
              <i style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
              <i style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
            </div>
          )}
        </div>

        {/* Anchored Bottom Footer with Top 5 Hints & Query Input */}
        <div
          className="chatfoot"
          style={{
            flexShrink: 0,
            background: "var(--panel2)",
            padding: "10px 16px",
            borderTop: "1px solid var(--line)",
          }}
        >
          {/* Top 5 Dynamic Question Hints Title */}
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <span>✦</span> TOP 5 HIGH-TRENDING QUESTIONS (RAG DATABASE GROUNDED):
          </div>

          {/* Top 5 Dynamic Question Chips */}
          <div className="chips" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {chips.map((c) => (
              <button
                key={c}
                className="chip"
                onClick={() => send(c)}
                disabled={busy}
                style={{
                  background: "rgba(214, 166, 72, 0.08)",
                  color: "#ffffff",
                  border: "1px solid rgba(214, 166, 72, 0.35)",
                  borderRadius: 16,
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Query Input Box */}
          <div className="inrow" style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={input}
              placeholder="Ask about target customers, products, eligibility, or request a chart (bar, pie, trend)..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={busy}
              style={{
                flex: 1,
                background: "#0d131f",
                color: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
              }}
            />
            <button
              className="btn"
              onClick={() => send()}
              disabled={busy}
              style={{
                background: "linear-gradient(135deg, var(--gold), #b5862e)",
                color: "#0f1725",
                fontWeight: 900,
                padding: "8px 20px",
                borderRadius: 6,
                border: "none",
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
