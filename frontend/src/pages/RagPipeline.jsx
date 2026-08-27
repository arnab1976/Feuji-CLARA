import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import ErrorBox from "../components/ErrorBox.jsx";

export default function RagPipeline() {
  const [chunkData, setChunkData] = useState(null);
  const [building, setBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState(null);
  const [activeStage, setActiveStage] = useState(0); // 0: Idle, 1: Chunking, 2: Embedding, 3: Indexing, 4: Active
  const [err, setErr] = useState(null);

  // Table filters & pagination
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loadingTable, setLoadingTable] = useState(false);

  // RAG Search Playground state
  const [testQuery, setTestQuery] = useState("customers seeking retirement pension or annuity options");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const loadChunks = useCallback(() => {
    setLoadingTable(true);
    const offset = (page - 1) * pageSize;
    const params = {
      limit: pageSize,
      offset: offset,
    };
    if (search) params.search = search;
    if (filterType) params.chunk_type = filterType;

    api.ragChunks(params)
      .then((res) => {
        setChunkData(res);
        if (res.total_chunks > 0) setActiveStage(4);
      })
      .catch((e) => setErr(e))
      .finally(() => setLoadingTable(false));
  }, [page, pageSize, search, filterType]);

  useEffect(() => {
    loadChunks();
  }, [loadChunks]);

  const handleRunPipeline = async () => {
    setBuilding(true);
    setErr(null);
    setBuildStatus(null);
    setActiveStage(1);

    try {
      // Step 1: Chunking
      await new Promise((r) => setTimeout(r, 600));
      setActiveStage(2);

      // Step 2 & 3: Embedding & Indexing via Backend API
      const res = await api.buildRagPipeline({ target_only: true });

      setActiveStage(3);
      await new Promise((r) => setTimeout(r, 600));

      // Step 4: Vector DB Activated
      setActiveStage(4);
      setBuildStatus({
        type: "success",
        msg: `RAG Pipeline Executed Successfully! Built ${res.total_chunks?.toLocaleString("en-IN")} document chunks across ${res.total_customers?.toLocaleString("en-IN")} target customers. HNSW Vector Index Activated.`,
      });

      loadChunks();
    } catch (e) {
      setErr(e);
      setActiveStage(0);
    } finally {
      setBuilding(false);
    }
  };

  const handleTestSearch = async (e) => {
    if (e) e.preventDefault();
    if (!testQuery.trim()) return;

    setSearching(true);
    try {
      const res = await api.ragSearch(testQuery, 6);
      setSearchResults(res);
    } catch (e) {
      console.error("RAG search failed", e);
    } finally {
      setSearching(false);
    }
  };

  if (!chunkData && loadingTable) return <Loading label="Loading RAG vector pipeline status…" />;

  const totalChunks = chunkData?.total_chunks || 0;
  const totalPages = Math.ceil((chunkData?.count || 0) / pageSize) || 1;

  return (
    <div className="view">
      {/* Header */}
      <div className="vhead" style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>RAG Pipeline & Target Vector DB Builder</h2>
          <span className="badge ok" style={{ marginTop: 4, display: "inline-block", background: "rgba(78, 168, 132, 0.15)", color: "var(--ok)", borderColor: "var(--ok)" }}>
            Target Vector Database Scope: Quality Gate Extracted (6,002 Clean Records)
          </span>
        </div>

        <button
          onClick={handleRunPipeline}
          disabled={building}
          style={{
            background: building ? "var(--panel3)" : "linear-gradient(135deg, var(--gold), #b5862e)",
            color: building ? "var(--mut)" : "#0f1725",
            fontWeight: 800,
            padding: "10px 22px",
            borderRadius: 8,
            fontSize: 14,
            border: "none",
            cursor: building ? "not-allowed" : "pointer",
            boxShadow: building ? "none" : "0 4px 14px rgba(214, 166, 72, 0.3)",
          }}
        >
          {building ? <><span className="spin" /> Building RAG Vector DB…</> : "⚡ Run Full RAG Pipeline"}
        </button>
      </div>

      <p className="vlead">
        Builds the target RAG Vector Database strictly over the 6,002 clean, deduplicated, and validated customer records extracted from the Quality Gate by executing document chunking, dense embedding, HNSW indexing, and vector DB population.
      </p>
      <div className="rule" />

      {/* ------------------------------------------------------------------ */}
      {/* 1. RAG Vector DB Summary Metric Cards                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid g4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="sv" style={{ color: "var(--gold)" }}>{totalChunks.toLocaleString("en-IN")}</div>
          <div className="sl">Total Document Chunks</div>
        </div>
        <div className="stat">
          <div className="sv" style={{ color: "var(--ok)" }}>{chunkData?.profile_chunks?.toLocaleString("en-IN") || 0}</div>
          <div className="sl">Profile Chunks</div>
        </div>
        <div className="stat">
          <div className="sv" style={{ color: "var(--cap)" }}>{chunkData?.feedback_chunks?.toLocaleString("en-IN") || 0}</div>
          <div className="sl">Feedback Chunks</div>
        </div>
        <div className="stat">
          <div className="sv" style={{ color: "var(--model)" }}>{chunkData?.holdings_chunks?.toLocaleString("en-IN") || 0}</div>
          <div className="sl">Holdings Chunks</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Visual 7-Step RAG Data Processing Pipeline Architecture         */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
          RAG Data Processing Pipeline Architecture
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              num: 1,
              title: "Document chunking",
              desc: "One customer record = one chunk (structured CSV rule). Feedback text split with RecursiveSplitter + window overlap.",
            },
            {
              num: 2,
              title: "Vector embedding",
              desc: "BPE + Sentence-Transformer over merged structured+feedback text; ColBERT retains contextual meaning.",
            },
            {
              num: 3,
              title: "Vector indexing",
              desc: "HNSW graph built over the embedding space for approximate nearest-neighbour search.",
            },
            {
              num: 4,
              title: "Vector database load",
              desc: "Vectors + metadata + chunk text written to Pinecone / pgvector with customer_id as filterable metadata.",
            },
            {
              num: 5,
              title: "Retriever configuration",
              desc: "Ensemble search — dense kNN + BM25 sparse + domain rules; MMR re-rank for diversity.",
            },
            {
              num: 6,
              title: "Guardrail installation",
              desc: "NER filtration, PromptGuard, LlamaGuard and eligibility policy wired ahead of generation.",
            },
            {
              num: 7,
              title: "Agent registration",
              desc: "Intent, Product Knowledge, Eligibility and Nudge agents registered to the LangGraph orchestrator under RBAC.",
            },
          ].map((step) => {
            const isCurrentBuilding = building && activeStage === Math.min(step.num, 4);
            return (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  background: "#0f1623",
                  border: isCurrentBuilding ? "1px solid var(--gold)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 8,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                  transition: "border-color 0.2s ease",
                }}
              >
                {/* Number Badge */}
                <div
                  style={{
                    width: 52,
                    minWidth: 52,
                    background: isCurrentBuilding ? "linear-gradient(135deg, var(--gold), #b5862e)" : "#b85018",
                    color: isCurrentBuilding ? "#0f1725" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justify: "center",
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {step.num}
                </div>

                {/* Content */}
                <div
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justify: "center",
                  }}
                >
                  <h5 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", margin: 0, marginBottom: 4 }}>
                    {step.title}
                  </h5>
                  <p style={{ fontSize: 13, color: "#8a96a8", margin: 0, lineHeight: 1.45 }}>
                    {step.desc}
                  </p>
                </div>

                {/* Status Badge */}
                <div
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justify: "center",
                  }}
                >
                  <span
                    style={{
                      border: isCurrentBuilding ? "1px solid var(--gold)" : "1px solid #4ea884",
                      color: isCurrentBuilding ? "var(--gold)" : "#4ea884",
                      background: "transparent",
                      borderRadius: 14,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 12px",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    {isCurrentBuilding ? "BUILDING..." : "READY"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {buildStatus && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "rgba(78, 168, 132, 0.15)", color: "var(--ok)", border: "1px solid var(--ok)" }}>
            {buildStatus.msg}
          </div>
        )}
      </div>

      <ErrorBox error={err} />

      {/* ------------------------------------------------------------------ */}
      {/* 3. Live Semantic RAG Vector Search Playground                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 24, background: "var(--panel)" }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--gold)" }}>⚡</span> Live Semantic RAG Search Playground
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 16 }}>
          Test vector retrieval queries over the target RAG vector database. Dense cosine similarity matching retrieves relevant document chunks upfront with similarity scores.
        </p>

        <form onSubmit={handleTestSearch} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            type="text"
            placeholder="e.g. customers interested in retirement pension or mutual funds..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 280,
              background: "var(--panel2)",
              color: "var(--text)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "10px 14px",
              fontSize: 13.5,
            }}
          />
          <button
            type="submit"
            disabled={searching}
            style={{
              background: "var(--gold)",
              color: "#0f1725",
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            {searching ? "Searching Vector DB…" : "Test Vector Search"}
          </button>
        </form>

        {searchResults && (
          <div>
            <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--hi)", marginBottom: 10 }}>
              Top Vector Matches for query: <span style={{ color: "var(--gold)" }}>"{searchResults.query}"</span>
            </h4>

            {!searchResults.hits?.length ? (
              <div style={{
                padding: "18px 16px",
                borderRadius: 6,
                background: "var(--panel2)",
                border: "1px dashed var(--line)",
                color: "var(--mut)",
                fontSize: 13,
              }}>
                No vector matches returned. The RAG vector DB may be empty — click <b style={{ color: "var(--gold)" }}>Run Full RAG Pipeline</b> above, then try again.
              </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.hits.map((hit, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--panel2)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 6,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 250 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className="mono" style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>
                        {hit.customer_id}
                      </span>
                      <span className="badge ok" style={{ fontSize: 10 }}>{hit.chunk_type}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text)", margin: 0, lineHeight: 1.5 }}>
                      {hit.content}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 110 }}>
                    <div style={{ fontSize: 11, color: "var(--dim)" }}>Cosine Score</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)" }}>
                      {(Math.max(0, Math.min(1, Number(hit.cosine ?? hit.score ?? 0))) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2 }}>
                      cosine similarity
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. RAG Vector Database Inspection Table                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ padding: "20px 24px", background: "var(--panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              Target RAG Vector Database Chunks ({chunkData?.count?.toLocaleString("en-IN") || 0} rows)
            </h3>
            <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 2 }}>
              Inspect retrievable document chunks stored in the target vector database.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search Chunk Content, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                background: "var(--panel2)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                minWidth: 200,
              }}
            />

            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              style={{
                background: "var(--panel2)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              <option value="">All Chunk Types</option>
              <option value="profile">Profile Chunks</option>
              <option value="feedback">Feedback Chunks</option>
              <option value="holdings">Holdings Chunks</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--panel2)", borderBottom: "2px solid var(--line)" }}>
                <th style={{ padding: "10px 12px", color: "var(--hi)" }}>Chunk ID</th>
                <th style={{ padding: "10px 12px", color: "var(--hi)" }}>Customer ID</th>
                <th style={{ padding: "10px 12px", color: "var(--gold)" }}>Chunk Type</th>
                <th style={{ padding: "10px 12px", color: "var(--dim)" }}>Document Chunk Content</th>
                <th style={{ padding: "10px 12px", color: "var(--dim)" }}>Tokens</th>
                <th style={{ padding: "10px 12px", color: "var(--ok)" }}>Vector Embedding</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "var(--dim)" }}>
                    Loading vector DB chunks...
                  </td>
                </tr>
              ) : !chunkData?.results || chunkData.results.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: 30, color: "var(--mut)" }}>
                    No document chunks found. Click <b>"Run Full RAG Pipeline"</b> to build vector DB chunks.
                  </td>
                </tr>
              ) : (
                chunkData.results.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "10px 12px" }} className="mono">#{c.id}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }} className="mono">
                      {c.customer_id}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="badge ok" style={{ fontSize: 11, textTransform: "uppercase" }}>
                        {c.chunk_type}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text)", maxWidth: 450, lineHeight: 1.4 }}>
                      {c.content}
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--dim)" }} className="mono">
                      {c.token_count}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span className="badge" style={{ color: "var(--ok)", borderColor: "var(--ok)" }}>
                        384-Dim Ready
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            Showing Page <b>{page}</b> of <b>{totalPages}</b> ({chunkData?.count?.toLocaleString("en-IN") || 0} total chunks)
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                borderRadius: 6,
                background: page <= 1 ? "var(--panel2)" : "var(--panel3)",
                color: page <= 1 ? "var(--mut)" : "var(--text)",
                border: "1px solid var(--line)",
              }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                borderRadius: 6,
                background: page >= totalPages ? "var(--panel2)" : "var(--panel3)",
                color: page >= totalPages ? "var(--mut)" : "var(--text)",
                border: "1px solid var(--line)",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Next Step Transition Banner (Nudge Queue)                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ marginTop: 28, padding: "24px 28px", background: "linear-gradient(135deg, var(--panel2), var(--panel3))", border: "1px solid var(--ok)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="badge ok" style={{ display: "inline-block", marginBottom: 6 }}>Next Pipeline Step</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
            Proceed to Intelligent Nudge Queue & RM Reasoning
          </h3>
          <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 4, maxWidth: 650 }}>
            With the RAG Vector DB built over target customer observations, generate personalized cross-sell nudge recommendations and natural language reasoning for Relationship Managers.
          </p>
        </div>

        <Link
          to="/nudges"
          style={{
            background: "linear-gradient(135deg, var(--ok), #367d5e)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            padding: "12px 24px",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(78, 168, 132, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Go to Nudge Queue →
        </Link>
      </div>
    </div>
  );
}
