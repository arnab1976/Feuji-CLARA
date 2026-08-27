const BASE = import.meta.env.VITE_API_BASE || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: "bad_json", detail: text.slice(0, 400) };
  }
  if (!res.ok) {
    const err = new Error(body?.detail || body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  health: () => request("/health/"),
  stats: () => request("/stats/"),
  products: () => request("/products/"),
  resetData: () => request("/reset/", { method: "POST" }),
  uploadCustomers: async (formData) => {
    const res = await fetch(`${BASE}/upload/`, {
      method: "POST",
      body: formData,
    });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { error: "bad_json", detail: text.slice(0, 400) };
    }
    if (!res.ok) {
      const err = new Error(body?.detail || body?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  },
  savedDatasets: () => request("/datasets/"),
  activateSavedDataset: (id) => request(`/datasets/${id}/activate/`, { method: "POST" }),
  deleteSavedDataset: (id) => request(`/datasets/${id}/`, { method: "DELETE" }),

  customers: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return request(`/customers/${q ? `?${q}` : ""}`);
  },
  customer: (id) => request(`/customers/${id}/`),
  recommend: (id) => request(`/customers/${id}/recommend/`, { method: "POST" }),
  eligibility: (id, product) =>
    request(`/customers/${id}/eligibility/${product ? `?product=${product}` : ""}`),
  nudgeQueue: (params = {}) => {
    // Drop empty / null / undefined so we never send search=undefined (filters to 0 rows).
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return request(`/nudge-queue/${q ? `?${q}` : ""}`);
  },

  chat: (message, sessionId) =>
    request("/chat/", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),
  trendingQuestions: () => request("/chat/trending-questions/"),
  chatHistory: (sid) => request(`/chat/${sid}/`),

  synthesisRuns: () => request("/synthesis/runs/"),
  synthesisStep: (params = {}, { onEvent } = {}) => {
    const body = {
      stream: 1,
      use_llm: params.use_llm !== false,
      batch_pct: params.batch_pct ?? 10.0,
      chunk_size: params.chunk_size,
      ...params,
    };
    return fetch(`${BASE}/synthesis/step/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        let parsed;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = { detail: text.slice(0, 400) };
        }
        const err = new Error(parsed?.detail || parsed?.error || `HTTP ${res.status}`);
        err.status = res.status;
        err.body = parsed;
        throw err;
      }

      // Non-stream JSON fallback
      const ctype = res.headers.get("content-type") || "";
      if (ctype.includes("application/json") && !ctype.includes("ndjson")) {
        const data = await res.json();
        if (onEvent) onEvent({ event: "done", ...data });
        return data;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalEvt = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let evt;
          try {
            evt = JSON.parse(trimmed);
          } catch {
            continue;
          }
          if (evt.event === "error") {
            const err = new Error(evt.detail || evt.error || "synthesis_failed");
            err.body = evt;
            throw err;
          }
          if (onEvent) onEvent(evt);
          if (evt.event === "done") finalEvt = evt;
        }
      }

      if (buffer.trim()) {
        try {
          const evt = JSON.parse(buffer.trim());
          if (onEvent) onEvent(evt);
          if (evt.event === "done") finalEvt = evt;
          if (evt.event === "error") {
            const err = new Error(evt.detail || evt.error || "synthesis_failed");
            err.body = evt;
            throw err;
          }
        } catch (e) {
          if (e.body) throw e;
        }
      }

      if (!finalEvt) {
        throw new Error("Synthesis stream ended without a completion event");
      }
      return finalEvt;
    });
  },
  synthesisReset: () => request("/synthesis/reset/", { method: "POST" }),
  buildRagPipeline: (params = {}) =>
    request("/rag/build/", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  ragChunks: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return request(`/rag/chunks/${q ? `?${q}` : ""}`);
  },
  ragSearch: (q, k = 8) => request(`/rag/search/?q=${encodeURIComponent(q)}&k=${k}`),
  qualityGate: () => request("/quality-gate/"),
  validate: (customerId) => request(`/validate/${customerId ? `${customerId}/` : ""}`),
};

export const inr = (n) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Number(n).toLocaleString("en-IN")}`;
};

export const pct = (n) => `${(Number(n) * 100).toFixed(0)}%`;
