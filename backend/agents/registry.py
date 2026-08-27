"""
Agent registry.

Four agents cooperate behind the RM chatbot and the recommendation endpoint:

  IntentAgent            - classify the RM's ask and route it
  ProductKnowledgeBot    - ground answers in real product facts
  ProductEligibilityAgent- apply hard eligibility rules before anything is pitched
  NudgeAgent             - compose the recommendation, reasoning and next action

Eligibility runs BEFORE generation, never after: an ineligible customer must not
reach the model at all.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from django.conf import settings

from api.models import Customer
from rag.llm import get_llm
from rag import retriever

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Product catalogue — the Product Knowledge Bot's grounding source.
# ---------------------------------------------------------------------------
PRODUCT_CATALOGUE: dict[str, dict[str, Any]] = {
    "Health-Insurance": {
        "name": "Health Insurance (Optima Secure)",
        "category": "Insurance",
        "summary": "Indemnity health cover with restore benefit and no room-rent cap.",
        "best_for": "Customers aged 30-55 with dependents and no existing health cover.",
        "min_age": 18, "max_age": 65,
        "ticket_size": "INR 12,000-38,000 annual premium",
        "key_features": [
            "Family floater option covering spouse and children",
            "Cashless network hospitals",
            "Tax benefit under Section 80D",
        ],
    },
    "Term-Life": {
        "name": "Term Life (Life Protect)",
        "category": "Insurance",
        "summary": "Pure protection term cover with optional critical-illness rider.",
        "best_for": "Sole earners with dependents and no life cover.",
        "min_age": 18, "max_age": 60,
        "ticket_size": "INR 9,000-30,000 annual premium",
        "key_features": [
            "High sum assured at low premium",
            "Optional critical illness and accidental death riders",
            "Tax benefit under Section 80C",
        ],
    },
    "ULIP": {
        "name": "ULIP (Wealth Builder)",
        "category": "Wealth",
        "summary": "Unit-linked plan combining market-linked returns with life cover.",
        "best_for": "Customers with a 7+ year horizon seeking tax-efficient growth.",
        "min_age": 18, "max_age": 60,
        "ticket_size": "INR 50,000+ annual premium",
        "key_features": [
            "Five-year lock-in period",
            "Fund switching between equity and debt",
            "Tax benefit under Section 80C",
        ],
    },
    "Mutual-Fund": {
        "name": "Mutual Fund (SIP Growth)",
        "category": "Wealth",
        "summary": "Equity-oriented mutual funds via lump sum or monthly SIP.",
        "best_for": "Customers with recurring surplus and moderate risk appetite.",
        "min_age": 18, "max_age": 99,
        "ticket_size": "INR 5,000+ per month SIP",
        "key_features": [
            "No lock-in for open-ended equity funds",
            "SIP averages entry cost over time",
            "Suits customers already comfortable with market exposure",
        ],
    },
    "Retirement-Pension": {
        "name": "Retirement Pension Plan",
        "category": "Wealth",
        "summary": "Deferred annuity building a guaranteed post-retirement income.",
        "best_for": "Customers aged 45+ approaching the retirement horizon.",
        "min_age": 30, "max_age": 70,
        "ticket_size": "INR 100,000+ annual contribution",
        "key_features": [
            "Guaranteed regular income after vesting",
            "Choice of annuity options including joint life",
            "Tax benefit under Section 80CCC",
        ],
    },
}


# ---------------------------------------------------------------------------
# 1. Intent Agent
# ---------------------------------------------------------------------------
INTENTS = [
    "target_list",       # who should I target
    "product_reasoning", # why this product for this customer
    "chart",             # show me a chart / distribution
    "eligibility",       # what are the rules / is X eligible
    "product_info",      # tell me about a product
    "portfolio_stats",   # how big is the base, counts
    "out_of_scope",
]

INTENT_SYSTEM = """You are the Intent Agent in a bank cross-sell assistant.
Classify the relationship manager's message into exactly one intent from this list:
target_list, product_reasoning, chart, eligibility, product_info, portfolio_stats, out_of_scope.

Also extract any entities present.

Return ONLY JSON:
{"intent": "...", "customer_id": "CUST-xxxxxx or null", "product": "one of Health-Insurance|Term-Life|ULIP|Mutual-Fund|Retirement-Pension or null", "chart_type": "bar|pie|line|null", "limit": integer or null}

Anything unrelated to banking cross-sell, customers, or products is out_of_scope."""


@dataclass
class Intent:
    intent: str = "out_of_scope"
    customer_id: str | None = None
    product: str | None = None
    chart_type: str | None = None
    limit: int | None = None
    raw: dict = field(default_factory=dict)


class IntentAgent:
    name = "Intent Agent"

    def classify(self, message: str) -> Intent:
        llm = get_llm()
        data = llm.complete_json(
            f"Relationship manager message:\n{message}",
            system=INTENT_SYSTEM,
            max_tokens=300,
            temperature=0.0,
        )
        intent = data.get("intent", "out_of_scope")
        if intent not in INTENTS:
            intent = "out_of_scope"
        return Intent(
            intent=intent,
            customer_id=data.get("customer_id") or None,
            product=data.get("product") or None,
            chart_type=data.get("chart_type") or None,
            limit=data.get("limit") or None,
            raw=data,
        )


# ---------------------------------------------------------------------------
# 2. Product Knowledge Bot
# ---------------------------------------------------------------------------
class ProductKnowledgeBot:
    name = "Product Knowledge Bot"

    def get(self, product: str) -> dict | None:
        return PRODUCT_CATALOGUE.get(product)

    def all(self) -> dict:
        return PRODUCT_CATALOGUE

    def describe(self, product: str) -> str:
        p = self.get(product)
        if not p:
            return f"No catalogue entry for {product}."
        feats = "; ".join(p["key_features"])
        return (
            f"{p['name']} ({p['category']}). {p['summary']} "
            f"Best for: {p['best_for']} Ticket size: {p['ticket_size']}. "
            f"Features: {feats}."
        )

    def catalogue_context(self) -> str:
        return "\n".join(f"- {self.describe(k)}" for k in PRODUCT_CATALOGUE)


# ---------------------------------------------------------------------------
# 3. Product Eligibility Agent
# ---------------------------------------------------------------------------
@dataclass
class EligibilityResult:
    eligible: bool
    reasons: list[str]
    blocked_by: list[str]

    def as_dict(self) -> dict:
        return {
            "eligible": self.eligible,
            "reasons": self.reasons,
            "blocked_by": self.blocked_by,
        }


class ProductEligibilityAgent:
    """Hard rules. Runs before any generation — never after."""

    name = "Product Eligibility Agent"

    def check(self, customer: Customer, product: str | None = None) -> EligibilityResult:
        passed: list[str] = []
        blocked: list[str] = []

        if customer.fd_balance > settings.FD_BASE_THRESHOLD:
            passed.append(f"FD balance INR {customer.fd_balance:,} exceeds the INR 10,00,000 base threshold")
        else:
            blocked.append(f"FD balance INR {customer.fd_balance:,} is below the INR 10,00,000 base threshold")

        if customer.delinquency_flag:
            blocked.append("Delinquency flag is set on the relationship")
        else:
            passed.append("No delinquency flag")

        if customer.complaint_count_12m > 1:
            blocked.append(f"{customer.complaint_count_12m} complaints in the last 12 months — suppressed from campaigns")
        else:
            passed.append("Complaint history within acceptable limits")

        if customer.cibil_score and customer.cibil_score < 650:
            blocked.append(f"CIBIL score {customer.cibil_score} below 650")
        elif customer.cibil_score:
            passed.append(f"CIBIL score {customer.cibil_score} is acceptable")

        if product:
            spec = PRODUCT_CATALOGUE.get(product)
            if spec:
                if not (spec["min_age"] <= customer.age <= spec["max_age"]):
                    blocked.append(
                        f"Age {customer.age} outside the {spec['min_age']}-{spec['max_age']} band for {spec['name']}"
                    )
                else:
                    passed.append(f"Age {customer.age} within the product band")

                if spec["category"] == "Insurance" and customer.holds_3p_insurance:
                    blocked.append("Customer already holds a third-party insurance product")
                if spec["category"] == "Wealth" and customer.holds_wealth_product:
                    blocked.append("Customer already holds a wealth-management product")
        else:
            if customer.holds_3p_insurance and customer.holds_wealth_product:
                blocked.append("Customer already holds both insurance and wealth products")

        return EligibilityResult(
            eligible=not blocked, reasons=passed, blocked_by=blocked
        )


# ---------------------------------------------------------------------------
# 4. Nudge Agent
# ---------------------------------------------------------------------------
NUDGE_SYSTEM = """You are the Nudge Agent inside a bank's cross-sell platform.
You write the recommendation a relationship manager reads before calling a customer.

Rules:
- Ground every claim in the supplied customer facts and retrieved context. Never invent figures.
- The cross-sell label and propensity score are supplied by the bank. Treat them as given; do not re-derive or dispute them.
- Be specific and concise. The RM has 30 seconds to read this.
- Amounts are Indian rupees; use lakh notation where natural.
- If the evidence is weak, say so rather than overclaiming.

Return ONLY JSON with these keys:
{
  "recommended_product": "one of the catalogue keys",
  "headline": "one sentence the RM sees first",
  "reasoning_bullets": ["3 to 5 short evidence-backed bullets"],
  "confidence": "HIGH|MEDIUM|LOW",
  "next_best_action": "one concrete next step",
  "talking_points": ["2 to 3 things to say on the call"],
  "objection_handling": ["1 to 2 likely objections and how to answer"]
}"""


class NudgeAgent:
    name = "Nudge Agent"

    def compose(
        self,
        customer: Customer,
        eligibility: EligibilityResult,
        context: str,
        knowledge: str,
    ) -> dict:
        feedback = list(customer.feedback.all()[:3])
        fb_lines = [
            f"- ({'synthetic' if f.is_synthetic else 'real'}/{f.channel}) "
            f"{f.text} [sentiment={f.sentiment}, signal={f.signal}]"
            for f in feedback
        ] or ["- No feedback on record."]

        prompt = f"""CUSTOMER FACTS
{customer.profile_sentence()}

Bank-supplied cross-sell label : {'CONVERTED' if customer.cross_sell_flag else 'NOT CONVERTED'}
Bank-supplied target product   : {customer.cross_sell_product or 'none recorded'}
Bank-supplied propensity score : {customer.propensity_score}
Eligible for cross-sell        : {customer.is_eligible}

FEEDBACK ON RECORD
{chr(10).join(fb_lines)}

ELIGIBILITY CHECK
passed: {'; '.join(eligibility.reasons) or 'none'}
blocked: {'; '.join(eligibility.blocked_by) or 'none'}

PRODUCT CATALOGUE
{knowledge}

RETRIEVED CONTEXT FROM SIMILAR CUSTOMERS
{context or '(no similar-customer context retrieved)'}

Write the recommendation for this customer."""

        return get_llm().complete_json(
            prompt, system=NUDGE_SYSTEM, max_tokens=1100, temperature=0.3
        )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------
class AgentOrchestrator:
    """
    Thin LangGraph-style sequencer.

    Edges only fire when the preceding policy node passes, mirroring the RBAC
    policy-node pattern from the architecture.
    """

    def __init__(self):
        self.intent = IntentAgent()
        self.knowledge = ProductKnowledgeBot()
        self.eligibility = ProductEligibilityAgent()
        self.nudge = NudgeAgent()

    def recommend(self, customer: Customer) -> dict:
        agents_used = [self.eligibility.name]

        product = customer.cross_sell_product or None
        elig = self.eligibility.check(customer, product)

        if not elig.eligible:
            return {
                "customer_id": customer.customer_id,
                "eligible": False,
                "eligibility": elig.as_dict(),
                "agents_used": agents_used,
                "recommendation": None,
                "message": "Customer is blocked by the Eligibility Agent; no pitch generated.",
            }

        query = (
            f"{customer.life_stage} {customer.occupation} age {customer.age} "
            f"FD {customer.fd_balance} "
            f"{'no insurance' if not customer.holds_3p_insurance else ''} "
            f"{'no wealth product' if not customer.holds_wealth_product else ''}"
        )
        hits = retriever.retrieve(query, k=settings.RAG_TOP_K)
        context = retriever.build_context(hits)
        agents_used.append(self.knowledge.name)
        agents_used.append(self.nudge.name)

        rec = self.nudge.compose(
            customer, elig, context, self.knowledge.catalogue_context()
        )

        return {
            "customer_id": customer.customer_id,
            "eligible": True,
            "eligibility": elig.as_dict(),
            "agents_used": agents_used,
            "recommendation": rec,
            "evidence": [h.as_dict() for h in hits[:5]],
            "bank_label": {
                "cross_sell_flag": customer.cross_sell_flag,
                "cross_sell_product": customer.cross_sell_product,
                "propensity_score": customer.propensity_score,
                "note": "Supplied by the bank; not modelled by this application.",
            },
        }
