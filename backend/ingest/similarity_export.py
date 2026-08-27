"""
Nearest-neighbour semantic similarity for synthesis verification exports.

For each feedback text, rank the closest real (non-synthetic) seed feedbacks by
cosine similarity over dense sentence embeddings (L2-normalized → cosine = dot).
Falls back to TF-IDF cosine space if the sentence-transformer cannot load.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Iterable

import numpy as np

log = logging.getLogger(__name__)

TOP_K = 5


@lru_cache(maxsize=1)
def _export_encoder():
    """Compact MiniLM encoder cached once per process for bulk CSV export."""
    from sentence_transformers import SentenceTransformer

    log.info("loading export embedding model all-MiniLM-L6-v2")
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def _embed_texts(texts: list[str]) -> np.ndarray:
    """Return L2-normalized embeddings shaped (N, D).

    Uses a compact MiniLM encoder for bulk CSV export throughput (true semantic
    cosine space). Falls back to the app's configured encoder, then TF-IDF.
    """
    if not texts:
        return np.zeros((0, 1), dtype=np.float32)

    try:
        vectors = _export_encoder().encode(
            texts,
            normalize_embeddings=True,
            batch_size=128,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return np.asarray(vectors, dtype=np.float32)
    except Exception as exc:  # noqa: BLE001
        log.warning("MiniLM export embed failed (%s); trying app encoder", exc)

    try:
        from rag.retriever import _encoder

        vectors = _encoder().encode(
            texts,
            normalize_embeddings=True,
            batch_size=64,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return np.asarray(vectors, dtype=np.float32)
    except Exception as exc:  # noqa: BLE001
        log.warning("sentence-transformer embed failed (%s); using TF-IDF fallback", exc)
        from sklearn.feature_extraction.text import TfidfVectorizer

        vec = TfidfVectorizer(max_features=4096, ngram_range=(1, 2), min_df=1)
        matrix = vec.fit_transform(texts).astype(np.float32).toarray()
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-12)
        return (matrix / norms).astype(np.float32)


def batch_top_k_against_seeds(
    query_rows: Iterable[tuple[str, str]],
    seed_rows: list[tuple[str, str]],
    k: int = TOP_K,
) -> list[list[tuple[str, float]]]:
    """
    For each (customer_id, feedback_text) query, return up to k
    (seed_customer_id, cosine_similarity) pairs ranked nearest → farthest.

    Seeds and queries are embedded in one joint call so both the dense and
    TF-IDF paths share a single vector space.
    """
    query_list = list(query_rows)
    if not query_list:
        return []
    if not seed_rows:
        return [[] for _ in query_list]

    seed_ids = [cid for cid, _ in seed_rows]
    seed_texts = [txt for _, txt in seed_rows]
    query_ids = [cid for cid, _ in query_list]
    query_texts = [txt or "" for _, txt in query_list]

    combined = seed_texts + query_texts
    log.info(
        "Embedding %s seed + %s query feedback texts for cosine export",
        len(seed_texts),
        len(query_texts),
    )
    matrix = _embed_texts(combined)
    n_seed = len(seed_texts)
    seed_matrix = matrix[:n_seed]
    query_matrix = matrix[n_seed:]

    sims_all = query_matrix @ seed_matrix.T
    results: list[list[tuple[str, float]]] = []
    for i, qcid in enumerate(query_ids):
        if not query_texts[i].strip():
            results.append([])
            continue
        sims = sims_all[i]
        order = np.argsort(-sims)
        out: list[tuple[str, float]] = []
        for idx in order:
            cid = seed_ids[int(idx)]
            if cid == qcid:
                continue
            out.append((cid, round(float(sims[int(idx)]), 6)))
            if len(out) >= k:
                break
        results.append(out)
    return results


def pad_neighbours(
    neighbours: list[tuple[str, float]], k: int = TOP_K
) -> tuple[list[str], list[str]]:
    """Return (sim_values, customer_ids) lists of length k, empty-string padded."""
    sims = [""] * k
    ids = [""] * k
    for i, (cid, score) in enumerate(neighbours[:k]):
        sims[i] = f"{score:.6f}"
        ids[i] = cid
    return sims, ids
