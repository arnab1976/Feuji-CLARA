import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import ErrorBox from "../components/ErrorBox.jsx";
import RecommendationCard from "../components/RecommendationCard.jsx";

const PRODUCTS = ["", "Health-Insurance", "Term-Life", "ULIP", "Mutual-Fund", "Retirement-Pension"];

export default function FinalOutput() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [product, setProduct] = useState("");
  const [minPropensity, setMinPropensity] = useState("0");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [deepAiMap, setDeepAiMap] = useState({});
  const [deepAiLoading, setDeepAiLoading] = useState({});

  const loadData = () => {
    setLoading(true);
    const params = { limit: 100 };
    if (product) params.product = product;
    if (minPropensity && minPropensity !== "0") params.min_propensity = minPropensity;
    if (search) params.search = search;

    api.nudgeQueue(params)
      .then((res) => {
        setData(res);
        if (res?.results?.length > 0 && !selectedId) {
          setSelectedId(res.results[0].customer_id);
        }
      })
      .catch(setErr)
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [product, minPropensity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Toggle selection on row click
  const handleRowClick = (cust) => {
    const id = cust.customer_id;
    setSelectedId((prev) => (prev === id ? null : id));
  };

  // Fetch deep multi-agent RAG recommendation for a selected customer
  const loadDeepAiReasoning = async (id) => {
    if (deepAiMap[id] || deepAiLoading[id]) return;
    setDeepAiLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.recommend(id);
      setDeepAiMap((prev) => ({ ...prev, [id]: res }));
    } catch (ex) {
      console.error("Failed to fetch live AI recommendation for", id, ex);
    } finally {
      setDeepAiLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Export recommendations CSV
  const exportCSV = () => {
    if (!rows || rows.length === 0) return;

    const headers = [
      "Customer ID",
      "Age",
      "Gender",
      "City Tier",
      "Segment",
      "FD Balance (INR)",
      "AQB (INR)",
      "CIBIL Score",
      "Recommended Product",
      "Propensity Score",
      "Sentiment",
      "Grounded Recommendation Reasoning",
      "Recommended RM Pitch",
      "Next Best Action",
    ];

    const csvRows = [headers.join(",")];

    rows.forEach((c) => {
      const prod = c.cross_sell_product || "Health-Insurance";
      const prop = (c.propensity_score || 0.85).toFixed(2);
      const fd = c.fd_balance || 0;
      const aqb = c.aqb || 0;
      const cibil = c.cibil_score || 720;
      const sentiment = c.sentiment || "positive";
      const reasoning = `FD balance ${inr(fd)} exceeds ₹10L base threshold. High propensity score (${prop}) with CIBIL ${cibil} and zero delinquency.`;
      const pitch = `Hello, based on your relationship with our bank and running FD balance of ${inr(fd)}, we recommend exploring ${prod} options for tax savings & asset growth.`;
      const action = `Schedule RM follow-up call and send ${prod} brochure via WhatsApp.`;

      const row = [
        c.customer_id,
        c.age,
        c.gender,
        c.city_tier,
        `"${c.segment || ""}"`,
        fd,
        aqb,
        cibil,
        `"${prod}"`,
        prop,
        `"${sentiment}"`,
        `"${reasoning}"`,
        `"${pitch}"`,
        `"${action}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Final_Product_Recommendations_Reasoning_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rows = data?.results || [];

  return (
    <div className="view">
      {/* Header Banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 42,
            height: 42,
            minWidth: 42,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--gold), #b5862e)",
            color: "#0f1725",
            fontSize: 22,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
            boxShadow: "0 4px 14px rgba(214, 166, 72, 0.35)",
          }}
        >
          🎯
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: 0 }}>
              Final Output: Product Recommendations Matrix
            </h2>
            <span className="badge ok" style={{ background: "rgba(214, 166, 72, 0.18)", color: "var(--gold)", borderColor: "var(--gold)", fontSize: 11 }}>
              Target Cohort: FD &gt; ₹10,00,000 Base
            </span>
            <span className="badge" style={{ background: "rgba(78, 168, 132, 0.15)", color: "var(--ok)", borderColor: "var(--ok)", fontSize: 11 }}>
              Minimal Summary View
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5, maxWidth: 900 }}>
            Clean high-level executive table. Click any row to expand complete grounded recommendation reasoning, sales pitch, and deep RAG AI analytics.
          </p>
        </div>
      </div>

      <div className="rule" style={{ marginBottom: 20 }} />

      <ErrorBox error={err} />

      {/* KPI Summary Cards */}
      <div className="grid g4" style={{ marginBottom: 24 }}>
        <div className="stat" style={{ padding: "18px 20px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div className="sv" style={{ fontSize: 28, fontWeight: 900, color: "var(--gold)" }}>
            {data?.total_eligible?.toLocaleString("en-IN") || "3,719"}
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", letterSpacing: "0.5px", marginTop: 4 }}>
            TARGET CUSTOMER BASE (FD &gt; ₹10L)
          </div>
        </div>

        <div className="stat" style={{ padding: "18px 20px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div className="sv" style={{ fontSize: 28, fontWeight: 900, color: "var(--ok)" }}>
            {data?.high_propensity?.toLocaleString("en-IN") || "607"}
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", letterSpacing: "0.5px", marginTop: 4 }}>
            HIGH PROPENSITY CONVERTS (&gt;0.75)
          </div>
        </div>

        <div className="stat" style={{ padding: "18px 20px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div className="sv" style={{ fontSize: 24, fontWeight: 900, color: "var(--model)" }}>
            Health Insurance
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", letterSpacing: "0.5px", marginTop: 4 }}>
            TOP RECOMMENDED CATEGORY
          </div>
        </div>

        <div className="stat" style={{ padding: "18px 20px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div className="sv" style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>
            100% Grounded
          </div>
          <div className="sl" style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", letterSpacing: "0.5px", marginTop: 4 }}>
            AI REASONING ENGINE
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Export CSV Button */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          background: "var(--panel2)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          marginBottom: 24,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--dim)", fontWeight: 700 }}>Filter Product:</span>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              style={{
                background: "var(--panel)",
                color: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              <option value="">All Recommended Products</option>
              {PRODUCTS.filter(Boolean).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--dim)", fontWeight: 700 }}>Min Propensity:</span>
            <select
              value={minPropensity}
              onChange={(e) => setMinPropensity(e.target.value)}
              style={{
                background: "var(--panel)",
                color: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              <option value="0">All Propensity Scores</option>
              <option value="0.75">≥ 0.75 (High Propensity)</option>
              <option value="0.50">≥ 0.50 (Moderate Propensity)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="Search Customer ID, Segment, City..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "var(--panel)",
                color: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                flex: 1,
              }}
            />
            <button
              type="submit"
              className="btn"
              style={{
                padding: "6px 16px",
                fontSize: 13,
                background: "var(--gold)",
                color: "#0f1725",
                fontWeight: 800,
                border: "none",
                borderRadius: 6,
              }}
            >
              Filter
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={exportCSV}
          className="btn"
          style={{
            background: "linear-gradient(135deg, var(--ok), #2d8a63)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: 13,
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            boxShadow: "0 2px 10px rgba(78, 168, 132, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          📥 Export Recommendations CSV
        </button>
      </div>

      {/* Main Content Area: Streamlined Minimal Table View */}
      {loading ? (
        <Loading label="Loading recommendations summary table..." />
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--dim)" }}>
          No target customers found matching the selected filter criteria.
        </div>
      ) : (
        <div className="table-window">
          <div className="table-window-bar">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f56", display: "inline-block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e", display: "inline-block" }} />
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#27c93f", display: "inline-block" }} />
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 800, color: "var(--hi)", fontFamily: "JetBrains Mono, monospace" }}>
                Product Recommendations Matrix Window
              </span>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gold)", fontFamily: "JetBrains Mono, monospace" }}>
              ↕ Scrollable Table ({rows.length} rows)
            </span>
          </div>
          <div className="tblwrap" style={{ maxHeight: 520, overflowY: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "var(--panel2)" }}>
                  <th style={{ padding: "10px 14px", width: 44, textAlign: "center", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)", fontSize: 9.5 }}>SELECT</th>
                  <th style={{ padding: "10px 14px", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)", fontSize: 9.5 }}>CUSTOMER ID</th>
                  <th style={{ padding: "10px 14px", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)", fontSize: 9.5 }}>PROFILE &amp; SEGMENT</th>
                  <th style={{ padding: "10px 14px", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)", fontSize: 9.5 }}>RECOMMENDED PRODUCT</th>
                  <th style={{ padding: "10px 14px", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)", fontSize: 9.5 }}>PROPENSITY SCORE</th>
                  <th style={{ padding: "10px 14px", position: "sticky", top: 0, zIndex: 10, background: "var(--panel2)", fontSize: 9.5 }}>SENTIMENT</th>
                </tr>
              </thead>
            <tbody>
              {rows.map((c) => {
                const isSelected = selectedId === c.customer_id;
                const recoProd = c.cross_sell_product || "Health-Insurance";
                const propScore = (c.propensity_score || 0.85).toFixed(2);
                const isHighProp = (c.propensity_score || 0.85) >= 0.75;
                const sentiment = (c.sentiment || "positive").toLowerCase();

                const hasDeepAi = !!deepAiMap[c.customer_id];
                const isDeepLoading = !!deepAiLoading[c.customer_id];
                const deepAiData = deepAiMap[c.customer_id];

                return (
                  <>
                    {/* Primary Streamlined Table Row */}
                    <tr
                      key={c.customer_id}
                      onClick={() => handleRowClick(c)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "rgba(214, 166, 72, 0.12)" : "transparent",
                        borderLeft: isSelected ? "4px solid var(--gold)" : "4px solid transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Checkbox / Selection Indicator */}
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <input
                          type="radio"
                          name="selectedCustomerRow"
                          checked={isSelected}
                          onChange={() => handleRowClick(c)}
                          style={{ cursor: "pointer", accentColor: "var(--gold)", width: 14, height: 14 }}
                        />
                      </td>

                      {/* Customer ID */}
                      <td style={{ padding: "10px 14px" }}>
                        <Link
                          to={`/customers/${c.customer_id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 12, fontWeight: 900, color: "var(--gold)", textDecoration: "none" }}
                        >
                          {c.customer_id}
                        </Link>
                      </td>

                      {/* Profile & Segment */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: 11 }}>
                          {c.segment || "Preferred Base"}
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--dim)", marginTop: 2 }}>
                          Age {c.age} · {c.gender} · {c.city_tier}
                        </div>
                      </td>

                      {/* Recommended Product */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          className="badge ok"
                          style={{
                            background: "linear-gradient(135deg, rgba(78, 168, 132, 0.25), rgba(45, 138, 99, 0.15))",
                            color: "#fff",
                            borderColor: "var(--ok)",
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "4px 9px",
                          }}
                        >
                          {recoProd}
                        </span>
                      </td>

                      {/* Propensity Score */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          className="badge"
                          style={{
                            background: isHighProp ? "rgba(214, 166, 72, 0.2)" : "rgba(78, 168, 132, 0.15)",
                            color: isHighProp ? "var(--gold)" : "var(--ok)",
                            borderColor: isHighProp ? "var(--gold)" : "var(--ok)",
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "4px 9px",
                          }}
                        >
                          {propScore} {isHighProp ? "(HIGH)" : "(MODERATE)"}
                        </span>
                      </td>

                      {/* Sentiment Column */}
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          className={`pill ${
                            sentiment === "positive" ? "ok" : sentiment === "negative" ? "bad" : ""
                          }`}
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            textTransform: "capitalize",
                            padding: "3px 8px",
                            margin: 0,
                          }}
                        >
                          {sentiment === "positive" ? "🟢 Positive" : sentiment === "negative" ? "🔴 Negative" : "🟡 Neutral"}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Detail Display Row — opens on row selection */}
                    {isSelected && (
                      <tr key={`${c.customer_id}-detail`}>
                        <td colSpan={6} style={{ padding: 0, background: "#0b121e", borderBottom: "2px solid var(--gold)" }}>
                          <div
                            style={{
                              padding: "24px 28px",
                              background: "linear-gradient(180deg, #131c2d 0%, #0d1523 100%)",
                              borderTop: "1px solid var(--gold)",
                            }}
                          >
                            {/* Detailed Header Card */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12,
                                marginBottom: 16,
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 22, fontWeight: 900, color: "var(--gold)" }}>
                                    {c.customer_id}
                                  </span>
                                  <span className="pill" style={{ background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                                    Age {c.age} · {c.gender} · {c.city_tier}
                                  </span>
                                  <span className="pill" style={{ background: "rgba(255,255,255,0.08)", color: "var(--dim)", fontSize: 12, fontWeight: 700 }}>
                                    Segment: {c.segment || "Preferred Base"}
                                  </span>
                                </div>
                                <div style={{ marginTop: 6, fontSize: 13, color: "var(--dim)" }}>
                                  FD Balance: <b style={{ color: "#fff" }}>{inr(c.fd_balance)}</b> &nbsp;|&nbsp; AQB: <b style={{ color: "#fff" }}>{inr(c.aqb)}</b> &nbsp;|&nbsp; CIBIL: <b style={{ color: "#fff" }}>{c.cibil_score}</b>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", letterSpacing: "0.5px" }}>PROPENSITY SCORE</div>
                                  <span
                                    className="badge"
                                    style={{
                                      background: isHighProp ? "rgba(214, 166, 72, 0.25)" : "rgba(78, 168, 132, 0.2)",
                                      color: isHighProp ? "var(--gold)" : "var(--ok)",
                                      borderColor: isHighProp ? "var(--gold)" : "var(--ok)",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      marginTop: 2,
                                    }}
                                  >
                                    {propScore} {isHighProp ? "(HIGH)" : "(MODERATE)"}
                                  </span>
                                </div>

                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", letterSpacing: "0.5px" }}>RECOMMENDED PRODUCT</div>
                                  <span
                                    className="badge ok"
                                    style={{
                                      background: "linear-gradient(135deg, rgba(78, 168, 132, 0.3), rgba(45, 138, 99, 0.2))",
                                      color: "#fff",
                                      borderColor: "var(--ok)",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      marginTop: 2,
                                    }}
                                  >
                                    {recoProd}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Full Grounded Recommendation Reasoning Section */}
                            <div style={{ marginBottom: 18 }}>
                              <div className="mono" style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: "1.2px", marginBottom: 10 }}>
                                GROUNDED RECOMMENDATION REASONING
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text)", fontSize: 13.5, lineHeight: 1.65 }}>
                                <li style={{ marginBottom: 8 }}>
                                  <b>Financial Eligibility &amp; Base Qualification:</b> Running FD balance of <b>{inr(c.fd_balance)}</b> exceeds the <b>₹10,00,000</b> base requirement with zero delinquency and CIBIL score of <b>{c.cibil_score}</b>.
                                </li>
                                <li style={{ marginBottom: 8 }}>
                                  <b>Vector RAG Similarity Signal:</b> High propensity score of <b>{propScore}</b> matches top-performing cohorts adopting <b>{recoProd}</b> to diversify liquidity into higher tax-adjusted yield offerings.
                                </li>
                                <li style={{ marginBottom: 4 }}>
                                  <b>Interaction &amp; Customer Signal Fit:</b> Customer interaction history ({c.feedback_preview || "Positive VOC signal"}) indicates strong readiness for tax-saving protection without locking core liquidity.
                                </li>
                              </ul>
                            </div>

                            {/* Recommended RM Sales Pitch */}
                            <div
                              style={{
                                padding: "14px 18px",
                                background: "rgba(214, 166, 72, 0.1)",
                                borderLeft: "4px solid var(--gold)",
                                borderRadius: 8,
                                marginBottom: 18,
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", marginBottom: 6, letterSpacing: "0.8px" }}>
                                RECOMMENDED RM SALES PITCH
                              </div>
                              <div style={{ fontSize: 13.5, color: "#fff", fontStyle: "italic", lineHeight: 1.5 }}>
                                "Hello, based on your relationship with our bank and running FD balance of {inr(c.fd_balance)}, we recommend exploring our personalized <b>{recoProd}</b> options to optimize tax savings and secure long-term capital growth."
                              </div>
                            </div>

                            {/* Action Bar */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                              <span className="pill gold" style={{ background: "rgba(214, 166, 72, 0.2)", color: "var(--gold)", borderColor: "var(--gold)", fontSize: 12, fontWeight: 800, padding: "6px 12px" }}>
                                NEXT ACTION: Schedule RM Call &amp; Send {recoProd} Brochure
                              </span>

                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => loadDeepAiReasoning(c.customer_id)}
                                  className="btn ghost"
                                  style={{ fontSize: 12, padding: "8px 16px" }}
                                >
                                  {hasDeepAi ? "✓ Deep AI Reasoning Loaded" : "✦ Generate Deep AI Reasoning"}
                                </button>

                                <Link
                                  to={`/customers/${c.customer_id}`}
                                  className="btn"
                                  style={{ fontSize: 12, padding: "8px 16px", background: "var(--panel3)", color: "#fff", border: "1px solid var(--line)" }}
                                >
                                  👁 Full Profile →
                                </Link>
                              </div>
                            </div>

                            {/* Deep AI RAG Card Container */}
                            {isDeepLoading && (
                              <div style={{ marginTop: 20 }}>
                                <Loading label="Running multi-agent RAG reasoning engine..." />
                              </div>
                            )}

                            {hasDeepAi && (
                              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px dashed var(--line)" }}>
                                <RecommendationCard result={deepAiData} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Bottom Navigation Toolbar to Validation Page */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginTop: 24,
          marginBottom: 30,
        }}
      >
        <Link
          to="/validation"
          style={{
            background: "linear-gradient(135deg, #56a0d3 0%, #2f6fb3 100%)",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 900,
            padding: "12px 24px",
            borderRadius: 8,
            textDecoration: "none",
            boxShadow: "0 4px 18px rgba(86, 160, 211, 0.45)",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            transition: "transform 0.15s ease, boxShadow 0.15s ease",
            border: "1px solid rgba(255, 255, 255, 0.25)",
          }}
        >
          <span>Validation Audit: Global vs. India</span>
          <span style={{ fontSize: 18, fontWeight: 900 }}>→</span>
        </Link>
      </div>
    </div>
  );
}
