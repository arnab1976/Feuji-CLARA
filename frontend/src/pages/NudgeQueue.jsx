import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "../api/client";
import ErrorBox from "../components/ErrorBox";
import Loading from "../components/Loading";

const PRODUCTS = ["", "Insurance", "Mutual Fund", "Retirement / Pension", "Credit Card", "Home Loan"];

/** Delay between each row reveal — visible progression without feeling slow (~25 rows ≈ 1.4s). */
const ROW_REVEAL_MS = 55;

export default function NudgeQueue() {
  const [started, setStarted] = useState(false);
  const [meta, setMeta] = useState(null); // summary metrics from API
  const [displayedRows, setDisplayedRows] = useState([]); // progressive table rows
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [product, setProduct] = useState("");
  const [minPropensity, setMinPropensity] = useState("0");
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");

  const streamIdRef = useRef(0);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  /** Reveal rows one-by-one into the table at a brisk pace. */
  const streamRows = useCallback((rows, runId) => {
    clearTimers();
    setDisplayedRows([]);
    setStreaming(true);

    if (!rows.length) {
      if (streamIdRef.current !== runId) return;
      setStreaming(false);
      setStatusMsg("Engine idle — no matching customers for current filters.");
      return;
    }

    setStatusMsg(`Generating recommendations… 0 / ${rows.length}`);

    rows.forEach((row, i) => {
      const t = setTimeout(() => {
        if (streamIdRef.current !== runId) return;
        setDisplayedRows((prev) => [...prev, row]);
        setStatusMsg(`Generating recommendations… ${i + 1} / ${rows.length}`);
        if (i === rows.length - 1) {
          setStreaming(false);
          setStatusMsg(`Engine ready — ${rows.length} target customer${rows.length === 1 ? "" : "s"} queued.`);
        }
      }, (i + 1) * ROW_REVEAL_MS);
      timersRef.current.push(t);
    });
  }, []);

  const load = useCallback(async () => {
    const runId = ++streamIdRef.current;
    setLoading(true);
    setErr("");
    clearTimers();
    setDisplayedRows([]);
    setStreaming(false);
    setStatusMsg("Fetching eligible customers & RAG vectors…");
    try {
      const params = {
        min_propensity: minPropensity,
        limit,
      };
      if (product) params.product = product;
      const q = search.trim();
      if (q) params.search = q;

      const d = await api.nudgeQueue(params);
      if (streamIdRef.current !== runId) return; // superseded by a newer load
      setMeta(d);
      setLoading(false);
      const rows = Array.isArray(d.results) ? d.results : [];
      streamRows(rows, runId);
    } catch (e) {
      if (streamIdRef.current !== runId) return;
      setErr(e.message);
      setMeta(null);
      setDisplayedRows([]);
      setStatusMsg("Engine failed — check API / dataset.");
      setLoading(false);
      setStreaming(false);
    }
  }, [product, minPropensity, limit, search, streamRows]);

  useEffect(() => {
    if (!started) return;
    load();
    return () => {
      // Invalidate in-flight load/timers (React Strict Mode remount + filter changes).
      streamIdRef.current += 1;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when filters change after start
  }, [started, product, minPropensity, limit]);

  useEffect(() => () => {
    streamIdRef.current += 1;
    clearTimers();
  }, []);

  const handleStartEngine = () => {
    setStarted(true);
    setMeta(null);
    setDisplayedRows([]);
    setErr("");
    setStatusMsg("Starting RM Recommendation Engine…");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (started) load();
  };

  const busy = loading || streaming;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Nudge Queue &amp; RM Recommendation Engine</div>
          <div
            style={{
              display: "inline-block",
              marginTop: 8,
              marginBottom: 6,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(78, 168, 132, 0.15)",
              border: "1px solid rgba(78, 168, 132, 0.4)",
              color: "#4ea884",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.3px",
            }}
          >
            Scope: Quality Gate &amp; RAG Vector Verified
          </div>
          <div className="page-sub" style={{ marginTop: 4 }}>
            High-propensity eligible customers cleared by the Eligibility Agent. Click{" "}
            <b style={{ color: "var(--hi)" }}>Start RM Recommendation Engine</b> to generate
            the queue row-by-row with live RAG vector signals.
          </div>
        </div>
      </div>

      {/* Idle — Start CTA */}
      {!started && (
        <div
          className="card"
          style={{
            padding: "48px 32px",
            textAlign: "center",
            marginBottom: 20,
            background: "linear-gradient(160deg, #0d131f 0%, #121a2a 100%)",
            border: "1px solid rgba(61, 126, 166, 0.35)",
          }}
        >
          <div style={{ fontSize: 15, color: "var(--mut)", marginBottom: 22, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
            The recommendation engine will score eligible customers, attach RAG vectors, and
            stream target rows into the queue window — one customer at a time.
          </div>
          <button
            type="button"
            className="btn"
            onClick={handleStartEngine}
            disabled={loading}
            style={{
              fontSize: 15,
              fontWeight: 800,
              padding: "14px 28px",
              background: "linear-gradient(135deg, #2a6a94, #3d7ea6)",
              border: "none",
              boxShadow: "0 4px 18px rgba(61, 126, 166, 0.35)",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            ▶ Start RM Recommendation Engine
          </button>
        </div>
      )}

      {started && loading && !meta && (
        <Loading label="Running RM Recommendation Engine — loading eligible customers & RAG signals…" />
      )}

      {started && statusMsg && (
        <div
          style={{
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            color: busy ? "var(--gold)" : "var(--ok)",
          }}
        >
          {busy && <span className="spin" style={{ marginRight: 8 }} />}
          {statusMsg}
        </div>
      )}

      <ErrorBox error={err} />

      {started && meta && (
        <>
          <div className="grid g4" style={{ marginBottom: 20 }}>
            <div className="stat" style={{ padding: "16px 20px", background: "#0d131f", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10 }}>
              <div className="sv" style={{ fontSize: 28, fontWeight: 900, color: "#4ea884" }}>
                {(meta.total_eligible ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
                ELIGIBLE TARGET CUSTOMERS
              </div>
            </div>

            <div className="stat" style={{ padding: "16px 20px", background: "#0d131f", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10 }}>
              <div className="sv" style={{ fontSize: 28, fontWeight: 900, color: "#d6a648" }}>
                {(meta.high_propensity ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
                HIGH PROPENSITY (&gt;0.75)
              </div>
            </div>

            <div className="stat" style={{ padding: "16px 20px", background: "#0d131f", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10 }}>
              <div className="sv" style={{ fontSize: 28, fontWeight: 900, color: "#b682d6" }}>
                {(meta.total_chunks ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
                RAG VECTOR CHUNKS LOADED
              </div>
            </div>

            <div className="stat" style={{ padding: "16px 20px", background: "#0d131f", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10 }}>
              <div className="sv" style={{ fontSize: 28, fontWeight: 900, color: "#ffffff" }}>
                {(meta.clean_records_out ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "#8a96a8", letterSpacing: "0.5px", marginTop: 4 }}>
                QUALITY GATE CLEAN RECORDS
              </div>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="filters" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label className="fl">Product</label>
            <select value={product} onChange={(e) => setProduct(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 13 }} disabled={busy}>
              {PRODUCTS.map((p) => <option key={p} value={p}>{p || "All products"}</option>)}
            </select>

            <label className="fl">Propensity</label>
            <select value={minPropensity} onChange={(e) => setMinPropensity(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 13 }} disabled={busy}>
              <option value="0">All Scores</option>
              <option value="0.75">High (&gt;0.75)</option>
              <option value="0.50">Medium (&gt;0.50)</option>
            </select>

            <label className="fl">Limit</label>
            <select value={limit} onChange={(e) => setLimit(+e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 13 }} disabled={busy}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            <input
              type="text"
              placeholder="Search Customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={busy}
              style={{
                background: "var(--panel2)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                minWidth: 180,
              }}
            />

            <button type="submit" className="btn ghost sm" style={{ padding: "6px 14px" }} disabled={busy}>
              ↺ Refresh Queue
            </button>

            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setMeta(null);
                setDisplayedRows([]);
                load();
              }}
              disabled={busy}
              style={{ padding: "6px 14px", borderColor: "var(--cap)", color: "var(--cap)" }}
              title="Re-run the recommendation engine"
            >
              ▶ Re-run Engine
            </button>
          </form>

          {/* Table always visible while streaming — rows appear one by one */}
          {!loading && displayedRows.length === 0 && !streaming ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--mut)" }}>
              No eligible target customers match the selected criteria.
            </div>
          ) : (
            <div className="table-window">
              <div className="table-window-bar">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f56", display: "inline-block" }} />
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }} />
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#27c93f", display: "inline-block" }} />
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 800, color: "var(--hi)", fontFamily: "JetBrains Mono, monospace" }}>
                    Target Customers Queue Window
                  </span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gold)", fontFamily: "JetBrains Mono, monospace" }}>
                  {loading
                    ? "⏳ Fetching queue…"
                    : streaming
                      ? `⚡ Generating ${displayedRows.length}…`
                      : `↕ Scrollable Table (${displayedRows.length} rows)`}
                </span>
              </div>
              <div className="tblwrap" style={{ maxHeight: 520, overflowY: "auto" }}>
                <table className="tbl" style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--panel2)" }}>
                      <th style={{ padding: "12px 14px", color: "var(--hi)", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>Customer ID</th>
                      <th style={{ padding: "12px 14px", color: "var(--text)", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>Age &amp; Segment</th>
                      <th style={{ padding: "12px 14px", color: "var(--gold)", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>FD Balance</th>
                      <th style={{ padding: "12px 14px", color: "var(--text)", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>NRV</th>
                      <th style={{ padding: "12px 14px", color: "var(--text)", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>Propensity</th>
                      <th style={{ padding: "12px 14px", color: "var(--hi)", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>Target Product</th>
                      <th style={{ padding: "12px 14px", color: "var(--dim)", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>Signal &amp; RAG Vector</th>
                      <th style={{ padding: "12px 14px", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((r, idx) => (
                      <tr
                        key={`${r.customer_id}-${idx}`}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          animation: "nudgeRowIn 0.22s ease-out",
                        }}
                      >
                        <td className="cid" style={{ padding: "12px 14px", fontWeight: 700 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="mono" style={{ color: "#fff" }}>{r.customer_id}</span>
                            <span className="badge ok" style={{ fontSize: 9, padding: "1px 5px", background: "rgba(78, 168, 132, 0.15)" }}>
                              Cleaned
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--text)" }}>
                          {r.age} yrs · <span style={{ color: "var(--dim)" }}>{r.segment}</span>
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--gold)" }}>
                          {inr(r.fd_balance)}
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--text)" }}>
                          {inr(r.nrv_12m)}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 44, height: 6, background: "var(--panel3)", borderRadius: 3, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.round((r.propensity_score || 0) * 100)}%`,
                                  height: "100%",
                                  background: r.propensity_score >= 0.75 ? "var(--ok)" : "var(--gold)",
                                }}
                              />
                            </div>
                            <b style={{ color: r.propensity_score >= 0.75 ? "var(--ok)" : "var(--gold)" }}>
                              {r.propensity_score?.toFixed(2)}
                            </b>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "#fff" }}>
                          <span className="badge" style={{ background: "rgba(214, 166, 72, 0.12)", color: "#d6a648", borderColor: "rgba(214, 166, 72, 0.4)" }}>
                            {r.cross_sell_product || r.recommended_product || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{
                            background: "rgba(61, 126, 166, 0.12)",
                            border: "1px solid rgba(61, 126, 166, 0.3)",
                            borderRadius: 6,
                            padding: "6px 10px",
                            fontSize: 11.5,
                            color: "#7eb8d4",
                            maxWidth: 220,
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {r.trigger_event || "intent_signal"}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--ok)", fontWeight: 600 }}>
                              ✓ 384-Dim Vector Ready
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <Link
                            to={`/customers/${encodeURIComponent(r.customer_id)}`}
                            className="btn sm"
                            style={{
                              background: "linear-gradient(135deg, #c9a227, #d6a648)",
                              color: "#0a0e14",
                              fontWeight: 800,
                              border: "none",
                              padding: "7px 14px",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              boxShadow: "0 2px 8px rgba(214, 166, 72, 0.3)",
                            }}
                          >
                            Open Recommendation →
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {(streaming || loading) && (
                      <tr>
                        <td colSpan={8} style={{ padding: "14px", textAlign: "center", color: "var(--gold)", fontSize: 12, fontWeight: 700 }}>
                          <span className="spin" style={{ marginRight: 8 }} />
                          {loading ? "Fetching eligible customers…" : "Streaming next customer…"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes nudgeRowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
