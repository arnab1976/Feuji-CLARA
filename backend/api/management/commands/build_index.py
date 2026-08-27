"""Chunk the corpus, embed it, and write vectors into pgvector."""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Customer, DocumentChunk
from rag.retriever import embed


class Command(BaseCommand):
    help = "Build the RAG databank (chunk + embed + index)"

    def add_arguments(self, parser):
        parser.add_argument("--rebuild", action="store_true")
        parser.add_argument("--batch", type=int, default=256)

    def handle(self, *args, **opts):
        if opts["rebuild"]:
            DocumentChunk.objects.all().delete()
            self.stdout.write("cleared existing chunks")

        pending, texts = [], []
        qs = Customer.objects.prefetch_related("feedback").iterator(chunk_size=500)

        for c in qs:
            # one chunk per customer profile (structured row == one chunk)
            pending.append(DocumentChunk(customer=c, chunk_type="profile",
                                         content=c.profile_sentence()))
            texts.append(c.profile_sentence())

            for fb in c.feedback.all():
                body = (
                    f"Customer {c.customer_id} feedback via {fb.channel} "
                    f"({'synthetic' if fb.is_synthetic else 'real'}): {fb.text} "
                    f"Sentiment {fb.sentiment}, signal {fb.signal}."
                )
                pending.append(DocumentChunk(customer=c, chunk_type="feedback", content=body))
                texts.append(body)

            holdings = (
                f"Customer {c.customer_id} holdings: {c.num_products} products, "
                f"{c.num_accounts} accounts, "
                f"{'has' if c.holds_3p_insurance else 'no'} third-party insurance, "
                f"{'has' if c.holds_wealth_product else 'no'} wealth product, "
                f"bank cross-sell label {'converted' if c.cross_sell_flag else 'not converted'}"
                + (f" on {c.cross_sell_product}" if c.cross_sell_product else "")
                + f", propensity {c.propensity_score}."
            )
            pending.append(DocumentChunk(customer=c, chunk_type="holdings", content=holdings))
            texts.append(holdings)

        self.stdout.write(f"embedding {len(texts):,} chunks…")
        B = opts["batch"]
        for i in range(0, len(texts), B):
            vecs = embed(texts[i : i + B])
            for chunk, vec in zip(pending[i : i + B], vecs):
                chunk.embedding = vec.tolist()
                chunk.token_count = len(chunk.content.split())
            if (i // B) % 10 == 0:
                self.stdout.write(f"  {min(i + B, len(texts)):,}/{len(texts):,}")

        with transaction.atomic():
            DocumentChunk.objects.bulk_create(pending, batch_size=500)

        self.stdout.write(self.style.SUCCESS(
            f"indexed {DocumentChunk.objects.count():,} chunks"
        ))
