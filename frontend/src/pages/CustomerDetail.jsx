import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, inr } from "../api/client.js";
import Loading from "../components/Loading.jsx";
import ErrorBox from "../components/ErrorBox.jsx";
import RecommendationCard from "../components/RecommendationCard.jsx";

export default function CustomerDetail() {
  const { customerId } = useParams();
  const [c, setC] = useState(null);
  const [reco, setReco] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const generate = async () => {
    setBusy(true); setErr(null);
    try { setReco(await api.recommend(customerId)); }
    catch (e) { setErr(e); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    setC(null); setReco(null); setErr(null);
    let cancelled = false;
    api.customer(customerId)
      .then((data) => {
        if (cancelled) return;
        setC(data);
      })
      .catch((e) => { if (!cancelled) setErr(e); });
    return () => { cancelled = true; };
  }, [customerId]);

  // Auto-generate recommendation when opening from the nudge queue.
  useEffect(() => {
    if (!c || reco || busy) return;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.customer_id]);

  if (err && !c) return <div className="view"><ErrorBox error={err} /></div>;
  if (!c) return <Loading label="Loading customer…" />;

  const kv = [
    ["Age", c.age], ["Gender", c.gender], ["Segment", c.segment],
    ["Occupation", c.occupation], ["Life stage", c.life_stage], ["City tier", c.city_tier],
    ["FD balance", inr(c.fd_balance)], ["FD count", c.fd_count],
    ["RD balance", inr(c.rd_balance)], ["SB balance", inr(c.sb_balance)],
    ["AQB", inr(c.aqb)], ["NRV (12m)", inr(c.nrv_12m)],
    ["Products", c.num_products], ["Accounts", c.num_accounts],
    ["Debit txns (12m)", c.debit_txn_count_12m], ["Credit txns (12m)", c.credit_txn_count_12m],
    ["Digital ratio", `${(c.digital_txn_ratio * 100).toFixed(0)}%`],
    ["Demat balance", c.has_demat ? inr(c.demat_balance) : "—"],
    ["Loan outstanding", c.has_loan ? inr(c.loan_outstanding) : "—"],
    ["CIBIL", c.cibil_score], ["Complaints (12m)", c.complaint_count_12m],
  ];

  return (
    <div className="view">
      <div className="vhead">
        <h2 className="mono" style={{ color: "var(--gold)" }}>{c.customer_id}</h2>
        <Link className="btn ghost sm" to="/nudges">‹ Back to queue</Link>
      </div>
      <p className="vlead">{c.profile_sentence}</p>
      <div className="rule" />

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="sv">{inr(c.fd_balance)}</div><div className="sl">FD balance</div></div>
        <div className="stat"><div className="sv" style={{ color: "var(--gold)" }}>{c.propensity_score?.toFixed(2)}</div><div className="sl">Bank propensity</div></div>
        <div className="stat"><div className="sv" style={{ color: c.is_eligible ? "var(--ok)" : "var(--warn)" }}>{c.is_eligible ? "YES" : "NO"}</div><div className="sl">Eligible</div></div>
        <div className="stat"><div className="sv">{c.cross_sell_product || "—"}</div><div className="sl">Bank product</div></div>
      </div>

      <div className="grid g2">
        <div className="card" style={{ "--accent": "var(--cap)" }}>
          <div className="ct">Structured profile</div>
          <table className="tbl">
            <tbody>
              {kv.map(([k, v]) => (
                <tr key={k}><td style={{ color: "var(--mut)" }}>{k}</td><td><b>{String(v)}</b></td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="card" style={{ "--accent": "var(--model)", marginBottom: 14 }}>
            <div className="ct">Feedback on record</div>
            {c.feedback?.length ? c.feedback.map((f, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <span className={`pill ${f.is_synthetic ? "" : "ok"}`}>
                  {f.is_synthetic ? `synthetic · round ${f.synthesis_round ?? "?"}` : `real · ${f.channel}`}
                </span>
                <span className="pill">{f.sentiment}</span>
                <span className="pill">{f.signal}</span>
                <p style={{ marginTop: 8 }}>{f.text}</p>
              </div>
            )) : <p>No feedback on record.</p>}
          </div>

          <button className="btn" onClick={generate} disabled={busy}>
            {busy ? <><span className="spin" /> Generating…</> : "✦ Generate recommendation"}
          </button>
          <ErrorBox error={err} />
          <div style={{ marginTop: 14 }}>
            <RecommendationCard result={reco} />
          </div>
        </div>
      </div>
    </div>
  );
}
