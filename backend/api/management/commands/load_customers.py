"""Load the bank-supplied customer CSV into PostgreSQL."""

import csv
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Customer, FeedbackRecord

BOOL_FIELDS = {
    "balance_gt_10l_flag", "has_demat", "has_loan", "delinquency_flag",
    "holds_3p_insurance", "holds_wealth_product", "is_fd_base",
    "is_eligible", "cross_sell_flag",
}
INT_FIELDS = {
    "age", "annual_income", "relationship_tenure_months", "fd_balance",
    "fd_count", "fd_avg_tenor_months", "rd_balance", "sb_balance", "aqb",
    "num_products", "num_accounts", "demat_balance", "loan_outstanding",
    "debit_txn_count_12m", "credit_txn_count_12m", "debit_txn_value_12m",
    "credit_txn_value_12m", "cibil_score", "complaint_count_12m", "nrv_12m",
}
FLOAT_FIELDS = {"avg_monthly_txn_count", "digital_txn_ratio", "propensity_score"}

MODEL_FIELDS = {f.name for f in Customer._meta.get_fields() if hasattr(f, "attname")}


class Command(BaseCommand):
    help = "Load customers.csv into the database"

    def add_arguments(self, parser):
        parser.add_argument("--path", default="../data/customers.csv")
        parser.add_argument("--truncate", action="store_true")

    def handle(self, *args, **opts):
        path = Path(opts["path"])
        if not path.exists():
            self.stderr.write(f"file not found: {path}")
            return

        if opts["truncate"]:
            FeedbackRecord.objects.all().delete()
            Customer.objects.all().delete()
            self.stdout.write("truncated existing rows")

        customers, feedback = [], []
        with path.open(encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                clean = {}
                for k, v in row.items():
                    if k not in MODEL_FIELDS:
                        continue
                    if k in BOOL_FIELDS:
                        clean[k] = str(v).strip() in {"1", "True", "true"}
                    elif k in INT_FIELDS:
                        clean[k] = int(float(v or 0))
                    elif k in FLOAT_FIELDS:
                        clean[k] = float(v or 0)
                    else:
                        clean[k] = v
                customers.append(Customer(**clean))

                if str(row.get("has_real_feedback", "0")).strip() in {"1", "True", "true"} \
                        and row.get("feedback_text"):
                    feedback.append({
                        "customer_id": row["customer_id"],
                        "channel": row.get("feedback_channel") or "VOC",
                        "text": row["feedback_text"],
                        "sentiment": row.get("feedback_sentiment", ""),
                        "signal": row.get("feedback_signal", ""),
                    })

        with transaction.atomic():
            Customer.objects.bulk_create(customers, batch_size=1000, ignore_conflicts=True)
            FeedbackRecord.objects.bulk_create(
                [FeedbackRecord(is_synthetic=False, **f) for f in feedback],
                batch_size=1000,
            )

        self.stdout.write(self.style.SUCCESS(
            f"loaded {len(customers):,} customers and {len(feedback):,} real feedback records"
        ))
        self.stdout.write(
            f"  FD base    : {Customer.objects.filter(is_fd_base=True).count():,}\n"
            f"  eligible   : {Customer.objects.filter(is_eligible=True).count():,}\n"
            f"  converts   : {Customer.objects.filter(cross_sell_flag=True).count():,}"
        )
