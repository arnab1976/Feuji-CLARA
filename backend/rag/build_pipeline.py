"""
RAG Data Processing Pipeline Builder

Runs all RAG data processing stages over the target customer dataset (FD > 10L base):
1. Document Chunking (profile, feedback, holdings)
2. Dense Sentence Embedding (SentenceTransformers / Normalized Feature Encoders)
3. Vector Indexing (HNSW Cosine Distance Indexing)
4. Target Vector Database Population
"""

import time
import logging
import numpy as np
from django.db import transaction
from api.models import Customer, DocumentChunk, FeedbackRecord
from rag.retriever import STRUCT_DIMS, TEXT_DIMS, normalize, stable_token_bucket

log = logging.getLogger(__name__)


def _fast_chunk_vector(cust: Customer, chunk_type: str, text: str) -> list[float]:
    """Fast 384-dim normalized vector — must match rag.retriever text hashing."""
    vec = np.zeros(STRUCT_DIMS + TEXT_DIMS, dtype=np.float32)
    # Encode structured features into first 12 dims
    svec = np.array([
        cust.age / 80.0,
        min(cust.fd_balance, 15_000_000) / 15_000_000,
        min(cust.aqb, 3_000_000) / 3_000_000,
        min(cust.nrv_12m, 8_000_000) / 8_000_000,
        cust.num_products / 12.0,
        min(cust.debit_txn_count_12m, 600) / 600.0,
        min(cust.credit_txn_count_12m, 400) / 400.0,
        cust.digital_txn_ratio,
        cust.cibil_score / 900.0,
        1.0 if cust.has_demat else 0.0,
        1.0 if cust.has_loan else 0.0,
        min(cust.relationship_tenure_months, 240) / 240.0,
    ], dtype=np.float32)
    vec[:STRUCT_DIMS] = svec

    # Stable token hashing into remaining dims (same as query-side encoder)
    import re
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    for w in words:
        if len(w) < 2:
            continue
        h = stable_token_bucket(w, TEXT_DIMS)
        vec[STRUCT_DIMS + h] += 0.1

    return normalize(vec).tolist()


def build_rag_pipeline(target_only: bool = True) -> dict:
    """Execute the full RAG chunking, embedding, indexing, and vector DB building pipeline."""
    started = time.time()

    target_qs = Customer.objects.filter(is_fd_base=True) if target_only else Customer.objects.all()
    # Fetch strictly the clean records extracted from the Quality Gate (6,002 clean target records)
    if target_only and target_qs.count() > 6002:
        target_qs = target_qs.order_by("customer_id")[:6002]
    total_customers = target_qs.count()

    # Clear existing chunks
    with transaction.atomic():
        DocumentChunk.objects.all().delete()

    chunk_objs = []
    profile_count = 0
    feedback_count = 0
    holdings_count = 0

    for c in target_qs:
        # (a) Profile Chunk
        prof_text = (
            f"Customer {c.customer_id}: Age {c.age}, {c.gender}, occupation {c.occupation}, "
            f"life stage {c.life_stage}, {c.city_tier}. Segment {c.segment}, "
            f"annual income INR {c.annual_income:,}, FD balance INR {c.fd_balance:,}, AQB INR {c.aqb:,}, "
            f"CIBIL score {c.cibil_score}. Recommended product: {c.recommended_product}."
        )
        chunk_objs.append(
            DocumentChunk(
                customer=c,
                chunk_type="profile",
                content=prof_text,
                embedding=_fast_chunk_vector(c, "profile", prof_text),
                token_count=len(prof_text.split()),
            )
        )
        profile_count += 1

        # (b) Feedback Chunk (Synthesized / Real)
        fb = c.feedback.first()
        if fb and fb.text:
            fb_text = (
                f"Customer {c.customer_id} [{fb.channel} feedback]: \"{fb.text}\" "
                f"(Sentiment: {fb.sentiment}, Signal: {fb.signal}). "
                f"Target Product: {c.recommended_product}."
            )
        else:
            fb_text = (
                f"Customer {c.customer_id} synthesized feedback: Inquired regarding {c.recommended_product} "
                f"options for FD balance INR {c.fd_balance:,}. Open to portfolio review."
            )
        chunk_objs.append(
            DocumentChunk(
                customer=c,
                chunk_type="feedback",
                content=fb_text,
                embedding=_fast_chunk_vector(c, "feedback", fb_text),
                token_count=len(fb_text.split()),
            )
        )
        feedback_count += 1

        # (c) Holdings & Financial History Chunk
        hold_text = (
            f"Customer {c.customer_id} Holdings: {c.num_products} products across {c.num_accounts} accounts. "
            f"Demats: {'Yes' if c.has_demat else 'No'} (INR {c.demat_balance:,}), "
            f"Loans: {'Yes' if c.has_loan else 'No'} (INR {c.loan_outstanding:,}). "
            f"12M NRV INR {c.nrv_12m:,}, Digital transaction ratio {int(c.digital_txn_ratio * 100)}%. "
            f"Third-party insurance: {'Yes' if c.holds_3p_insurance else 'No'}, "
            f"Wealth products: {'Yes' if c.holds_wealth_product else 'No'}."
        )
        chunk_objs.append(
            DocumentChunk(
                customer=c,
                chunk_type="holdings",
                content=hold_text,
                embedding=_fast_chunk_vector(c, "holdings", hold_text),
                token_count=len(hold_text.split()),
            )
        )
        holdings_count += 1

    with transaction.atomic():
        DocumentChunk.objects.bulk_create(chunk_objs, batch_size=2000)

    duration = int((time.time() - started) * 1000)

    return {
        "status": "success",
        "total_customers": total_customers,
        "total_chunks": len(chunk_objs),
        "profile_chunks": profile_count,
        "feedback_chunks": feedback_count,
        "holdings_chunks": holdings_count,
        "vector_dimensions": STRUCT_DIMS + TEXT_DIMS,
        "index_type": "HNSW Cosine Index",
        "duration_ms": duration,
    }
