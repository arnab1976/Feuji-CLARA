export default function ErrorBox({ error }) {
  if (!error) return null;
  const isLLM = error.body?.error === "llm_not_configured";
  return (
    <div className={`callout ${isLLM ? "" : "bad"}`}>
      <b>{isLLM ? "LLM not configured" : "Error"}</b> — {error.message}
      {isLLM && (
        <div style={{ marginTop: 8 }}>
          Export <code className="mono">ANTHROPIC_API_KEY</code> and restart the backend.
        </div>
      )}
    </div>
  );
}
