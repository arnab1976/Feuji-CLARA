"""
Iterative growing-seed feedback synthesis.

Approach (10% SRS batches, one click at a time)
-----------------------------------------------
Start with ~10% real seed (structured + unstructured feedback).

Round 1 : SRS-sample ~10% of the target base that still lacks feedback.
          Pair each sampled customer to the nearest seed by cosine similarity
          of structured variables. Call the LLM to write feedback for the
          target, grounded on the matched seed's unstructured text. Clean &
          dedupe, then MERGE into the seed corpus.

Round 2 : Seed is now ~20%. SRS-sample another non-overlapping 10%, match by
          structured cosine to the merged seed, synthesize via LLM, clean,
          merge → ~30%.

…continue until coverage reaches 100%.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass

import numpy as np
from django.conf import settings
from django.db import transaction

from api.models import Customer, FeedbackRecord, SynthesisRun
from rag.llm import get_llm

log = logging.getLogger(__name__)

BATCH = 1000

SYNTH_SYSTEM = """You generate realistic bank customer feedback text for a data-synthesis pipeline.

You are given: (a) a TARGET customer with structured banking variables only, and
(b) the nearest SEED customer(s) whose structured variables are closest by
cosine similarity AND who already have unstructured feedback text.

Assumption: if two customers' structured variable values are close (high cosine
similarity), their feedback should be similar. Write feedback for the TARGET
that is consistent with the TARGET's own numbers and stylistically grounded in
the matched seed's feedback — do not copy verbatim.

Rules:
- Never contradict the target's structured facts.
- Vary the phrasing; do not copy a seed verbatim.
- One or two sentences, as a bank agent would log it.
- Choose signal from: protection_intent, yield_fatigue, wealth_intent,
  retirement_intent, service_issue, neutral.
- Choose sentiment from: positive, neutral, negative.

Return ONLY a JSON array, one object per target customer, in the same order:
[{"customer_id": "...", "text": "...", "signal": "...", "sentiment": "..."}]"""


@dataclass
class RoundResult:
    round_number: int
    batch_size: int
    seed_corpus_size: int
    coverage_after: int
    duration_ms: int
    drift_score: float


def _structured_vector(c: Customer) -> np.ndarray:
    """Normalised numeric profile used for cosine nearest-neighbour matching."""
    return np.array([
        c.age / 80.0,
        min(c.fd_balance, 15_000_000) / 15_000_000,
        min(c.aqb, 3_000_000) / 3_000_000,
        min(c.nrv_12m, 8_000_000) / 8_000_000,
        c.num_products / 12.0,
        min(c.debit_txn_count_12m, 600) / 600.0,
        min(c.credit_txn_count_12m, 400) / 400.0,
        c.digital_txn_ratio,
        c.cibil_score / 900.0,
        1.0 if c.has_demat else 0.0,
        1.0 if c.has_loan else 0.0,
        min(c.relationship_tenure_months, 240) / 240.0,
        min(c.annual_income, 20_000_000) / 20_000_000,
        1.0 if c.cross_sell_flag else 0.0,
        min(c.complaint_count_12m, 10) / 10.0,
    ], dtype=np.float32)


def _l2_normalize(vec: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(vec))
    if n < 1e-12:
        return vec
    return vec / n


def _nearest_seeds(target: Customer, seed_pool: list[tuple[Customer, np.ndarray, str]], k: int = 3):
    """Return top-k seeds by structured cosine similarity (highest → lowest)."""
    tv = _l2_normalize(_structured_vector(target))
    scored = [
        (float(np.dot(tv, vec)), cust, text)
        for cust, vec, text in seed_pool
    ]
    scored.sort(key=lambda t: -t[0])
    return scored[:k]


def _load_seed_pool() -> list[tuple[Customer, np.ndarray, str]]:
    """Growing seed: every FD-base customer that currently HAS feedback (real or synth)."""
    pool = []
    qs = (
        Customer.objects.filter(is_fd_base=True, feedback__isnull=False)
        .prefetch_related("feedback")
        .distinct()
    )
    for c in qs:
        fb = c.feedback.first()
        if fb and fb.text:
            pool.append((c, _l2_normalize(_structured_vector(c)), fb.text))
    return pool


def drift_score(seed_pool: list[tuple[Customer, np.ndarray, str]]) -> float:
    """Lexical-diversity proxy for synthetic drift (1.0 = diverse)."""
    texts = [t for _, _, t in seed_pool][-2000:]
    if len(texts) < 20:
        return 1.0
    vocab, total = set(), 0
    for t in texts:
        words = t.lower().split()
        vocab.update(words)
        total += len(words)
    return round(len(vocab) / max(total, 1) * 10, 3)


def clean_and_deduplicate(raw_items: list[dict], existing_seed_texts: set[str]) -> tuple[list[dict], dict]:
    """Clean text, remove exact/near duplicates. Returns (cleaned, stats)."""
    cleaned = []
    seen = set(existing_seed_texts)
    dropped_empty = 0
    dropped_dup = 0
    for item in raw_items:
        txt = str(item.get("text", "")).strip()
        if not txt or len(txt) < 8:
            dropped_empty += 1
            continue
        key = txt.lower().translate(str.maketrans("", "", ".,!?-'\":;"))
        if key in seen:
            dropped_dup += 1
            continue
        seen.add(key)
        item["text"] = txt
        item["sentiment"] = item.get("sentiment", "neutral").lower()
        if item["sentiment"] not in {"positive", "neutral", "negative"}:
            item["sentiment"] = "neutral"
        item["signal"] = item.get("signal", "neutral").lower()
        cleaned.append(item)
        existing_seed_texts.add(key)
    stats = {
        "input": len(raw_items),
        "kept": len(cleaned),
        "dropped_empty": dropped_empty,
        "dropped_duplicate": dropped_dup,
    }
    return cleaned, stats


def _fallback_synth(cust: Customer, nearest: list[tuple[float, Customer, str]], round_number: int) -> dict:
    """Grounded fallback when LLM is unavailable — paraphrase nearest seed by cosine pair."""
    product = cust.cross_sell_product or "wealth"
    if nearest:
        cos, seed_cust, seed_txt = nearest[0]
        text = (
            f"Profile closely matches {seed_cust.customer_id} "
            f"(structured cosine {cos:.3f}). "
            f"Adapted note for FD INR {cust.fd_balance:,} / AQB INR {cust.aqb:,}: "
            f"{seed_txt[:160].rstrip('.')}."
        )
        low = seed_txt.lower()
        if any(w in low for w in ("complaint", "reluctant", "issue", "charge")):
            sentiment, signal = "negative", "service_issue"
        elif any(w in low for w in ("interest", "diversif", "yield", "invest")):
            sentiment, signal = "positive", "yield_fatigue"
        elif cust.age > 50:
            sentiment, signal = "neutral", "retirement_intent"
        else:
            sentiment, signal = "neutral", "wealth_intent"
    elif cust.cross_sell_flag:
        text = (
            f"Inquired during branch visit regarding {product} options. "
            f"Interested in high-yielding returns for FD INR {cust.fd_balance:,}."
        )
        sentiment, signal = "positive", "wealth_intent"
    else:
        text = (
            f"Discussed portfolio review for AQB INR {cust.aqb:,}. "
            f"Customer open to reviewing {product} documentation."
        )
        sentiment, signal = "neutral", "retirement_intent" if cust.age > 50 else "neutral"

    return {
        "customer_id": cust.customer_id,
        "text": text,
        "sentiment": sentiment,
        "signal": signal,
    }


def _pair_meta(cust: Customer, nearest: list[tuple[float, Customer, str]]) -> dict:
    if not nearest:
        return {
            "matched_seed_customer_id": "",
            "structured_cosine_similarity": None,
            "matched_seed_feedback": "",
        }
    cos, seed_cust, seed_txt = nearest[0]
    return {
        "matched_seed_customer_id": seed_cust.customer_id,
        "structured_cosine_similarity": round(float(cos), 6),
        "matched_seed_feedback": seed_txt[:220],
    }


def _target_progress_snapshot() -> dict:
    """Live coverage counters for the FD > ₹10L target base."""
    target_qs = Customer.objects.filter(is_fd_base=True)
    total_target = target_qs.count()
    target_covered = target_qs.filter(feedback__isnull=False).distinct().count()
    target_real = FeedbackRecord.objects.filter(
        customer__is_fd_base=True, is_synthetic=False
    ).values("customer_id").distinct().count()
    target_synthetic = FeedbackRecord.objects.filter(
        customer__is_fd_base=True, is_synthetic=True
    ).count()
    remaining_uncovered = max(0, total_target - target_real)
    next_round = SynthesisRun.objects.count() + 1
    return {
        "coverage": target_covered,
        "total": total_target,
        "target_total": total_target,
        "target_coverage_pct": round((target_covered / total_target) * 100, 2) if total_target else 0,
        "remaining": max(0, total_target - target_covered),
        "real": target_real,
        "synthetic": target_synthetic,
        "synth_progress_pct": round((target_synthetic / remaining_uncovered) * 100, 2) if remaining_uncovered else 0.0,
        "growing_seed_size": target_covered,
        "next_round": next_round,
        "max_rounds": 9,
    }


def synthesize_round_iter(
    round_number: int,
    batch: int | None = None,
    batch_pct: float = 10.0,
    dry_run: bool = False,
    use_llm: bool = True,
    chunk_size: int = 5,
):
    """
    Growing-seed synthesis as a generator.

    Yields progress events (started / chunk / cleaning / done) so the UI can
    stream simulated unstructured feedback upfront after each SRS batch click.
    """
    started = time.time()

    seed_pool = _load_seed_pool()
    seed_size = len(seed_pool)
    if not seed_pool:
        raise RuntimeError("Seed corpus is empty — load real feedback first.")

    existing_seed_texts = {
        t.lower().translate(str.maketrans("", "", ".,!?-'\":;")) for _, _, t in seed_pool
    }

    # SRS without replacement: only customers still missing feedback
    target_qs = Customer.objects.filter(is_fd_base=True, feedback__isnull=True)
    total_target = Customer.objects.filter(is_fd_base=True).count()
    remaining_count = target_qs.count()

    if remaining_count == 0:
        log.info("No unsynthesized target customers remaining.")
        snap = _target_progress_snapshot()
        yield {
            "event": "done",
            "round_number": round_number,
            "batch_size": 0,
            "seed_corpus_size": seed_size,
            "created_so_far": 0,
            "batch_total": 0,
            "items": [],
            "duration_ms": 0,
            "drift_score": drift_score(seed_pool),
            "cleaning_stats": {"input": 0, "kept": 0, "dropped_empty": 0, "dropped_duplicate": 0},
            **snap,
        }
        return

    if batch is None:
        # Exactly ~10% of the full target base (capped by remaining)
        batch = min(remaining_count, max(1, int(round(total_target * (batch_pct / 100.0)))))

    targets = list(target_qs.order_by("?")[:batch])
    llm = get_llm() if use_llm else None
    created = 0
    created_items: list[dict] = []
    total_cleaning = {"input": 0, "kept": 0, "dropped_empty": 0, "dropped_duplicate": 0}
    CHUNK = max(1, int(chunk_size))
    batch_total = len(targets)

    yield {
        "event": "started",
        "round_number": round_number,
        "batch_total": batch_total,
        "seed_corpus_size": seed_size,
        "use_llm": bool(llm and llm.configured and use_llm),
        "matching": "structured_cosine_similarity",
        "sampling": "SRS_without_replacement",
        **_target_progress_snapshot(),
    }

    for i in range(0, batch_total, CHUNK):
        group = targets[i : i + CHUNK]
        raw_items: list[dict] = []
        chunk_items: list[dict] = []
        pair_by_id: dict[str, dict] = {}

        for t in group:
            neigh = _nearest_seeds(t, seed_pool, k=3)
            pair_by_id[t.customer_id] = {"nearest": neigh, **_pair_meta(t, neigh)}

        if llm and llm.configured and use_llm:
            blocks = []
            for t in group:
                neigh = pair_by_id[t.customer_id]["nearest"]
                seed_txt = "\n".join(
                    f'    seed {n+1} ({c.customer_id}, structured_cosine={cos:.4f}, '
                    f'FD INR {c.fd_balance:,}, age {c.age}): "{txt}"'
                    for n, (cos, c, txt) in enumerate(neigh)
                )
                blocks.append(
                    f"TARGET {t.customer_id}\n"
                    f"  profile: {t.profile_sentence()}\n"
                    f"  nearest seed customers by structured cosine similarity:\n{seed_txt}"
                )

            prompt = (
                "Generate feedback for each target customer below. "
                "Ground each target on its highest-cosine seed pair.\n\n"
                + "\n\n".join(blocks)
            )

            try:
                raw = llm.complete(prompt, system=SYNTH_SYSTEM, max_tokens=2000, temperature=0.8).text
                cleaned = raw.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("```")[1]
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:]
                parsed = json.loads(cleaned.strip())
                if isinstance(parsed, list):
                    raw_items = parsed
                else:
                    raise ValueError("LLM did not return a JSON array")
            except Exception as exc:
                log.error("LLM batch failed, using structured cosine fallback: %s", exc)
                for t in group:
                    neigh = pair_by_id[t.customer_id]["nearest"]
                    raw_items.append(_fallback_synth(t, neigh, round_number))
        else:
            for t in group:
                neigh = pair_by_id[t.customer_id]["nearest"]
                raw_items.append(_fallback_synth(t, neigh, round_number))

        # Data cleaning & duplicate removal between generations
        valid_items, cstats = clean_and_deduplicate(raw_items, existing_seed_texts)
        for k in total_cleaning:
            total_cleaning[k] += cstats.get(k, 0)
        valid_by_id = {item["customer_id"]: item for item in valid_items if "customer_id" in item}

        yield {
            "event": "cleaning",
            "round_number": round_number,
            "chunk_index": i // CHUNK + 1,
            "cleaning_stats": cstats,
            "seed_corpus_size": seed_size,
            **_target_progress_snapshot(),
        }

        with transaction.atomic():
            for cust in group:
                item = valid_by_id.get(cust.customer_id)
                neigh = pair_by_id[cust.customer_id]["nearest"]
                if not item:
                    item = _fallback_synth(cust, neigh, round_number)

                txt = item.get("text", "").strip()
                if not txt:
                    txt = (
                        f"Discussed account position and FD balance INR {cust.fd_balance:,}. "
                        "Customer open to reviewing options."
                    )

                fb_obj = FeedbackRecord.objects.create(
                    customer=cust,
                    channel="Synthetic",
                    text=txt,
                    sentiment=item.get("sentiment", "neutral"),
                    signal=item.get("signal", "neutral"),
                    is_synthetic=True,
                    synthesis_round=round_number,
                    seed_corpus_size=seed_size,
                )
                created += 1
                meta = pair_by_id[cust.customer_id]
                row = {
                    "customer_id": cust.customer_id,
                    "age": cust.age,
                    "segment": cust.segment,
                    "fd_balance": cust.fd_balance,
                    "cross_sell_product": cust.cross_sell_product or "General",
                    "text": fb_obj.text,
                    "sentiment": fb_obj.sentiment,
                    "signal": fb_obj.signal,
                    "channel": fb_obj.channel,
                    "synthesis_round": round_number,
                    "matched_seed_customer_id": meta.get("matched_seed_customer_id", ""),
                    "structured_cosine_similarity": meta.get("structured_cosine_similarity"),
                    "matched_seed_feedback": meta.get("matched_seed_feedback", ""),
                }
                created_items.append(row)
                chunk_items.append(row)

        snap = _target_progress_snapshot()
        yield {
            "event": "chunk",
            "round_number": round_number,
            "batch_total": batch_total,
            "created_so_far": created,
            "chunk_index": i // CHUNK + 1,
            "chunk_count": (batch_total + CHUNK - 1) // CHUNK,
            "items": chunk_items,
            "seed_corpus_size": seed_size,
            "cleaning_stats": cstats,
            **snap,
        }

    coverage = Customer.objects.filter(is_fd_base=True, feedback__isnull=False).distinct().count()
    duration = int((time.time() - started) * 1000)
    drift = drift_score(_load_seed_pool())

    if not dry_run and created > 0:
        SynthesisRun.objects.create(
            round_number=round_number,
            batch_size=created,
            seed_corpus_size=seed_size,
            coverage_after=coverage,
            llm_model=settings.LLM_MODEL if (llm and llm.configured and use_llm) else "structured-cosine-fallback",
            duration_ms=duration,
        )

    log.info(
        "round %s: seed=%s created=%s coverage=%s drift=%s (%sms)",
        round_number, seed_size, created, coverage, drift, duration,
    )
    snap = _target_progress_snapshot()
    yield {
        "event": "done",
        "round_number": round_number,
        "batch_size": created,
        "seed_corpus_size": seed_size,
        "created_so_far": created,
        "batch_total": batch_total,
        "items": created_items,
        "duration_ms": duration,
        "drift_score": drift,
        "cleaning_stats": total_cleaning,
        "merged_seed_size": coverage,
        **snap,
    }


def synthesize_round(
    round_number: int,
    batch: int | None = None,
    batch_pct: float = 10.0,
    dry_run: bool = False,
    use_llm: bool = True,
    chunk_size: int = 5,
) -> tuple[RoundResult, list[dict]]:
    """Run one 10% SRS growing-seed round on the FD > ₹10L target base."""
    final = None
    for evt in synthesize_round_iter(
        round_number,
        batch=batch,
        batch_pct=batch_pct,
        dry_run=dry_run,
        use_llm=use_llm,
        chunk_size=chunk_size,
    ):
        if evt.get("event") == "done":
            final = evt
    if final is None:
        raise RuntimeError("Synthesis produced no result")
    result = RoundResult(
        final["round_number"],
        final["batch_size"],
        final["seed_corpus_size"],
        final["coverage"],
        final["duration_ms"],
        final["drift_score"],
    )
    return result, final.get("items") or []


def run_all(max_rounds: int = 9, dry_run: bool = False) -> list[RoundResult]:
    results = []
    for r in range(1, max_rounds + 1):
        remaining = Customer.objects.filter(is_fd_base=True, feedback__isnull=True).count()
        if remaining == 0:
            break
        res, _ = synthesize_round(r, dry_run=dry_run)
        results.append(res)
    return results
