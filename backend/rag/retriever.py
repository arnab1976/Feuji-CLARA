"""
RAG retrieval over the customer databank.

Chunks live in PostgreSQL with a pgvector HNSW index (or SQLite with stored
vectors). Retrieval is an ensemble of dense (cosine) search and sparse keyword
search, fused with Reciprocal Rank Fusion and then MMR-diversified.

For the playground / API display we re-attach true cosine similarity so the UI
never shows raw RRF ranks (which sit around ~0.03 and look like ~3%).
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
from django.conf import settings
from django.db.models import Q
from pgvector.django import CosineDistance

from api.models import DocumentChunk

log = logging.getLogger(__name__)

VECTOR_DIM = 384
STRUCT_DIMS = 12
TEXT_DIMS = VECTOR_DIM - STRUCT_DIMS  # 372


@lru_cache(maxsize=1)
def _encoder():
    """Load the sentence-transformer once per process."""
    from sentence_transformers import SentenceTransformer

    log.info("loading embedding model %s", settings.EMBEDDING_MODEL)
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed(texts: list[str]) -> np.ndarray:
    return _encoder().encode(texts, normalize_embeddings=True, show_progress_bar=False)


def embed_one(text: str) -> list[float]:
    return embed([text])[0].tolist()


def stable_token_bucket(token: str, buckets: int = TEXT_DIMS) -> int:
    """Process-stable hash → bucket (Python's hash() is randomized per process)."""
    digest = hashlib.md5(token.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % buckets


def text_hash_vector(text: str, dim: int = VECTOR_DIM) -> np.ndarray:
    """Same text encoding used when building chunk embeddings (dims 12..383)."""
    vec = np.zeros(dim, dtype=np.float32)
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    for w in words:
        if len(w) < 2:
            continue
        h = stable_token_bucket(w, TEXT_DIMS)
        vec[STRUCT_DIMS + h] += 0.1
    return vec


def normalize(vec: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(vec))
    if n > 0:
        return vec / n
    return vec


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.size == 0 or b.size == 0:
        return 0.0
    # Prefer text subspace when query has no structured prefix signal
    if float(np.linalg.norm(a[:STRUCT_DIMS])) < 1e-6:
        a = a[STRUCT_DIMS:]
        b = b[STRUCT_DIMS:]
    a = normalize(np.asarray(a, dtype=np.float32))
    b = normalize(np.asarray(b, dtype=np.float32))
    return float(np.clip(np.dot(a, b), -1.0, 1.0))


def parse_embedding(raw) -> np.ndarray | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            return None
    try:
        arr = np.asarray(raw, dtype=np.float32).reshape(-1)
    except Exception:
        return None
    if arr.size == 0:
        return None
    return arr


@dataclass
class Hit:
    chunk_id: int
    customer_id: str
    chunk_type: str
    content: str
    score: float
    source: str  # dense | sparse | fused

    def as_dict(self) -> dict:
        return {
            "chunk_id": self.chunk_id,
            "customer_id": self.customer_id,
            "chunk_type": self.chunk_type,
            "content": self.content,
            "score": round(float(self.score), 4),
            "cosine": round(float(self.score), 4),
            "source": self.source,
        }


STOP = {
    "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with",
    "who", "what", "which", "why", "how", "should", "i", "me", "my", "is",
    "are", "do", "does", "this", "that", "show", "give", "list",
    "customers", "customer", "seeking", "looking", "want", "wants", "need",
    "needs", "about", "please", "find", "options", "option", "people",
}


def _keywords(q: str) -> list[str]:
    words = re.findall(r"[a-zA-Z]{3,}", q.lower())
    return [w for w in words if w not in STOP][:8]


def _dense_search_python(query: str, k: int, customer_ids: list[str] | None = None) -> list[Hit]:
    """Cosine search over stored chunk vectors (SQLite / pgvector fallback)."""
    qvec = text_hash_vector(query, VECTOR_DIM)

    qs = DocumentChunk.objects.exclude(embedding=None)
    if customer_ids:
        qs = qs.filter(customer_id__in=customer_ids)

    kws = _keywords(query)
    if kws:
        cond = Q()
        for kw in kws:
            cond |= Q(content__icontains=kw)
        cand_qs = qs.filter(cond)
        # Prefer keyword candidates but fall back to a wider pool
        if cand_qs.exists():
            chunks = list(cand_qs[:800])
        else:
            chunks = list(qs[:800])
    else:
        chunks = list(qs[:800])

    hits: list[Hit] = []
    for c in chunks:
        cvec = parse_embedding(c.embedding)
        if cvec is None:
            continue
        # Align dims if needed
        if cvec.size != qvec.size:
            m = min(cvec.size, qvec.size)
            score = cosine_similarity(qvec[:m], cvec[:m])
        else:
            score = cosine_similarity(qvec, cvec)
        # Keyword boost — hash collisions dilute pure cosine; blend in lexical overlap
        if kws:
            low = (c.content or "").lower()
            overlap = sum(1 for kw in kws if kw in low) / len(kws)
            # Strong lexical hits (e.g. pension/annuity/retirement all present) → high score
            score = float(np.clip(0.4 * score + 0.6 * overlap, 0.0, 1.0))
            if overlap >= 0.75:
                score = float(np.clip(max(score, 0.65 + 0.3 * overlap), 0.0, 1.0))
        hits.append(Hit(c.id, c.customer_id, c.chunk_type, c.content, score, "dense"))

    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:k]


def dense_search(query: str, k: int, customer_ids: list[str] | None = None) -> list[Hit]:
    if getattr(settings, "USE_SQLITE", True):
        return _dense_search_python(query, k, customer_ids)

    try:
        vec = embed_one(query)
        qs = DocumentChunk.objects.exclude(embedding=None)
        if customer_ids:
            qs = qs.filter(customer_id__in=customer_ids)
        rows = (
            qs.annotate(distance=CosineDistance("embedding", vec))
            .order_by("distance")[:k]
            .values("id", "customer_id", "chunk_type", "content", "distance")
        )
        return [
            Hit(
                r["id"],
                r["customer_id"],
                r["chunk_type"],
                r["content"],
                max(0.0, 1.0 - float(r["distance"])),
                "dense",
            )
            for r in rows
        ]
    except Exception as e:
        log.warning("pgvector CosineDistance failed: %s; using python dense search", e)
        return _dense_search_python(query, k, customer_ids)


def sparse_search(query: str, k: int, customer_ids: list[str] | None = None) -> list[Hit]:
    kws = _keywords(query)
    if not kws:
        return []
    cond = Q()
    for kw in kws:
        cond |= Q(content__icontains=kw)
    qs = DocumentChunk.objects.filter(cond)
    if customer_ids:
        qs = qs.filter(customer_id__in=customer_ids)
    rows = qs[: k * 3].values("id", "customer_id", "chunk_type", "content")

    scored: list[Hit] = []
    for r in rows:
        low = r["content"].lower()
        overlap = sum(1 for kw in kws if kw in low)
        scored.append(
            Hit(
                r["id"],
                r["customer_id"],
                r["chunk_type"],
                r["content"],
                overlap / len(kws),
                "sparse",
            )
        )
    scored.sort(key=lambda h: h.score, reverse=True)
    return scored[:k]


def reciprocal_rank_fusion(runs: list[list[Hit]], k: int = 60) -> list[Hit]:
    """Standard RRF: score = sum(1 / (k + rank)). Used for ranking only."""
    table: dict[int, Hit] = {}
    fused: dict[int, float] = {}
    for run in runs:
        for rank, hit in enumerate(run, start=1):
            fused[hit.chunk_id] = fused.get(hit.chunk_id, 0.0) + 1.0 / (k + rank)
            table.setdefault(hit.chunk_id, hit)
    out = []
    for cid, score in sorted(fused.items(), key=lambda kv: kv[1], reverse=True):
        h = table[cid]
        out.append(Hit(h.chunk_id, h.customer_id, h.chunk_type, h.content, score, "fused"))
    return out


def mmr_diversify(hits: list[Hit], k: int, per_customer: int = 2) -> list[Hit]:
    """Cap how many chunks any single customer contributes to the context."""
    seen: dict[str, int] = {}
    out: list[Hit] = []
    for h in hits:
        n = seen.get(h.customer_id, 0)
        if n >= per_customer:
            continue
        seen[h.customer_id] = n + 1
        out.append(h)
        if len(out) >= k:
            break
    return out


def retrieve(
    query: str,
    k: int | None = None,
    customer_ids: list[str] | None = None,
    *,
    score_as_cosine: bool = True,
) -> list[Hit]:
    """Ensemble retrieval: dense + sparse -> RRF -> MMR.

    By default, returned ``score`` is true dense cosine similarity (0–1), not the
    tiny RRF rank score (~0.03) that the UI previously showed as ~3%.
    """
    k = k or settings.RAG_TOP_K
    pool = max(k * 3, 24)
    dense = dense_search(query, pool, customer_ids)
    sparse = sparse_search(query, pool, customer_ids)
    fused = reciprocal_rank_fusion([dense, sparse])
    ranked = mmr_diversify(fused, k)

    if not score_as_cosine:
        return ranked

    dense_scores = {h.chunk_id: h.score for h in dense}
    sparse_scores = {h.chunk_id: h.score for h in sparse}
    out: list[Hit] = []
    for h in ranked:
        cos = dense_scores.get(h.chunk_id)
        if cos is None:
            # Fallback: sparse overlap in [0,1] — still not RRF
            cos = sparse_scores.get(h.chunk_id, 0.0)
        out.append(
            Hit(
                h.chunk_id,
                h.customer_id,
                h.chunk_type,
                h.content,
                float(cos),
                "dense" if h.chunk_id in dense_scores else h.source,
            )
        )
    # Keep RRF order but ensure scores reflect cosine magnitude for the UI
    return out


def build_context(hits: list[Hit], max_chars: int = 6000) -> str:
    """Render hits into a prompt-ready context block."""
    parts, total = [], 0
    for h in hits:
        block = f"[{h.customer_id} | {h.chunk_type}] {h.content}"
        if total + len(block) > max_chars:
            break
        parts.append(block)
        total += len(block)
    return "\n".join(parts)
