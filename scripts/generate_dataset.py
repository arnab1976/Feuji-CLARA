"""
Generate the 10,000-customer cross-sell dataset.

Spec
----
* 10,000 customers at customer_id level, 1 year of history.
* Base cohort  : FD holders with running FD balance > INR 10,00,000.
* Target       : third-party Insurance & Wealth-Management products.
* Cross-sell % : ~5% positive rate on the eligible base.
* Feedback     : ~10% of customers carry REAL unstructured feedback
                 (VOC / inbound call / SMS / outbound / complaint).
                 The remaining ~90% are synthesized downstream by the
                 iterative growing-seed loop (see backend/ingest/synthesize.py).

NOTE
----
The cross-sell target variable is treated as GROUND TRUTH SUPPLIED BY THE BANK.
This project does not train a cross-sell model; the label already exists and the
application only reasons over it. `propensity_score` here is the bank-supplied
score that ships alongside the label.

Usage
-----
    python scripts/generate_dataset.py --rows 10000 --out data/customers.csv
"""

from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass, asdict, fields
from datetime import date, timedelta
from pathlib import Path

SEED = 20260722

CITY_TIERS = ["Tier-1", "Tier-2", "Tier-3"]
OCCUPATIONS = ["Salaried", "Self-Employed", "Business", "Professional", "Retired"]
LIFE_STAGES = ["Young-Earner", "Family-Builder", "Peak-Earner", "Pre-Retiree", "Retiree"]
MARITAL = ["Single", "Married"]
SEGMENTS = ["Classic", "Preferred", "Imperia"]

FEEDBACK_CHANNELS = ["VOC", "InboundCall", "SMS", "Outbound", "Complaint"]

# Real feedback templates keyed by the dominant signal they carry.
FEEDBACK_TEMPLATES = {
    "protection_intent": [
        "Customer enquired about family health cover during branch visit; asked for premium comparison.",
        "Called to ask whether the bank offers a health policy that covers dependent parents.",
        "Asked over SMS for details on a family floater plan after a relative's hospitalisation.",
    ],
    "yield_fatigue": [
        "Customer unhappy with FD renewal rate; asked what else gives better returns.",
        "Enquired about alternatives to fixed deposit as rates have dropped this year.",
        "Mentioned during the call that FD returns no longer beat inflation.",
    ],
    "wealth_intent": [
        "Asked about starting a monthly SIP; wanted to understand equity exposure.",
        "Requested a portfolio review and information on mutual fund options.",
        "Enquired about tax-saving investment products before the financial year end.",
    ],
    "retirement_intent": [
        "Discussed retirement planning; asked about pension and annuity products.",
        "Wanted to know how to generate regular income after retiring next year.",
        "Asked whether the bank offers a guaranteed pension scheme.",
    ],
    "service_issue": [
        "Complaint raised regarding delayed FD maturity credit; resolved within SLA.",
        "Reported an issue with net-banking access; escalated and closed.",
        "Complaint about incorrect service charge; amount reversed.",
    ],
    "neutral": [
        "Routine balance enquiry over the call centre; no product interest expressed.",
        "Requested a duplicate account statement via SMS.",
        "Called to update registered mobile number.",
    ],
}

SENTIMENT_BY_SIGNAL = {
    "protection_intent": "positive",
    "yield_fatigue": "neutral",
    "wealth_intent": "positive",
    "retirement_intent": "positive",
    "service_issue": "negative",
    "neutral": "neutral",
}


@dataclass
class Customer:
    # --- identity -------------------------------------------------------
    customer_id: str
    # --- demography (independent) --------------------------------------
    age: int
    gender: str
    marital_status: str
    city_tier: str
    occupation: str
    life_stage: str
    annual_income: int
    relationship_tenure_months: int
    segment: str
    # --- balances (independent) ----------------------------------------
    fd_balance: int
    fd_count: int
    fd_avg_tenor_months: int
    rd_balance: int
    sb_balance: int
    aqb: int
    balance_gt_10l_flag: int
    # --- holdings (independent) ----------------------------------------
    num_products: int
    num_accounts: int
    has_demat: int
    demat_balance: int
    has_loan: int
    loan_outstanding: int
    # --- transactions (independent) ------------------------------------
    debit_txn_count_12m: int
    credit_txn_count_12m: int
    debit_txn_value_12m: int
    credit_txn_value_12m: int
    avg_monthly_txn_count: float
    digital_txn_ratio: float
    # --- risk / servicing (independent) --------------------------------
    cibil_score: int
    delinquency_flag: int
    complaint_count_12m: int
    nrv_12m: int
    # --- existing third-party holdings ---------------------------------
    holds_3p_insurance: int
    holds_wealth_product: int
    # --- unstructured feedback -----------------------------------------
    has_real_feedback: int
    feedback_channel: str
    feedback_text: str
    feedback_sentiment: str
    feedback_signal: str
    feedback_date: str
    # --- cohort flags ---------------------------------------------------
    is_fd_base: int          # FD balance > 10L
    is_eligible: int         # in base AND holds no third-party product
    # --- BANK-SUPPLIED TARGET (ground truth, not modelled here) --------
    cross_sell_flag: int
    cross_sell_product: str
    propensity_score: float


def inr(x: float) -> int:
    return int(round(x, -2))


def make_customer(i: int, rng: random.Random) -> Customer:
    cid = f"CUST-{100000 + i}"

    age = int(min(78, max(23, rng.gauss(43, 12))))
    if age < 32:
        life = "Young-Earner"
    elif age < 42:
        life = "Family-Builder"
    elif age < 54:
        life = "Peak-Earner"
    elif age < 62:
        life = "Pre-Retiree"
    else:
        life = "Retiree"

    occupation = "Retired" if age >= 62 else rng.choice(OCCUPATIONS[:-1])
    gender = rng.choice(["M", "F"])
    marital = "Married" if age > 30 and rng.random() < 0.78 else rng.choice(MARITAL)
    city_tier = rng.choices(CITY_TIERS, weights=[0.5, 0.33, 0.17])[0]

    income_base = {"Tier-1": 1_450_000, "Tier-2": 1_050_000, "Tier-3": 780_000}[city_tier]
    annual_income = inr(max(300_000, rng.gauss(income_base, income_base * 0.36)))

    tenure = rng.randint(6, 240)

    # ---- FD: ~62% of the book sits above the 10L base threshold --------
    if rng.random() < 0.62:
        fd_balance = inr(rng.uniform(1_000_001, 6_500_000) ** 1.0)
        if rng.random() < 0.12:
            fd_balance = inr(rng.uniform(6_500_000, 14_000_000))
    else:
        fd_balance = inr(rng.uniform(25_000, 1_000_000))

    fd_count = 1 + int(fd_balance > 2_000_000) + int(fd_balance > 5_000_000) + rng.randint(0, 1)
    fd_tenor = rng.choice([12, 18, 24, 36, 60])

    rd_balance = inr(rng.uniform(0, 450_000)) if rng.random() < 0.46 else 0
    sb_balance = inr(max(8_000, rng.gauss(fd_balance * 0.16, 180_000)))
    aqb = inr(max(6_000, sb_balance * rng.uniform(0.55, 1.15)))
    balance_gt_10l = int(max(fd_balance, sb_balance, rd_balance) > 1_000_000)

    has_demat = int(rng.random() < 0.34)
    demat_balance = inr(rng.uniform(30_000, 2_400_000)) if has_demat else 0
    has_loan = int(rng.random() < 0.38)
    loan_outstanding = inr(rng.uniform(120_000, 5_200_000)) if has_loan else 0

    num_accounts = 1 + int(rd_balance > 0) + fd_count + int(has_demat)
    num_products = num_accounts + has_loan

    monthly = max(3, rng.gauss(19, 8))
    debit_cnt = int(monthly * 12 * rng.uniform(0.75, 1.25))
    credit_cnt = int(debit_cnt * rng.uniform(0.35, 0.85))
    debit_val = inr(debit_cnt * rng.uniform(2_200, 11_000))
    credit_val = inr(credit_cnt * rng.uniform(4_500, 26_000))
    digital_ratio = round(min(0.99, max(0.05, rng.gauss(0.71, 0.19))), 3)

    cibil = int(min(900, max(560, rng.gauss(762, 62))))
    delinquency = int(cibil < 640 and rng.random() < 0.42)
    complaints = rng.choices([0, 1, 2, 3], weights=[0.79, 0.14, 0.05, 0.02])[0]
    nrv = inr(sb_balance * 0.45 + fd_balance * 0.28 + demat_balance * 0.35)

    # ---- existing third-party holdings ---------------------------------
    holds_ins = int(rng.random() < 0.24)
    holds_wealth = int(rng.random() < 0.19)

    is_fd_base = int(fd_balance > 1_000_000)
    is_eligible = int(is_fd_base and not holds_ins and not holds_wealth and not delinquency)

    # ---- unstructured feedback: ~10% real ------------------------------
    has_real_fb = int(rng.random() < 0.10)
    if has_real_fb:
        if age >= 50 and rng.random() < 0.45:
            signal = "retirement_intent"
        elif complaints > 0 and rng.random() < 0.55:
            signal = "service_issue"
        elif fd_balance > 2_500_000 and rng.random() < 0.42:
            signal = "yield_fatigue"
        elif life in ("Family-Builder", "Peak-Earner") and rng.random() < 0.45:
            signal = "protection_intent"
        elif rng.random() < 0.4:
            signal = "wealth_intent"
        else:
            signal = "neutral"
        text = rng.choice(FEEDBACK_TEMPLATES[signal])
        channel = rng.choice(FEEDBACK_CHANNELS)
        sentiment = SENTIMENT_BY_SIGNAL[signal]
        fb_date = (date(2025, 7, 1) + timedelta(days=rng.randint(0, 364))).isoformat()
    else:
        signal, text, channel, sentiment, fb_date = "", "", "", "", ""

    # ---- BANK-SUPPLIED cross-sell label --------------------------------
    # Ground truth from the bank. Weighted so the eligible base converts at ~5%.
    score = 0.0
    if is_eligible:
        score += 0.28
        score += min(0.22, fd_balance / 30_000_000)
        score += 0.10 if life in ("Family-Builder", "Peak-Earner", "Pre-Retiree") else 0.0
        score += 0.08 if digital_ratio > 0.7 else 0.0
        score += 0.07 if nrv > 1_500_000 else 0.0
        score += 0.06 if cibil > 760 else 0.0
        score -= 0.10 if complaints > 1 else 0.0
        if has_real_fb and signal in ("protection_intent", "wealth_intent", "retirement_intent", "yield_fatigue"):
            score += 0.18
        score += rng.gauss(0, 0.07)
    score = round(min(0.99, max(0.01, score)), 4)

    # Calibrated so that converts land at ~5% of the eligible base.
    converted = int(is_eligible and score > 0.72 and rng.random() < 0.23)

    if converted:
        if signal == "retirement_intent" or age >= 52:
            product = "Retirement-Pension"
        elif signal == "protection_intent" or (life == "Family-Builder" and rng.random() < 0.6):
            product = "Health-Insurance"
        elif signal == "wealth_intent" or has_demat:
            product = "Mutual-Fund"
        elif signal == "yield_fatigue":
            product = "ULIP"
        else:
            product = rng.choice(["Health-Insurance", "Mutual-Fund", "ULIP", "Term-Life"])
    else:
        product = ""

    return Customer(
        customer_id=cid,
        age=age, gender=gender, marital_status=marital, city_tier=city_tier,
        occupation=occupation, life_stage=life, annual_income=annual_income,
        relationship_tenure_months=tenure, segment=rng.choices(SEGMENTS, weights=[.55, .33, .12])[0],
        fd_balance=fd_balance, fd_count=fd_count, fd_avg_tenor_months=fd_tenor,
        rd_balance=rd_balance, sb_balance=sb_balance, aqb=aqb,
        balance_gt_10l_flag=balance_gt_10l,
        num_products=num_products, num_accounts=num_accounts,
        has_demat=has_demat, demat_balance=demat_balance,
        has_loan=has_loan, loan_outstanding=loan_outstanding,
        debit_txn_count_12m=debit_cnt, credit_txn_count_12m=credit_cnt,
        debit_txn_value_12m=debit_val, credit_txn_value_12m=credit_val,
        avg_monthly_txn_count=round(monthly, 2), digital_txn_ratio=digital_ratio,
        cibil_score=cibil, delinquency_flag=delinquency,
        complaint_count_12m=complaints, nrv_12m=nrv,
        holds_3p_insurance=holds_ins, holds_wealth_product=holds_wealth,
        has_real_feedback=has_real_fb, feedback_channel=channel,
        feedback_text=text, feedback_sentiment=sentiment,
        feedback_signal=signal, feedback_date=fb_date,
        is_fd_base=is_fd_base, is_eligible=is_eligible,
        cross_sell_flag=converted, cross_sell_product=product,
        propensity_score=score,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", type=int, default=10000)
    ap.add_argument("--out", type=str, default="data/customers.csv")
    ap.add_argument("--seed", type=int, default=SEED)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    rows = [make_customer(i, rng) for i in range(args.rows)]

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cols = [f.name for f in fields(Customer)]
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))

    # ---- summary --------------------------------------------------------
    n = len(rows)
    base = sum(r.is_fd_base for r in rows)
    elig = sum(r.is_eligible for r in rows)
    conv = sum(r.cross_sell_flag for r in rows)
    real_fb = sum(r.has_real_feedback for r in rows)
    print(f"rows                       : {n:,}")
    print(f"FD base (> INR 10L)        : {base:,}  ({base/n:.1%})")
    print(f"eligible (no 3P product)   : {elig:,}  ({elig/n:.1%})")
    print(f"cross-sell converts        : {conv:,}")
    print(f"  -> % of eligible base    : {conv/max(elig,1):.2%}")
    print(f"real feedback (unstructured): {real_fb:,}  ({real_fb/n:.1%})")
    print(f"written to                 : {out}")


if __name__ == "__main__":
    main()
