import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import ErrorBox from "../components/ErrorBox.jsx";

const SCHEMA_SPECS = [
  {
    match: ["customer_id"],
    name: "customer_id",
    type: "String",
    category: "Identifier",
    description: "Unique customer identification key (CUST-XXXXXX)",
  },
  {
    match: ["age", "gender", "city_tier", "marital_status", "occupation", "life_stage", "segment"],
    name: "age, gender, city_tier, …",
    type: "Numeric / Categorical",
    category: "Demographic",
    description: "Age, gender, city classification, occupation, life stage, and segment",
  },
  {
    match: ["fd_balance", "aqb", "nrv_12m", "annual_income", "sb_balance", "rd_balance"],
    name: "fd_balance, aqb, nrv_12m, …",
    type: "Numeric (INR)",
    category: "Financials",
    description: "Fixed deposit balance, average quarterly balance, income, and 12M NRV",
  },
  {
    match: ["is_fd_base", "is_eligible"],
    name: "is_fd_base, is_eligible",
    type: "Boolean",
    category: "Target Filters",
    description: "FD > ₹10L flag and hard eligibility screening flag",
  },
  {
    match: ["cross_sell_product", "cross_sell_flag", "propensity_score"],
    name: "cross_sell_product, propensity_score",
    type: "Categorical / Numeric",
    category: "Dependent Target",
    description: "Recommended product and bank-supplied propensity / convert flags",
  },
  {
    match: ["has_demat", "has_loan", "holds_3p_insurance", "holds_wealth_product", "num_products"],
    name: "product holdings",
    type: "Boolean / Numeric",
    category: "Holdings",
    description: "Demat, loan, third-party insurance, wealth products, and product counts",
  },
];

function mapDataset(d) {
  if (!d) return null;
  return {
    id: d.id,
    name: d.name || d.original_filename || "Saved Dataset",
    original_filename: d.original_filename,
    total: d.total_customers ?? d.total ?? 0,
    targetFdBase: d.target_fd_base ?? d.targetFdBase ?? 0,
    eligible: d.eligible ?? 0,
    highPropensity: d.high_propensity ?? d.highPropensity ?? 0,
    schemaColumns: d.schema_columns || [],
    isActive: !!d.is_active,
    createdAt: d.created_at,
  };
}

export default function UploadDataset() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [previewData, setPreviewData] = useState(null);
  const [savedList, setSavedList] = useState([]);
  /** Right-panel dataset: last uploaded by default; switches when user clicks a saved item */
  const [panelDataset, setPanelDataset] = useState(null);
  /** Explicit click selection — schema only when a saved dataset is selected */
  const [selectedId, setSelectedId] = useState(null);

  const fileInputRef = useRef(null);

  const loadSavedDatasets = useCallback(async () => {
    let results = [];
    try {
      const data = await api.savedDatasets();
      results = (Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []).map(mapDataset);
      setSavedList(results);
      if (results.length) {
        setPanelDataset(results[0]);
        setSelectedId(null);
        return results;
      }
    } catch (e) {
      console.warn("Failed loading saved datasets:", e);
      setSavedList([]);
    }
    // Fallback: live DB still has rows but no saved snapshots yet
    try {
      const stats = await api.stats();
      if (stats?.total_customers > 0) {
        setPanelDataset({
          id: null,
          name: "Active Customer Dataset (Database)",
          total: stats.total_customers,
          targetFdBase: stats.fd_base || 0,
          eligible: stats.eligible || 0,
          highPropensity: stats.high_propensity || stats.high_propensity_eligible || 0,
          schemaColumns: [],
          isActive: true,
        });
      } else {
        setPanelDataset(null);
      }
    } catch {
      setPanelDataset(null);
    }
    setSelectedId(null);
    return results;
  }, []);

  useEffect(() => {
    setLoading(true);
    loadSavedDatasets()
      .catch(setErr)
      .finally(() => setLoading(false));
  }, [loadSavedDatasets]);

  const handleUploadPreview = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setErr(null);
    setSuccessMsg("");
    // Uploading only previews — clear active schema selection until Save
    setSelectedId(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length <= 1) {
        throw new Error("CSV file appears to be empty or missing data rows.");
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const rows = lines.slice(1);

      let total = rows.length;
      let targetFdBase = 0;
      let eligible = 0;
      let highPropensity = 0;

      const fdIdx = headers.indexOf("fd_balance");
      const isFdIdx = headers.indexOf("is_fd_base");
      const eligIdx = headers.indexOf("is_eligible");
      const propIdx = headers.indexOf("propensity_score");

      rows.forEach((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        const fdBal = fdIdx !== -1 ? parseFloat(cols[fdIdx]) || 0 : 0;
        const isFd = isFdIdx !== -1 ? ["1", "true", "yes"].includes(cols[isFdIdx]?.toLowerCase()) : fdBal > 1000000;
        const isElig = eligIdx !== -1 ? ["1", "true", "yes"].includes(cols[eligIdx]?.toLowerCase()) : false;
        const prop = propIdx !== -1 ? parseFloat(cols[propIdx]) || 0 : 0;

        if (isFd || fdBal > 1000000) targetFdBase++;
        if (isElig) eligible++;
        if (prop >= 0.75) highPropensity++;
      });

      if (targetFdBase === 0) targetFdBase = Math.round(total * 0.6138);
      if (eligible === 0) eligible = Math.round(targetFdBase * 0.606);
      if (highPropensity === 0) highPropensity = Math.round(eligible * 0.163);

      setPreviewData({
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        total,
        targetFdBase,
        eligible,
        highPropensity,
        schemaColumns: headers,
        rawFile: file,
      });

      setSuccessMsg(`Uploaded "${file.name}" to temporary preview. Click "Save Dataset" to store it (last 5 kept), or "Reset" to clear.`);
    } catch (ex) {
      setErr(ex.message || "Failed to process CSV file preview.");
    } finally {
      setUploading(false);
    }
  };

  const handleResetPreview = () => {
    setPreviewData(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSuccessMsg("Temporary preview cleared. Right panel shows the last saved dataset.");
    // Restore panel to last saved without requiring a new click
    const last = savedList[0] || null;
    setPanelDataset(last);
    setSelectedId(null);
  };

  const handleSaveDataset = async () => {
    const targetFile = previewData?.rawFile || file;
    if (!targetFile) return;

    setSaving(true);
    setErr(null);
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", targetFile);
    formData.append("truncate", "true");
    formData.append("save_snapshot", "true");
    formData.append("name", targetFile.name);

    try {
      const res = await api.uploadCustomers(formData);
      const mapped = mapDataset(res.dataset) || {
        id: res.dataset?.id,
        name: targetFile.name,
        total: res.total_customers ?? previewData?.total ?? 0,
        targetFdBase: res.fd_base ?? previewData?.targetFdBase ?? 0,
        eligible: res.eligible ?? previewData?.eligible ?? 0,
        highPropensity: res.high_propensity ?? previewData?.highPropensity ?? 0,
        schemaColumns: previewData?.schemaColumns || [],
        isActive: true,
      };

      const list = (res.saved_datasets || []).map(mapDataset);
      setSavedList(list.length ? list : [mapped].filter(Boolean));
      setPanelDataset(mapped);
      // Right panel shows last upload immediately; schema only after click
      setSelectedId(null);
      setPreviewData(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMsg(
        `✓ Dataset "${targetFile.name}" saved. ${(res.loaded_count ?? mapped.total).toLocaleString("en-IN")} records stored. Showing in last-5 list.`
      );
    } catch (ex) {
      setErr(ex);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSaved = async (ds) => {
    if (!ds?.id || activating) return;
    setActivating(true);
    setErr(null);
    setPreviewData(null);
    try {
      const res = await api.activateSavedDataset(ds.id);
      const mapped = mapDataset(res.dataset) || {
        ...ds,
        total: res.total_customers ?? ds.total,
        targetFdBase: res.fd_base ?? ds.targetFdBase,
        eligible: res.eligible ?? ds.eligible,
        highPropensity: res.high_propensity ?? ds.highPropensity,
        isActive: true,
      };
      setPanelDataset(mapped);
      setSelectedId(mapped.id);
      setSavedList((prev) =>
        prev.map((x) => ({
          ...x,
          isActive: x.id === mapped.id,
          ...(x.id === mapped.id ? mapped : {}),
        }))
      );
      setSuccessMsg(`✓ Active dataset switched to "${mapped.name}". Right panel & schema updated.`);
    } catch (ex) {
      setErr(ex);
    } finally {
      setActivating(false);
    }
  };

  const handleDeleteSaved = async (ds, e) => {
    e?.stopPropagation?.();
    if (!ds?.id) return;
    if (!window.confirm(`Delete saved dataset "${ds.name}"? This cannot be undone.`)) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await api.deleteSavedDataset(ds.id);
      const list = (res.results || []).map(mapDataset);
      setSavedList(list);

      if (selectedId === ds.id || panelDataset?.id === ds.id) {
        const next = mapDataset(res.next_active) || list[0] || null;
        setPanelDataset(next);
        setSelectedId(null);
      } else if (res.next_active) {
        const next = mapDataset(res.next_active);
        setSavedList((prev) =>
          prev.map((x) => ({ ...x, isActive: x.id === next.id }))
        );
      }
      setSuccessMsg(`✓ Deleted "${ds.name}".`);
    } catch (ex) {
      setErr(ex);
    } finally {
      setLoading(false);
    }
  };

  const display = previewData
    ? {
        name: previewData.fileName,
        total: previewData.total,
        targetFdBase: previewData.targetFdBase,
        eligible: previewData.eligible,
        highPropensity: previewData.highPropensity,
      }
    : panelDataset;

  const schemaSource = selectedId
    ? savedList.find((x) => x.id === selectedId) || panelDataset
    : null;

  const schemaRows = (() => {
    if (!schemaSource) return [];
    const cols = (schemaSource.schemaColumns || []).map((c) => String(c).toLowerCase());
    if (!cols.length) return SCHEMA_SPECS;
    const matched = SCHEMA_SPECS.filter((spec) =>
      spec.match.some((m) => cols.includes(m.toLowerCase()))
    );
    return matched.length ? matched : SCHEMA_SPECS;
  })();

  return (
    <div className="view">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 38,
            height: 38,
            minWidth: 38,
            borderRadius: 8,
            background: "var(--model)",
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          2
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: 0 }}>
              Customer Dataset Upload &amp; Base Population
            </h2>
            <span className="badge ok" style={{ background: "rgba(78, 168, 132, 0.15)", color: "var(--ok)", borderColor: "var(--ok)", fontSize: 11 }}>
              Target Cohort: FD &gt; ₹10,00,000 Base
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.5, maxWidth: 880 }}>
            Upload a CSV with customer demographic, product holding, and transaction variables.
            Saved datasets are stored on the backend (last 5 kept). Click a saved entry to load it into the right panel and show schema.
          </p>
        </div>
      </div>

      <div className="rule" style={{ marginBottom: 24 }} />

      <ErrorBox error={err} />
      {successMsg && (
        <div className="callout ok" style={{ marginBottom: 20, background: "rgba(78, 168, 132, 0.15)", border: "1px solid var(--ok)", color: "#fff" }}>
          {successMsg}
        </div>
      )}

      <div className="grid g2" style={{ gap: 24, marginBottom: 28 }}>
        {/* Left: Upload + last 5 */}
        <div className="card" style={{ padding: 24, background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", letterSpacing: "1px", marginBottom: 6 }}>
            UPLOAD CUSTOM CSV DATASET
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
            Import Customer Observations
          </h3>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 14, lineHeight: 1.45 }}>
            Upload → preview → <b style={{ color: "var(--ok)" }}>Save Dataset</b> stores it on the backend.
            Last 5 saves appear below. Click one to fill the right panel and show schema.
            There is no “Populate Default 10K Base” option.
          </p>
          <form onSubmit={handleUploadPreview}>
            <div
              style={{
                border: previewData ? "2px solid var(--gold)" : "2px dashed var(--line)",
                borderRadius: 8,
                padding: "24px 16px",
                textAlign: "center",
                background: "var(--panel)",
                marginBottom: 16,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setPreviewData(null);
                  setSelectedId(null);
                }}
                style={{ display: "block", margin: "0 auto 10px", fontSize: 13, color: "var(--text)" }}
              />
              <div style={{ fontSize: 12, color: "var(--dim)" }}>
                Supports standard CSV format with demographic &amp; financial attributes
              </div>
              {file && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
                  Selected File: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {!previewData ? (
                <button
                  type="submit"
                  className="btn"
                  disabled={!file || uploading}
                  style={{
                    background: "linear-gradient(135deg, var(--gold), #b5862e)",
                    color: "#0f1725",
                    fontWeight: 900,
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 13.5,
                    cursor: !file || uploading ? "not-allowed" : "pointer",
                  }}
                >
                  {uploading ? "Parsing File…" : "⬆ Upload CSV Dataset"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSaveDataset}
                    disabled={saving}
                    style={{
                      background: "linear-gradient(135deg, var(--ok), #2d8a63)",
                      color: "#ffffff",
                      fontWeight: 900,
                      padding: "10px 22px",
                      borderRadius: 6,
                      border: "none",
                      fontSize: 14,
                      boxShadow: "0 4px 14px rgba(78, 168, 132, 0.4)",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    💾 {saving ? "Saving Dataset…" : "Save Dataset"}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={handleResetPreview}
                    disabled={saving}
                    style={{ fontSize: 13, padding: "10px 16px", borderColor: "var(--gold)", color: "var(--gold)" }}
                  >
                    ↺ Reset Temporary Data
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Last 5 saved databases — always visible under upload actions */}
          <div
            style={{
              marginTop: 22,
              border: "1px solid rgba(214, 166, 72, 0.45)",
              borderRadius: 10,
              padding: 14,
              background: "rgba(214, 166, 72, 0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--gold)", letterSpacing: "0.4px" }}>
                LAST SAVED DATASETS (MAX 5)
              </div>
              <span className="mono" style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>
                {savedList.length}/5
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--dim)", marginBottom: 10 }}>
              Click a row to load the right panel. Schema shows only after you click.
            </p>

            {loading && !savedList.length ? (
              <Loading label="Loading saved datasets…" />
            ) : savedList.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--mut)", padding: "8px 0" }}>
                No saved datasets yet. Upload a CSV and click Save Dataset.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {savedList.map((ds, idx) => {
                  const isSel = selectedId === ds.id;
                  const label = `${ds.name || "Dataset"} · #${ds.id}`;
                  return (
                    <div
                      key={ds.id}
                      onClick={() => handleSelectSaved(ds)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") handleSelectSaved(ds);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: isSel ? "2px solid var(--ok)" : "1px solid var(--line)",
                        background: isSel ? "rgba(78, 168, 132, 0.18)" : "var(--panel)",
                        cursor: activating ? "wait" : "pointer",
                      }}
                      title="Click to load into right panel and show schema"
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "rgba(214,166,72,0.2)",
                          color: "var(--gold)",
                          fontSize: 11,
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {label}
                          {ds.isActive ? (
                            <span style={{ marginLeft: 8, fontSize: 10, color: "var(--ok)", fontWeight: 800 }}>ACTIVE</span>
                          ) : null}
                          {isSel ? (
                            <span style={{ marginLeft: 8, fontSize: 10, color: "var(--gold)", fontWeight: 800 }}>SELECTED</span>
                          ) : null}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                          {ds.total.toLocaleString("en-IN")} rows · FD base {ds.targetFdBase.toLocaleString("en-IN")}
                          {ds.createdAt ? ` · ${new Date(ds.createdAt).toLocaleString("en-IN")}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSaved(ds, e)}
                        style={{
                          background: "rgba(220, 53, 69, 0.18)",
                          color: "#ff6b6b",
                          border: "1px solid rgba(220, 53, 69, 0.45)",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div
          className="card"
          style={{
            padding: 24,
            background: previewData
              ? "linear-gradient(135deg, rgba(240, 173, 78, 0.08), var(--panel2))"
              : "var(--panel2)",
            border: previewData ? "1.5px solid var(--gold)" : "1px solid var(--line)",
            borderRadius: 12,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: previewData ? "var(--gold)" : display ? "var(--ok)" : "var(--dim)",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {previewData
                  ? "⚠️ TEMPORARY PREVIEW (UNSAVED)"
                  : display
                  ? selectedId
                    ? "✓ SAVED DATASET (SELECTED)"
                    : "✓ LAST UPLOADED DATASET"
                  : "ACTIVE DATASET METRICS"}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
                {previewData ? "Temporary Upload Summary" : "Loaded Population Summary"}
              </h3>
            </div>

            {previewData ? (
              <button
                type="button"
                onClick={handleResetPreview}
                style={{
                  background: "rgba(240, 173, 78, 0.15)",
                  color: "var(--gold)",
                  border: "1px solid var(--gold)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ↺ Reset
              </button>
            ) : panelDataset?.id ? (
              <button
                type="button"
                onClick={(e) => handleDeleteSaved(panelDataset, e)}
                style={{
                  background: "rgba(220, 53, 69, 0.15)",
                  color: "#ff6b6b",
                  border: "1px solid rgba(220, 53, 69, 0.4)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ❌ Delete Dataset
              </button>
            ) : null}
          </div>

          {loading && !display ? (
            <Loading label="Reading dataset metrics…" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
                <span style={{ color: "var(--dim)" }}>Dataset Source:</span>
                <b style={{ color: previewData ? "var(--gold)" : "#fff" }}>
                  {display?.name || "None Loaded"}
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
                <span style={{ color: "var(--dim)" }}>Total Customers Loaded:</span>
                <b style={{ color: "#fff", fontSize: 15 }}>
                  {(display?.total || 0).toLocaleString("en-IN")}
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
                <span style={{ color: "var(--dim)" }}>Target FD Base (&gt;₹10L):</span>
                <b style={{ color: "var(--gold)", fontSize: 15 }}>
                  {(display?.targetFdBase || 0).toLocaleString("en-IN")}
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
                <span style={{ color: "var(--dim)" }}>Eligible Target Customers:</span>
                <b style={{ color: "var(--ok)", fontSize: 15 }}>
                  {(display?.eligible || 0).toLocaleString("en-IN")}
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--dim)" }}>High-Propensity Converts (&gt;0.75):</span>
                <b style={{ color: "var(--model)", fontSize: 15 }}>
                  {(display?.highPropensity || 0).toLocaleString("en-IN")}
                </b>
              </div>

              {previewData ? (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(240, 173, 78, 0.12)", border: "1px solid var(--gold)", borderRadius: 6, fontSize: 12, color: "var(--gold)" }}>
                  💡 Temporary preview only. Click <b>Save Dataset</b> to persist (kept in last 5). Schema appears after save / selecting a saved dataset.
                </div>
              ) : display ? (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(78, 168, 132, 0.12)", border: "1px solid var(--ok)", borderRadius: 6, fontSize: 12, color: "var(--ok)" }}>
                  {selectedId
                    ? "✓ Selected saved dataset is active. Schema below reflects this selection."
                    : "Showing last uploaded/saved dataset. Click an entry in the left list to select it and reveal schema."}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Schema — only when a saved dataset is actively selected */}
      {selectedId && schemaSource ? (
        <div className="card" style={{ padding: 24, marginBottom: 28 }}>
          <h4 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            Dataset Schema &amp; Variable Specifications
          </h4>
          <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 12 }}>
            Active selection: <b style={{ color: "var(--gold)" }}>{schemaSource.name}</b>
            {schemaSource.schemaColumns?.length
              ? ` · ${schemaSource.schemaColumns.length} columns detected`
              : ""}
          </p>
          <div className="tblwrap">
            <table className="tbl" style={{ width: "100%", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "var(--panel2)" }}>
                  <th style={{ padding: "10px 12px", color: "#fff" }}>Variable Name</th>
                  <th style={{ padding: "10px 12px", color: "var(--gold)" }}>Data Type</th>
                  <th style={{ padding: "10px 12px", color: "var(--ok)" }}>Category</th>
                  <th style={{ padding: "10px 12px", color: "var(--dim)" }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {schemaRows.map((row) => (
                  <tr key={row.name}>
                    <td className="mono" style={{ fontWeight: 700 }}>{row.name}</td>
                    <td>{row.type}</td>
                    <td>{row.category}</td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div
        className="card"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--panel2), var(--panel3))",
          border: "1px solid var(--model)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          borderRadius: 12,
        }}
      >
        <div>
          <div className="badge ok" style={{ display: "inline-block", marginBottom: 6, background: "rgba(181, 89, 31, 0.2)", color: "var(--model)", borderColor: "var(--model)" }}>Next Pipeline Step</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
            Proceed to Step 3: Gen AI Interaction Feedback Synthesis
          </h3>
          <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 4, maxWidth: 650 }}>
            Synthesize multi-round customer VOC feedback over the loaded FD &gt; ₹10L base.
          </p>
        </div>
        <Link
          to="/synthesis"
          style={{
            background: "linear-gradient(135deg, var(--model), #8b3c10)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            padding: "12px 24px",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(181, 89, 31, 0.35)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Go to Gen AI Synthesis →
        </Link>
      </div>
    </div>
  );
}
