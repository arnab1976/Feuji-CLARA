"""Run the growing-seed feedback synthesis loop."""

from django.core.management.base import BaseCommand

from ingest.synthesize import run_all, synthesize_round
from api.models import SynthesisRun


class Command(BaseCommand):
    help = "Synthesize unstructured feedback for customers that have none"

    def add_arguments(self, parser):
        parser.add_argument("--rounds", type=int, default=9)
        parser.add_argument("--one", action="store_true", help="run a single round")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **opts):
        if opts["one"]:
            n = SynthesisRun.objects.count() + 1
            results = [synthesize_round(n, dry_run=opts["dry_run"])]
        else:
            results = run_all(max_rounds=opts["rounds"], dry_run=opts["dry_run"])

        for r in results:
            self.stdout.write(
                f"round {r.round_number}: seed={r.seed_corpus_size:,} "
                f"created={r.batch_size:,} coverage={r.coverage_after:,} "
                f"drift={r.drift_score} ({r.duration_ms}ms)"
            )
        self.stdout.write(self.style.SUCCESS("synthesis complete"))
