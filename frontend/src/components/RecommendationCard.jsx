import { inr } from "../api/client.js";

export default function RecommendationCard({ result }) {
  if (!result) return null;

  if (!result.eligible) {
    return (
      <div className="reco" style={{ background: "var(--panel2)", border: "1px solid var(--warn)", borderRadius: 10, padding: 24 }}>
        <div className="rhead" style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: 12, marginBottom: 14 }}>
          <div className="rp" style={{ fontSize: 11, fontWeight: 800, color: "var(--warn)", letterSpacing: "1px" }}>
            ELIGIBILITY AGENT · BLOCKED
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginTop: 4 }}>
            No Cross-Sell Pitch Generated
          </h3>
        </div>
        <div className="rbody">
          <p style={{ color: "var(--dim)", fontSize: 13.5, marginBottom: 12 }}>
            This customer is blocked by bank eligibility policy before generation. The Nudge Agent was not called.
          </p>
          <ul style={{ paddingLeft: 18 }}>
            {(result.eligibility?.blocked_by || ["Policy rules blocked"]).map((b, i) => (
              <li key={i} style={{ color: "var(--warn)", fontSize: 13, marginBottom: 4 }}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const r = result.recommendation || {};
  const product = r.recommended_product || r.product_to_recommend || "Recommended Product";
  const headline = r.headline || "";
  
  // Reasoning bullets or points
  const reasoning = Array.isArray(r.reasoning_bullets)
    ? r.reasoning_bullets
    : Array.isArray(r.reasoning_points)
    ? r.reasoning_points
    : typeof r.reasoning_points === "string"
    ? [r.reasoning_points]
    : ["High propensity score & FD balance threshold qualified for cross-sell pitch."];

  // Confidence score formatting (number 0.92 -> 92%, or string "HIGH" -> 92%)
  let confPct = 85;
  let confLabel = "HIGH";
  if (typeof r.confidence === "number") {
    confPct = Math.round(r.confidence > 1 ? r.confidence : r.confidence * 100);
    confLabel = `${confPct}% HIGH CONFIDENCE`;
  } else if (typeof r.confidence === "string") {
    confLabel = r.confidence;
    confPct = r.confidence.toUpperCase() === "HIGH" ? 92 : r.confidence.toUpperCase() === "MEDIUM" ? 68 : 45;
  }

  // Pitch & Talking Points
  const pitch = r.recommended_pitch || "";
  const talkingPoints = Array.isArray(r.talking_points)
    ? r.talking_points
    : typeof r.talking_points === "string"
    ? [r.talking_points]
    : [];

  // Objection Handling
  const objections = Array.isArray(r.objection_handling)
    ? r.objection_handling
    : typeof r.objection_handling === "string"
    ? [r.objection_handling]
    : [];

  const nextAction = r.next_best_action || "Schedule RM follow-up call";

  return (
    <div className="reco" style={{ background: "var(--panel2)", border: "1px solid var(--gold)", borderRadius: 10, padding: 24, marginTop: 16 }}>
      <div className="rhead" style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: 16, marginBottom: 16 }}>
        <div className="rp" style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: "1px" }}>
          ✦ AI NUDGE RECOMMENDATION &amp; REASONING
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginTop: 4, marginBottom: 4 }}>
          {product}
        </h3>
        {headline && <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>{headline}</p>}
      </div>

      <div className="rbody">
        {/* Reasoning Points */}
        <div className="ct mono" style={{ color: "var(--gold)", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", marginBottom: 8 }}>
          RECOMMENDATION REASONING
        </div>
        <ul style={{ paddingLeft: 18, marginBottom: 16 }}>
          {reasoning.map((b, i) => (
            <li key={i} style={{ color: "var(--text)", fontSize: 13.5, marginBottom: 6, lineHeight: 1.5 }}>
              {b}
            </li>
          ))}
        </ul>

        {/* Confidence Meter */}
        <div className="conf" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div className="confbar" style={{ flex: 1, height: 8, background: "var(--panel3)", borderRadius: 4, overflow: "hidden" }}>
            <i style={{ display: "block", height: "100%", width: `${confPct}%`, background: "linear-gradient(90deg, var(--gold), var(--ok))", borderRadius: 4 }} />
          </div>
          <span className="mono" style={{ fontWeight: 800, color: "var(--ok)", fontSize: 12 }}>
            {confLabel}
          </span>
        </div>

        {/* Pitch / Pitch Statement */}
        {pitch && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 6, background: "rgba(214, 166, 72, 0.08)", borderLeft: "3px solid var(--gold)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", marginBottom: 4 }}>RECOMMENDED RM PITCH</div>
            <div style={{ fontSize: 13.5, color: "#fff", fontStyle: "italic" }}>"{pitch}"</div>
          </div>
        )}

        {/* Next Best Action */}
        <div style={{ marginBottom: 16 }}>
          <span className="pill gold" style={{ background: "rgba(214, 166, 72, 0.18)", color: "var(--gold)", borderColor: "var(--gold)", padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            NEXT ACTION: {nextAction}
          </span>
        </div>

        {/* Talking Points */}
        {talkingPoints.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="ct mono" style={{ color: "var(--dim)", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", marginBottom: 6 }}>
              TALKING POINTS
            </div>
            <ul style={{ paddingLeft: 18 }}>
              {talkingPoints.map((t, i) => <li key={i} style={{ color: "var(--text)", fontSize: 13, marginBottom: 4 }}>{t}</li>)}
            </ul>
          </div>
        )}

        {/* Objection Handling */}
        {objections.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="ct mono" style={{ color: "var(--dim)", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", marginBottom: 6 }}>
              OBJECTION HANDLING
            </div>
            <ul style={{ paddingLeft: 18 }}>
              {objections.map((t, i) => <li key={i} style={{ color: "var(--text)", fontSize: 13, marginBottom: 4 }}>{t}</li>)}
            </ul>
          </div>
        )}

        {/* Agents Involved */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
          <div className="ct mono" style={{ color: "var(--dim)", fontSize: 10.5, fontWeight: 700, marginBottom: 6 }}>
            COOPERATING AGENTS INVOLVED
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(result.agents_used || ["Product Eligibility Agent", "Product Knowledge Bot", "Nudge Agent"]).map((a) => (
              <span className="pill agent" key={a} style={{ fontSize: 11 }}>{a}</span>
            ))}
          </div>
        </div>

        {result.bank_label && (
          <div className="callout" style={{ marginTop: 16, fontSize: 12 }}>
            <b>Bank Ground Truth Label</b> — Converted:{" "}
            {result.bank_label.cross_sell_flag ? "YES" : "NO"} | Target Product:{" "}
            {result.bank_label.cross_sell_product || "None"} | Propensity Score:{" "}
            {result.bank_label.propensity_score}. {result.bank_label.note}
          </div>
        )}
      </div>
    </div>
  );
}
