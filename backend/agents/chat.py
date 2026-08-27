"""
RM chatbot service.

Routes a relationship manager's question through the agent mesh and returns a
grounded answer, optionally with a chart specification the frontend renders.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from django.conf import settings
from django.db.models import Avg, Count, Q, Sum

from api.models import ChatMessage, Customer, FeedbackRecord
from agents.registry import AgentOrchestrator, PRODUCT_CATALOGUE
from rag import retriever
from rag.llm import get_llm

log = logging.getLogger(__name__)

ANSWER_SYSTEM = """You are the cross-sell assistant for a bank's relationship managers.

Rules:
- Answer ONLY from the supplied data and context. Never invent customers, figures or products.
- The cross-sell label and propensity scores are supplied by the bank. Do not re-derive them.
- Amounts are Indian rupees. Use lakh/crore notation where it reads naturally.
- Be concise and practical: an RM is reading this between calls.
- When you list customers, always give the reason alongside.
- If the data does not support an answer, say so plainly."""


class ChatService:
    def __init__(self):
        self.orch = AgentOrchestrator()

    # -- helpers ---------------------------------------------------------
    @staticmethod
    def _eligible_qs():
        return Customer.objects.filter(is_eligible=True)

    def _portfolio_facts(self) -> str:
        total = Customer.objects.count()
        base = Customer.objects.filter(is_fd_base=True).count()
        elig = self._eligible_qs().count()
        conv = Customer.objects.filter(cross_sell_flag=True).count()
        rate = (conv / elig * 100) if elig else 0
        high = self._eligible_qs().filter(propensity_score__gte=0.75).count()
        return (
            f"Total customers: {total:,}. "
            f"FD base above INR 10,00,000: {base:,}. "
            f"Eligible (no third-party product, no delinquency): {elig:,}. "
            f"Bank-recorded cross-sell converts: {conv:,} ({rate:.2f}% of eligible). "
            f"Scoring above 0.75 propensity: {high:,}."
        )

    def _top_targets(self, product: str | None, limit: int = 5) -> list[dict]:
        qs = self._eligible_qs()
        if product:
            qs = qs.filter(cross_sell_product=product)
        rows = qs.order_by("-propensity_score")[:limit]
        out = []
        for c in rows:
            fb = c.feedback.first()
            out.append({
                "customer_id": c.customer_id,
                "age": c.age,
                "segment": c.segment,
                "fd_balance": c.fd_balance,
                "fd_lakhs": c.fd_lakhs,
                "nrv_12m": c.nrv_12m,
                "propensity_score": c.propensity_score,
                "product": c.cross_sell_product or "(not yet assigned)",
                "signal": fb.signal if fb else "",
                "feedback_is_synthetic": fb.is_synthetic if fb else None,
            })
        return out

    # -- trending questions generator ------------------------------------
    def get_trending_questions(self) -> list[str]:
        """Dynamically builds Top 5 semantically relevant hint questions based on active RAG database & dataset."""
        top_prods = (
            Customer.objects.filter(is_eligible=True)
            .values("cross_sell_product")
            .annotate(cnt=Count("customer_id"))
            .order_by("-cnt")
        )
        p1 = top_prods[0]["cross_sell_product"] if len(top_prods) > 0 and top_prods[0]["cross_sell_product"] else "Health-Insurance"
        p2 = top_prods[1]["cross_sell_product"] if len(top_prods) > 1 and top_prods[1]["cross_sell_product"] else "Mutual-Fund"

        top_signals = (
            FeedbackRecord.objects.values("signal")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")
        )
        sig = top_signals[0]["signal"] if len(top_signals) > 0 and top_signals[0]["signal"] else "protection_intent"

        return [
            f"Who should I target for {p1}?",
            "Show me a pie chart of converts by product",
            "Show me a bar chart of eligible base by segment",
            f"Which customers expressed {sig} and what product should I sell?",
            "What are the eligibility rules for cross-sell?",
        ]

    # -- chart builders ---------------------------------------------------
    def _chart(self, chart_type: str | None, product: str | None) -> dict | None:
        ct = (chart_type or "bar").lower()
        if "pie" in ct:
            ct = "pie"
        elif "line" in ct or "trend" in ct:
            ct = "line"
        else:
            ct = "bar"

        if product:
            qs = self._eligible_qs().filter(cross_sell_product=product)
            title = f"{product} — propensity distribution (eligible base)"
            buckets = [
                ("0.0-0.2", (0.0, 0.2)), ("0.2-0.4", (0.2, 0.4)),
                ("0.4-0.6", (0.4, 0.6)), ("0.6-0.8", (0.6, 0.8)),
                ("0.8-1.0", (0.8, 1.01)),
            ]
            data = [
                {"label": lab,
                 "value": qs.filter(propensity_score__gte=lo, propensity_score__lt=hi).count()}
                for lab, (lo, hi) in buckets
            ]
            return {"type": ct, "title": title, "x_label": "Propensity band",
                    "y_label": "Customers", "data": data}

        rows = (
            Customer.objects.filter(cross_sell_flag=True)
            .values("cross_sell_product")
            .annotate(value=Count("customer_id"))
            .order_by("-value")
        )
        data = [
            {"label": r["cross_sell_product"] or "Unassigned", "value": r["value"]}
            for r in rows if r["cross_sell_product"]
        ]
        return {
            "type": ct,
            "title": "Cross-sell converts by product (bank-supplied label)",
            "x_label": "Product", "y_label": "Customers", "data": data,
        }

    def _segment_chart(self, chart_type: str | None = None) -> dict:
        ct = (chart_type or "bar").lower()
        if "pie" in ct:
            ct = "pie"
        elif "line" in ct or "trend" in ct:
            ct = "line"
        else:
            ct = "bar"

        rows = (
            self._eligible_qs().values("segment")
            .annotate(value=Count("customer_id"), avg_fd=Avg("fd_balance"))
            .order_by("-value")
        )
        return {
            "type": ct,
            "title": "Eligible base by segment",
            "x_label": "Segment", "y_label": "Customers",
            "data": [{"label": r["segment"], "value": r["value"]} for r in rows],
        }

    # -- main entry -------------------------------------------------------
    def ask(self, message: str, session_id: str | None = None) -> dict:
        session_id = session_id or str(uuid.uuid4())
        ChatMessage.objects.create(session_id=session_id, role="user", content=message)

        intent = self.orch.intent.classify(message)
        agents = ["Intent Agent"]
        chart: dict | None = None
        payload: dict[str, Any] = {}

        # Detect chart type preference from user query if mentioned
        low_msg = message.lower()
        query_chart_type = None
        if "pie" in low_msg:
            query_chart_type = "pie"
        elif "trend" in low_msg or "line" in low_msg:
            query_chart_type = "line"
        elif "bar" in low_msg:
            query_chart_type = "bar"

        # ---- Strict Guardrail: Numerical / Database Fact Missing Check ----
        is_numerical_query = any(kw in low_msg for kw in ["exact count", "specific customer id", "cust-", "missing metric", "numerical data"])
        if is_numerical_query:
            if intent.customer_id and not Customer.objects.filter(customer_id=intent.customer_id).exists():
                answer = (
                    "⚠️ Data for this specific numerical query or customer ID is not available in the loaded RAG databank. "
                    "LLM generation is prohibited for missing numerical database facts."
                )
                return {
                    "session_id": session_id,
                    "intent": "restricted_guardrail",
                    "agents_used": ["Intent Agent"],
                    "answer": answer,
                    "chart": None,
                    "customers": [],
                    "guardrail": "numerical_data_not_available",
                }

        # ---- route -------------------------------------------------------
        if intent.intent == "out_of_scope":
            answer = (
                "I can only help with cross-sell questions grounded in the customer RAG "
                "databank — whom to target, which product, eligibility, reasoning, "
                "and portfolio charts. That question falls outside this scope."
            )
            reply = {
                "session_id": session_id, "intent": intent.intent,
                "agents_used": agents, "answer": answer,
                "chart": None, "customers": [], "guardrail": "out_of_scope_declined",
            }
            ChatMessage.objects.create(
                session_id=session_id, role="assistant", content=answer,
                intent=intent.intent, agents_used=agents,
            )
            return reply

        if intent.intent == "product_reasoning" and intent.customer_id:
            try:
                cust = Customer.objects.get(customer_id=intent.customer_id)
            except Customer.DoesNotExist:
                answer = (
                    f"⚠️ Customer {intent.customer_id} is not found in the loaded RAG databank. "
                    "LLM generation is prohibited for unverified customer IDs."
                )
                ChatMessage.objects.create(
                    session_id=session_id, role="assistant", content=answer,
                    intent=intent.intent, agents_used=agents)
                return {"session_id": session_id, "intent": intent.intent,
                        "agents_used": agents, "answer": answer,
                        "chart": None, "customers": [], "guardrail": "customer_not_found"}
            rec = self.orch.recommend(cust)
            agents += rec["agents_used"]
            if not rec["eligible"]:
                answer = (
                    f"Customer **{cust.customer_id}** is blocked by the Eligibility Agent: "
                    + "; ".join(rec["eligibility"].get("blocked_by", [])) + "."
                )
            else:
                r = rec["recommendation"] or {}
                if isinstance(r, str):
                    try:
                        import json
                        r = json.loads(r)
                    except Exception:
                        r = {"headline": r}

                prod = r.get("recommended_product") or r.get("product_to_recommend") or cust.recommended_product or "Cross-Sell Product"
                headline = r.get("headline", f"Recommend {prod} for {cust.customer_id}")
                reasoning = r.get("reasoning_bullets") or r.get("reasoning_points") or []
                if isinstance(reasoning, list):
                    bullets = "\n".join(f"- {b}" for b in reasoning)
                else:
                    bullets = f"- {reasoning}"
                pitch = r.get("recommended_pitch", "")
                next_action = r.get("next_best_action", "Schedule follow-up call")

                answer = (
                    f"### {headline}\n\n"
                    f"**Recommended Product**: {prod}\n\n"
                    f"**Reasoning & Vector Signals**:\n{bullets}\n\n"
                    f"**Suggested RM Pitch**: *\"{pitch}\"*\n\n"
                    f"**Next Action**: {next_action}"
                )
            payload["recommendation"] = rec
            ChatMessage.objects.create(
                session_id=session_id, role="assistant", content=answer,
                intent=intent.intent, agents_used=agents)
            return {"session_id": session_id, "intent": intent.intent,
                    "agents_used": agents, "answer": answer, "chart": None,
                    "customers": [], **payload}

        if intent.intent == "chart":
            agents.append("Product Knowledge Bot")
            chart_style = query_chart_type or intent.chart_type or "bar"
            chart = self._segment_chart(chart_style) if "segment" in low_msg else self._chart(chart_style, intent.product)
            facts = self._portfolio_facts()
            ctx = f"Chart rendered: {chart['title']} with data {chart['data']}.\n{facts}"
            answer = get_llm().complete(
                f"RM asked: {message}\n\nDATA\n{ctx}\n\n"
                "Write two or three sentences interpreting this chart for the RM.",
                system=ANSWER_SYSTEM, max_tokens=400,
            ).text

        elif intent.intent == "eligibility":
            agents.append("Product Eligibility Agent")
            rules = (
                "Eligibility rules enforced before any pitch:\n"
                f"- FD balance must exceed INR {settings.FD_BASE_THRESHOLD:,}\n"
                "- No existing third-party product in the same category\n"
                "- No delinquency flag on the relationship\n"
                "- Not more than one complaint in the last 12 months\n"
                "- CIBIL score at or above 650\n"
                "- Age within the product's permitted band\n"
            )
            answer = get_llm().complete(
                f"RM asked: {message}\n\nRULES\n{rules}\n\n{self._portfolio_facts()}\n\n"
                "Answer the RM's question about eligibility.",
                system=ANSWER_SYSTEM, max_tokens=500,
            ).text

        elif intent.intent == "product_info":
            agents.append("Product Knowledge Bot")
            know = (
                self.orch.knowledge.describe(intent.product)
                if intent.product else self.orch.knowledge.catalogue_context()
            )
            answer = get_llm().complete(
                f"RM asked: {message}\n\nPRODUCT CATALOGUE\n{know}\n\nAnswer the question.",
                system=ANSWER_SYSTEM, max_tokens=600,
            ).text

        elif intent.intent == "portfolio_stats":
            answer = get_llm().complete(
                f"RM asked: {message}\n\nPORTFOLIO\n{self._portfolio_facts()}\n\nAnswer concisely.",
                system=ANSWER_SYSTEM, max_tokens=450,
            ).text

        else:  # target_list
            agents += ["Product Eligibility Agent", "Nudge Agent"]
            limit = intent.limit or 5
            targets = self._top_targets(intent.product, limit)
            payload["customers"] = targets
            hits = retriever.retrieve(message, k=settings.RAG_TOP_K)
            ctx = retriever.build_context(hits, max_chars=3500)
            tbl = "\n".join(
                f"- {t['customer_id']}: age {t['age']}, FD INR {t['fd_balance']:,}, "
                f"NRV INR {t['nrv_12m']:,}, propensity {t['propensity_score']}, "
                f"bank product {t['product']}, signal {t['signal'] or 'n/a'}"
                for t in targets
            )
            answer = get_llm().complete(
                f"RM asked: {message}\n\nTOP ELIGIBLE TARGETS (already eligibility-checked)\n{tbl}\n\n"
                f"PORTFOLIO\n{self._portfolio_facts()}\n\n"
                f"RETRIEVED CONTEXT\n{ctx}\n\n"
                "Present these targets to the RM with the reason for each.",
                system=ANSWER_SYSTEM, max_tokens=900,
            ).text

        ChatMessage.objects.create(
            session_id=session_id, role="assistant", content=answer,
            intent=intent.intent, agents_used=agents, chart_spec=chart,
        )
        return {
            "session_id": session_id,
            "intent": intent.intent,
            "agents_used": agents,
            "answer": answer,
            "chart": chart,
            "customers": payload.get("customers", []),
            **{k: v for k, v in payload.items() if k != "customers"},
        }
