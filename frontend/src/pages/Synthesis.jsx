import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import ErrorBox from "../components/ErrorBox.jsx";

const OBS_TABLE_KEY = "crosssell_synth_obs_table_v1";

function mapStreamItemToObsRow(item) {
  return {
    customer_id: item.customer_id,
    age: item.age,
    segment: item.segment,
    fd_balance: item.fd_balance,
    recommended_product: item.cross_sell_product || item.recommended_product || "Health-Insurance",
    cross_sell_product: item.cross_sell_product || "Health-Insurance",
    feedback: [
      {
        text: item.text || "",
        sentiment: item.sentiment || "neutral",
        signal: item.signal || "wealth_intent",
      },
    ],
    synthesis_round: item.synthesis_round,
  };
}

function mapApiCustomerToObsRow(c) {
  const fb = c.feedback && c.feedback.length > 0 ? c.feedback[0] : null;
  if (!fb) return null;
  return {
    customer_id: c.customer_id,
    age: c.age,
    segment: c.segment,
    fd_balance: c.fd_balance,
    recommended_product: c.recommended_product || c.cross_sell_product || "Health-Insurance",
    cross_sell_product: c.cross_sell_product || "Health-Insurance",
    feedback: [
      {
        text: fb.text || "",
        sentiment: fb.sentiment || "neutral",
        signal: fb.signal || "wealth_intent",
      },
    ],
  };
}

function persistObsRows(rows) {
  try {
    sessionStorage.setItem(OBS_TABLE_KEY, JSON.stringify(rows.slice(0, 5000)));
  } catch {
    /* ignore quota */
  }
}

function loadPersistedObsRows() {
  try {
    const raw = sessionStorage.getItem(OBS_TABLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function Synthesis() {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [entireRunning, setEntireRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [roundStatus, setRoundStatus] = useState(""); // started | cleaning | streaming | merged | idle
  const [err, setErr] = useState(null);

  // Live streaming generated items (feed card)
  const [streamItems, setStreamItems] = useState([]);
  const [cleaningLog, setCleaningLog] = useState([]);

  // Observations table: grows with stream; overwritten when a new synthesis starts
  const [obsRows, setObsRows] = useState([]);
  const [obsLive, setObsLive] = useState(false);
  const [loadingCust, setLoadingCust] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const loadData = useCallback(() => {
    return api.synthesisRuns()
      .then(setD)
      .catch(setErr);
  }, []);

  /** Seed table from last session or API (idle / first visit). */
  const loadLastObservationsTable = useCallback(() => {
    const cached = loadPersistedObsRows();
    if (cached && cached.length) {
      setObsRows(cached);
      return Promise.resolve(cached);
    }
    setLoadingCust(true);
    return api
      .customers({ base: "1", limit: 500, offset: 0 })
      .then((res) => {
        const results = res.results || (Array.isArray(res) ? res : []);
        const mapped = results
          .map(mapApiCustomerToObsRow)
          .filter(Boolean)
          .filter((r) => r.feedback?.[0]?.text);
        setObsRows(mapped);
        if (mapped.length) persistObsRows(mapped);
        return mapped;
      })
      .catch((e) => {
        console.error("Failed to load last observations table", e);
        return [];
      })
      .finally(() => setLoadingCust(false));
  }, []);

  useEffect(() => {
    loadData();
    loadLastObservationsTable();
  }, [loadData, loadLastObservationsTable]);

  const clearObservationsTable = () => {
    setObsRows([]);
    setPage(1);
    try {
      sessionStorage.removeItem(OBS_TABLE_KEY);
    } catch {
      /* ignore */
    }
  };

  const appendObsFromItems = (items) => {
    if (!items?.length) return;
    setObsRows((prev) => {
      const ids = new Set(prev.map((x) => x.customer_id));
      const fresh = items
        .filter((x) => x?.customer_id && !ids.has(x.customer_id))
        .map(mapStreamItemToObsRow);
      if (!fresh.length) return prev;
      const next = [...prev, ...fresh];
      persistObsRows(next);
      return next;
    });
  };

  const applyProgress = (evt, { resetStream = false } = {}) => {
    if (!evt) return;
    setD((prev) => ({
      ...(prev || {}),
      coverage: evt.coverage ?? prev?.coverage,
      total: evt.total ?? prev?.total,
      target_total: evt.target_total ?? prev?.target_total,
      target_coverage_pct: evt.target_coverage_pct ?? prev?.target_coverage_pct,
      remaining: evt.remaining ?? prev?.remaining,
      real: evt.real ?? prev?.real,
      synthetic: evt.synthetic ?? prev?.synthetic,
      synth_progress_pct: evt.synth_progress_pct ?? prev?.synth_progress_pct,
      growing_seed_size: evt.growing_seed_size ?? evt.coverage ?? prev?.growing_seed_size,
      next_round: evt.next_round ?? prev?.next_round,
      max_rounds: evt.max_rounds ?? prev?.max_rounds ?? 9,
    }));
    if (resetStream && evt.event === "started") {
      setStreamItems([]);
    }
    if (evt.items && evt.items.length > 0 && (evt.event === "chunk" || evt.event === "done")) {
      setStreamItems((prev) => {
        const ids = new Set(prev.map((x) => x.customer_id));
        const fresh = evt.items.filter((x) => !ids.has(x.customer_id));
        return [...fresh, ...prev].slice(0, 2500);
      });
      appendObsFromItems(evt.items);
    }
  };

  const executeSingleStep = async ({
    useLlm = true,
    manageBusy = true,
    modeLabel,
    clearTable = false,
  } = {}) => {
    if (manageBusy) {
      setBusy(true);
      setErr(null);
    }
    if (clearTable) {
      clearObservationsTable();
      setStreamItems([]);
      setObsLive(true);
    }
    const label = modeLabel || (useLlm ? "LLM" : "Rapid");
    setRoundStatus("started");
    setStatusMsg(`SRS sampling next 10% (${label})…`);
    try {
      const res = await api.synthesisStep(
        {
          batch_pct: 10.0,
          target_only: true,
          use_llm: useLlm,
          chunk_size: useLlm ? 5 : 80,
        },
        {
          onEvent: (evt) => {
            applyProgress(evt);
            if (evt.event === "started") {
              setRoundStatus("started");
              setStatusMsg(
                `Round ${evt.round_number}: seed ${evt.seed_corpus_size?.toLocaleString()} → SRS ${evt.batch_total} (structured cosine + ${evt.use_llm ? "LLM" : "Rapid"})`
              );
              setCleaningLog((prev) => [
                `Round ${evt.round_number}: Growing seed = ${evt.seed_corpus_size}. Sampling ${evt.batch_total} via SRS (${label}).`,
                ...prev,
              ].slice(0, 50));
            }
            if (evt.event === "cleaning") {
              setRoundStatus("cleaning");
              const s = evt.cleaning_stats || {};
              setStatusMsg(
                `Round ${evt.round_number}: cleaning & de-duplicating (kept ${s.kept ?? 0}, dropped dup ${s.dropped_duplicate ?? 0})…`
              );
              setCleaningLog((prev) => [
                `Round ${evt.round_number} · clean chunk ${evt.chunk_index}: input=${s.input ?? 0}, kept=${s.kept ?? 0}, empty=${s.dropped_empty ?? 0}, duplicates removed=${s.dropped_duplicate ?? 0}.`,
                ...prev,
              ].slice(0, 50));
            }
            if (evt.event === "chunk") {
              setRoundStatus("streaming");
              setStatusMsg(
                `Round ${evt.round_number}: streamed ${evt.created_so_far}/${evt.batch_total} · coverage ${evt.target_coverage_pct}%`
              );
            }
          },
        }
      );

      const s = res.cleaning_stats || {};
      const logEntry =
        `Round ${res.round_number} COMPLETE (${label}): synthesized ${res.batch_size} via SRS + structured cosine. ` +
        `Cleaned (dup removed ${s.dropped_duplicate ?? 0}). Merged seed → ${res.merged_seed_size ?? res.coverage}. Coverage ${res.target_coverage_pct}%.`;
      setCleaningLog((prev) => [logEntry, ...prev].slice(0, 50));
      setRoundStatus("merged");
      if (manageBusy) {
        setStatusMsg(
          `Merged into growing seed (${res.merged_seed_size ?? res.coverage}). Observations table updated. Click again for next 10%, or Simulate Entire Data (Rapid).`
        );
        setObsLive(false);
      }

      applyProgress(res);
      if (manageBusy) {
        await loadData();
      }
      return res;
    } catch (e) {
      setErr(e);
      setRoundStatus("idle");
      if (manageBusy) {
        setStatusMsg("");
        setObsLive(false);
      }
      throw e;
    } finally {
      if (manageBusy) setBusy(false);
    }
  };

  const handleSimulateEntireData = async () => {
    setEntireRunning(true);
    setBusy(true);
    setErr(null);
    setObsLive(true);
    clearObservationsTable();
    setStreamItems([]);
    setStatusMsg("Simulate Entire Data (Rapid) started — observations table will populate as rows stream in…");
    setCleaningLog((prev) => [
      "Simulate Entire Data (Rapid): structured cosine pairing + grounded paraphrase — continuous until ~100%. Observations table overwritten and filling live.",
      ...prev,
    ].slice(0, 50));
    try {
      let coverage = Number(d?.target_coverage_pct || 0);
      let guard = 0;
      while (coverage < 99.9 && guard < 12) {
        guard += 1;
        const res = await executeSingleStep({
          useLlm: false,
          manageBusy: false,
          modeLabel: "Rapid",
          clearTable: false,
        });
        coverage = Number(res?.target_coverage_pct || 0);
        setStatusMsg(
          `Simulate Entire Data (Rapid): round ${res.round_number} merged · coverage ${coverage}% · table growing…`
        );
        if (!res?.batch_size) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      setRoundStatus("merged");
      setStatusMsg(`Simulate Entire Data complete — coverage ${coverage}%. Observations table shows this run.`);
      setCleaningLog((prev) => [
        `Simulate Entire Data (Rapid) FINISHED at ${coverage}% coverage.`,
        ...prev,
      ].slice(0, 50));
      await loadData();
    } catch (e) {
      console.error("Simulate Entire Data halted", e);
      setErr(e);
      setStatusMsg("Simulate Entire Data stopped due to an error.");
    } finally {
      setEntireRunning(false);
      setBusy(false);
      setObsLive(false);
    }
  };

  const handleResetSynthesis = async () => {
    if (!window.confirm("Reset synthetic feedback iterations? Real ~10% seed feedback will be preserved so you can re-run one-by-one simulation.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await api.synthesisReset();
      setStreamItems([]);
      clearObservationsTable();
      setObsLive(false);
      setCleaningLog(["Reset complete. Growing seed restored to real ~10% baseline. Click “Simulate Next 10% Batch” to start Round 1."]);
      setRoundStatus("idle");
      setStatusMsg("Ready — growing seed is the real 10% baseline. Observations table cleared.");
      if (res && res.target_coverage_pct != null) {
        setD((prev) => ({
          ...prev,
          synthetic: 0,
          synth_progress_pct: 0.0,
          coverage: res.coverage || res.real || 646,
          target_coverage_pct: res.target_coverage_pct,
          growing_seed_size: res.coverage || res.real,
          remaining: (prev?.total || 6138) - (res.coverage || res.real || 646),
        }));
      }
      await loadData();
      setPage(1);
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadCSV = () => {
    window.open("/api/synthesis/export/", "_blank");
  };

  const filteredObs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return obsRows.filter((c) => {
      const fb = c.feedback?.[0];
      const product = c.recommended_product || c.cross_sell_product || "";
      const sentiment = (fb?.sentiment || "").toLowerCase();
      if (filterProduct && product !== filterProduct) return false;
      if (filterSentiment && sentiment !== filterSentiment.toLowerCase()) return false;
      if (!q) return true;
      const hay = `${c.customer_id} ${fb?.text || ""} ${product}`.toLowerCase();
      return hay.includes(q);
    });
  }, [obsRows, search, filterProduct, filterSentiment]);

  const custTotal = filteredObs.length;
  const totalPages = Math.ceil(custTotal / pageSize) || 1;
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filteredObs.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  if (!d) return <Loading label="Loading Gen AI synthesis state…" />;

  const targetCoveragePct = d.target_coverage_pct != null
    ? d.target_coverage_pct
    : (d.total ? ((d.coverage / d.total) * 100).toFixed(1) : 0);

  const synthProgressPct = d.synth_progress_pct != null
    ? d.synth_progress_pct
    : (d.total && d.real && (d.total - d.real > 0)
        ? (((d.synthetic || 0) / (d.total - d.real)) * 100).toFixed(2)
        : 0);

  return (
    <div className="view">
      {/* Header */}
      <div className="vhead" style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Gen AI Feedback Synthesizing Ops</h2>
          <span className="badge ok" style={{ marginTop: 4, display: "inline-block" }}>
            Target Base Scope: FD &gt; ₹10L Base ({d.total?.toLocaleString("en-IN") || "6,138"} Observations)
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleDownloadCSV}
            style={{
              background: "linear-gradient(135deg, var(--ok), #367d5e)",
              color: "#fff",
              border: "none",
              padding: "8px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(78, 168, 132, 0.3)",
            }}
            title="Includes feedback_text plus top-5 cosine similarity scores and matching seed customer IDs"
          >
            📥 Download Synthesized Dataset (CSV)
          </button>

          <button
            onClick={handleResetSynthesis}
            disabled={busy}
            style={{
              background: "rgba(209, 88, 79, 0.15)",
              color: "var(--warn)",
              border: "1px solid var(--warn)",
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reset Synthetic Iterations
          </button>
        </div>
      </div>

      <p className="vlead">
        After upload, ~10% of the FD &gt; ₹10L base already carries real structured + unstructured feedback (the seed).
        Use <b>Simulate Next 10% Batch</b> for quality LLM rounds (slower), or <b>Simulate Entire Data (Rapid)</b> to finish
        all remaining rounds without stopping via structured cosine pairing + grounded paraphrase (no per-row LLM calls).
        Both paths: SRS without replacement → cosine pair → clean/dedupe → merge into growing seed (10%→…→100%).
        CSV download still includes feedback_text plus top-5 text cosine verification columns.
      </p>
      <div className="rule" />

      <div className="card" style={{ padding: "14px 18px", marginBottom: 18, background: "var(--panel2)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {[
          { n: "1", t: "Real 10% seed" },
          { n: "2", t: "SRS next 10%" },
          { n: "3", t: "Cosine pair + LLM/Rapid" },
          { n: "4", t: "Clean & dedupe" },
          { n: "5", t: "Merge → grow seed" },
        ].map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: "rgba(214,166,72,0.18)", color: "var(--gold)", fontWeight: 800, fontSize: 12,
            }}>{s.n}</span>
            <span style={{ fontSize: 12.5, color: "var(--hi)", fontWeight: 600 }}>{s.t}</span>
            {i < 4 && <span style={{ color: "var(--mut)", margin: "0 4px" }}>→</span>}
          </div>
        ))}
        <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--dim)" }}>
          Growing seed: <b style={{ color: "#fff" }}>{(d.growing_seed_size ?? d.coverage)?.toLocaleString("en-IN")}</b>
          {" · "}Rounds done: <b style={{ color: "var(--gold)" }}>{(d.runs?.length || 0)}</b>/9
        </span>
      </div>


      {/* ------------------------------------------------------------------ */}
      {/* 1. Synthesis Coverage & Seed Corpus Progress                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="sv" style={{ color: "var(--gold)" }}>{targetCoveragePct}%</div>
          <div className="sl">Total Base Coverage</div>
        </div>
        <div className="stat">
          <div className="sv" style={{ color: "var(--ok)" }}>{d.real.toLocaleString("en-IN")}</div>
          <div className="sl">Real Seed Feedback (10% Baseline)</div>
        </div>
        <div className="stat">
          <div className="sv" style={{ color: "var(--model)" }}>{d.synthetic.toLocaleString("en-IN")}</div>
          <div className="sl">Synthesized Target Feedback</div>
        </div>
        <div className="stat">
          <div className="sv">{d.coverage.toLocaleString("en-IN")}</div>
          <div className="sl">Growing Seed Corpus (merged)</div>
        </div>
      </div>

      {/* Visual Progress Bar for Synthetic Generation Completion */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 20, background: "var(--panel2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          <span>Gen AI Synthetic Generation Progress (Targeted Unstructured Feedback)</span>
          <span style={{ color: "var(--gold)" }}>{synthProgressPct}% Synthesized</span>
        </div>
        <div style={{ width: "100%", height: 10, background: "var(--panel3)", borderRadius: 5, overflow: "hidden", marginBottom: 6 }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, synthProgressPct))}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--ok), var(--gold))",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <span>Real Seed Baseline: {d.real.toLocaleString()} records</span>
          <span>Synthesized: {d.synthetic.toLocaleString()} / {Math.max(0, (d.total || 0) - (d.real || 0)).toLocaleString()} of remaining 90%</span>
        </div>
        {statusMsg && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: busy ? "var(--gold)" : "var(--ok)", fontWeight: 600 }}>
            {busy && <span className="spin" style={{ marginRight: 8 }} />}
            {statusMsg}
            {roundStatus ? ` · [${roundStatus}]` : ""}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="btn"
          onClick={() => executeSingleStep({ useLlm: true, clearTable: true })}
          disabled={busy || targetCoveragePct >= 99.9}
          style={{
            background: "linear-gradient(135deg, var(--gold), #b5862e)",
            color: "#0f1725",
            fontWeight: 800,
            padding: "10px 20px",
            borderRadius: 6,
          }}
          title="One 10% round with LLM (higher quality, slower)"
        >
          {busy && !entireRunning
            ? <><span className="spin" /> Simulating next 10% batch…</>
            : "▶ Simulate Next 10% Batch (SRS + Cosine + LLM)"}
        </button>

        <button
          className="btn"
          onClick={handleSimulateEntireData}
          disabled={busy || targetCoveragePct >= 99.9}
          style={{
            background: "linear-gradient(135deg, #3d7ea6, #2a5f7a)",
            color: "#fff",
            fontWeight: 800,
            padding: "10px 20px",
            borderRadius: 6,
            border: "1px solid rgba(120, 180, 220, 0.35)",
          }}
          title="Runs all remaining 10% rounds continuously using Rapid mode (no LLM API wait)"
        >
          {entireRunning
            ? <><span className="spin" /> Simulating entire data (Rapid)…</>
            : "⚡ Simulate Entire Data (Rapid)"}
        </button>

        {targetCoveragePct >= 99.9 && (
          <button
            onClick={handleDownloadCSV}
            style={{
              background: "var(--ok)",
              color: "#fff",
              fontWeight: 800,
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            📥 Export Fully Synthesized Dataset (CSV)
          </button>
        )}

        <span className="mono" style={{ color: "var(--mut)", fontSize: 13 }}>
          {targetCoveragePct >= 99.9
            ? "Complete — 100% of target customer observations carry feedback!"
            : entireRunning
              ? "Rapid full-run in progress — will not stop between rounds."
              : `${(100 - Number(targetCoveragePct)).toFixed(1)}% target observations remaining to synthesize.`}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 24, maxWidth: 920 }}>
        <b style={{ color: "var(--hi)" }}>Rapid synthesization:</b> skips per-row LLM calls; uses structured cosine pairing
        + template paraphrase. Typically finishes remaining rounds in minutes instead of hours. Use the LLM button only when
        you want richer free-text quality for a single 10% batch.
      </p>

      <ErrorBox error={err} />

      {/* ------------------------------------------------------------------ */}
      {/* 2. Upfront Live Streaming Data Generation Feed                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 24, background: "var(--panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: (busy) ? "var(--gold)" : "var(--ok)" }}></span>
            Upfront Live Streaming Data Generation Feed
          </h3>
          <span className="mono" style={{ fontSize: 12, color: "var(--dim)" }}>
            {streamItems.length} simulated observations streamed upfront
            {(busy) ? " · generating…" : ""}
          </span>
        </div>

        {streamItems.length === 0 ? (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--mut)", border: "1px dashed var(--line)", borderRadius: 8 }}>
            Click <b>“Simulate Next 10% Batch”</b> (LLM, one round) or <b>“Simulate Entire Data (Rapid)”</b> (all remaining rounds, no pause). Reset first if coverage is already 100%.
          </div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 6 }}>
            {streamItems.map((item, idx) => (
              <div
                key={`${item.customer_id}-${idx}`}
                style={{
                  background: "var(--panel2)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  transition: "0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontWeight: 800, color: "#fff" }}>
                      {item.customer_id}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--dim)" }}>
                      Age {item.age} · {item.segment} · FD {inr(item.fd_balance)}
                    </span>
                    {item.matched_seed_customer_id && (
                      <span className="mono" style={{ fontSize: 11.5, color: "var(--gold)" }}>
                        ← paired with {item.matched_seed_customer_id}
                        {item.structured_cosine_similarity != null
                          ? ` · cosine ${Number(item.structured_cosine_similarity).toFixed(4)}`
                          : ""}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="badge ok" style={{ fontSize: 10 }}>Round {item.synthesis_round}</span>
                    <span
                      className="badge"
                      style={{
                        fontSize: 10,
                        color: item.sentiment === "positive" ? "var(--ok)" : item.sentiment === "negative" ? "var(--warn)" : "var(--gold)",
                        borderColor: item.sentiment === "positive" ? "var(--ok)" : item.sentiment === "negative" ? "var(--warn)" : "var(--gold)",
                      }}
                    >
                      {item.sentiment}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 13.5, color: "var(--hi)", fontStyle: "italic", margin: "2px 0" }}>
                  "{item.text}"
                </p>

                {item.matched_seed_feedback && (
                  <p style={{ fontSize: 11.5, color: "var(--mut)", margin: 0 }}>
                    Seed feedback: <i>"{item.matched_seed_feedback}"</i>
                  </p>
                )}

                <div style={{ fontSize: 11.5, color: "var(--mut)", display: "flex", gap: 16 }}>
                  <span>Product Recommendation: <b style={{ color: "var(--gold)" }}>{item.cross_sell_product || "General"}</b></span>
                  <span>Customer Sentiment: <b style={{ color: item.sentiment === "positive" ? "var(--ok)" : item.sentiment === "negative" ? "var(--warn)" : "var(--gold)" }}>{item.sentiment} ({item.signal})</b></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Data Cleaning & Duplicate Removal Log                           */}
      {/* ------------------------------------------------------------------ */}
      {cleaningLog.length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 24, background: "var(--panel2)" }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", marginBottom: 10 }}>
            Data Cleaning & Duplicate Removal Execution Log
          </h4>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--dim)", display: "flex", flexDirection: "column", gap: 6 }}>
            {cleaningLog.map((logMsg, i) => (
              <li key={i}>{logMsg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Full Synthesized Target Observations Table                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ padding: "20px 24px", background: "var(--panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              Synthesized Target Customer Observations ({custTotal.toLocaleString("en-IN")} rows)
              {obsLive && (
                <span className="badge" style={{ fontSize: 11, color: "var(--gold)", borderColor: "var(--gold)" }}>
                  LIVE · streaming
                </span>
              )}
              {!obsLive && obsRows.length > 0 && (
                <span className="badge" style={{ fontSize: 11, color: "var(--ok)", borderColor: "var(--ok)" }}>
                  last run
                </span>
              )}
            </h3>
            <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 2 }}>
              {obsLive
                ? "Populating gradually from the live synthesis stream. A new run overwrites this table."
                : "Showing the last synthesized/streamed observations. Start Simulate to overwrite and refill live."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={handleDownloadCSV}
              style={{
                background: "var(--panel3)",
                color: "var(--ok)",
                border: "1px solid var(--ok)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📥 Download CSV
            </button>

            <input
              type="text"
              placeholder="Search Customer ID, Text..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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

            <select
              value={filterProduct}
              onChange={(e) => { setFilterProduct(e.target.value); setPage(1); }}
              style={{
                background: "var(--panel2)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              <option value="">All Products</option>
              <option value="Health-Insurance">Health-Insurance</option>
              <option value="Term-Life">Term-Life</option>
              <option value="ULIP">ULIP</option>
              <option value="Mutual-Fund">Mutual-Fund</option>
              <option value="Retirement-Pension">Retirement-Pension</option>
            </select>

            <select
              value={filterSentiment}
              onChange={(e) => { setFilterSentiment(e.target.value); setPage(1); }}
              style={{
                background: "var(--panel2)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--panel2)", borderBottom: "2px solid var(--line)" }}>
                <th style={{ padding: "10px 12px", color: "var(--hi)" }}>Customer ID</th>
                <th style={{ padding: "10px 12px", color: "var(--dim)" }}>Demographics & FD Balance</th>
                <th style={{ padding: "10px 12px", color: "var(--gold)", background: "rgba(214, 166, 72, 0.08)", borderLeft: "2px solid var(--gold)" }}>Product Recommendation</th>
                <th style={{ padding: "10px 12px", color: "var(--ok)", background: "rgba(78, 168, 132, 0.08)", borderLeft: "2px solid var(--ok)" }}>Customer Sentiment</th>
                <th style={{ padding: "10px 12px", color: "var(--hi)" }}>Synthesized Unstructured Feedback Text</th>
              </tr>
            </thead>
            <tbody>
              {loadingCust && obsRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "var(--dim)" }}>
                    Loading last observations…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "var(--mut)" }}>
                    {obsLive
                      ? "Waiting for streamed rows…"
                      : "No observations yet. Run Simulate Next 10% or Simulate Entire Data (Rapid) — this table fills as data streams."}
                  </td>
                </tr>
              ) : (
                pageRows.map((c) => {
                  const fb = c.feedback && c.feedback.length > 0 ? c.feedback[0] : null;
                  const recProduct = c.recommended_product || c.cross_sell_product || "Health-Insurance";
                  const sentiment = fb ? fb.sentiment : "neutral";
                  const signal = fb ? fb.signal : "wealth_intent";

                  return (
                    <tr key={c.customer_id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }} className="mono">
                        {c.customer_id}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text)" }}>
                        {c.age} yrs · {c.segment} · <b style={{ color: "var(--gold)" }}>FD {inr(c.fd_balance)}</b>
                      </td>
                      <td style={{ padding: "10px 12px", background: "rgba(214, 166, 72, 0.04)", borderLeft: "2px solid var(--gold)", fontWeight: 700, color: "var(--gold)" }}>
                        {recProduct}
                      </td>
                      <td style={{ padding: "10px 12px", background: "rgba(78, 168, 132, 0.04)", borderLeft: "2px solid var(--ok)" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "capitalize",
                              color: sentiment === "positive" ? "var(--ok)" : sentiment === "negative" ? "var(--warn)" : "var(--gold)",
                              borderColor: sentiment === "positive" ? "var(--ok)" : sentiment === "negative" ? "var(--warn)" : "var(--gold)",
                              background: sentiment === "positive" ? "rgba(78, 168, 132, 0.15)" : sentiment === "negative" ? "rgba(209, 88, 79, 0.15)" : "rgba(214, 166, 72, 0.15)",
                            }}
                          >
                            {sentiment}
                          </span>
                          <span style={{ color: "var(--dim)", fontSize: 11.5 }}>({signal})</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", fontStyle: "italic", color: "var(--hi)" }}>
                        "{fb ? fb.text : `Customer inquired during branch visit regarding ${recProduct} options for FD ${inr(c.fd_balance)}.`}"
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            Showing Page <b>{pageSafe}</b> of <b>{totalPages}</b> ({custTotal.toLocaleString("en-IN")} streamed / last-run rows)
            {obsLive ? " · updating live" : ""}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                borderRadius: 6,
                background: pageSafe <= 1 ? "var(--panel2)" : "var(--panel3)",
                color: pageSafe <= 1 ? "var(--mut)" : "var(--text)",
                border: "1px solid var(--line)",
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                borderRadius: 6,
                background: pageSafe >= totalPages ? "var(--panel2)" : "var(--panel3)",
                color: pageSafe >= totalPages ? "var(--mut)" : "var(--text)",
                border: "1px solid var(--line)",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Next Step Transition Banner (Quality Gate)                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ marginTop: 28, padding: "24px 28px", background: "linear-gradient(135deg, var(--panel2), var(--panel3))", border: "1px solid #d6a648", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="badge ok" style={{ display: "inline-block", marginBottom: 6, background: "rgba(214, 166, 72, 0.2)", color: "#d6a648", borderColor: "#d6a648" }}>Next Pipeline Step</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
            Proceed to Clean, De-duplicate & Quality Gate
          </h3>
          <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 4, maxWidth: 650 }}>
            Run corpus cleaning, schema & type validation, exact/near-duplicate detection, and quality gate checks before pushing data into the RAG pipeline.
          </p>
        </div>

        <Link
          to="/quality-gate"
          style={{
            background: "linear-gradient(135deg, #d6a648, #b5862e)",
            color: "#0f1725",
            fontWeight: 800,
            fontSize: 14,
            padding: "12px 24px",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(214, 166, 72, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Go to Quality Gate →
        </Link>
      </div>
    </div>
  );
}
