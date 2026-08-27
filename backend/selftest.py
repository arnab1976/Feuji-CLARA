"""
Offline self-test.

Runs the Django stack against in-memory SQLite so the models, serializers,
URL routing, eligibility rules and chat routing can be validated without a live
PostgreSQL/pgvector instance or an API key.

    python selftest.py
"""

import os
import sys
from unittest import mock

import django
from django.conf import settings

# --- stub pgvector.django (it pulls in psycopg) so models load on SQLite -----
import types

from django.db import models as _dm


class _FakeVector(_dm.TextField):
    def __init__(self, *a, dimensions=None, **kw):
        kw.pop("dimensions", None)
        super().__init__(*a, **kw)


class _FakeIndex(_dm.Index):
    def __init__(self, *a, m=None, ef_construction=None, opclasses=None, **kw):
        kw.pop("opclasses", None)
        super().__init__(*a, **kw)


class _FakeCosine:
    def __init__(self, *a, **kw):
        pass


_stub = types.ModuleType("pgvector.django")
_stub.VectorField = _FakeVector
_stub.HnswIndex = _FakeIndex
_stub.CosineDistance = _FakeCosine
_pkg = types.ModuleType("pgvector")
_pkg.django = _stub
sys.modules["pgvector"] = _pkg
sys.modules["pgvector.django"] = _stub

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)

settings.configure(
    DEBUG=True,
    SECRET_KEY="test",
    ALLOWED_HOSTS=["*"],
    INSTALLED_APPS=[
        "django.contrib.contenttypes",
        "django.contrib.auth",
        "rest_framework",
        "api",
    ],
    DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}},
    ROOT_URLCONF="api.urls",
    REST_FRAMEWORK={"DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"]},
    USE_TZ=True,
    DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
    LLM_MODEL="claude-sonnet-4-6",
    LLM_API_KEY="",
    LLM_MAX_TOKENS=1000,
    EMBEDDING_MODEL="stub",
    EMBEDDING_DIM=768,
    RAG_TOP_K=8,
    FD_BASE_THRESHOLD=1_000_000,
    TARGET_PRODUCTS=["Health-Insurance", "Term-Life", "ULIP", "Mutual-Fund", "Retirement-Pension"],
)
django.setup()

from django.test.utils import setup_test_environment  # noqa: E402
from django.db import connection  # noqa: E402

setup_test_environment()

from api.models import Customer, FeedbackRecord, DocumentChunk, SynthesisRun, ChatMessage  # noqa: E402
from api.serializers import CustomerListSerializer, CustomerDetailSerializer  # noqa: E402
from agents.registry import ProductEligibilityAgent, ProductKnowledgeBot, PRODUCT_CATALOGUE  # noqa: E402

PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"  {extra}" if extra else ""))


print("\n=== schema ===")
with connection.schema_editor() as se:
    for m in (Customer, FeedbackRecord, DocumentChunk, SynthesisRun, ChatMessage):
        se.create_model(m)
check("all 5 models created", True)

print("\n=== load real rows from the generated CSV ===")
import csv
from pathlib import Path

csv_path = Path(BASE).parent / "data" / "customers.csv"
BOOLS = {"balance_gt_10l_flag", "has_demat", "has_loan", "delinquency_flag",
         "holds_3p_insurance", "holds_wealth_product", "is_fd_base", "is_eligible",
         "cross_sell_flag"}
INTS = {"age", "annual_income", "relationship_tenure_months", "fd_balance", "fd_count",
        "fd_avg_tenor_months", "rd_balance", "sb_balance", "aqb", "num_products",
        "num_accounts", "demat_balance", "loan_outstanding", "debit_txn_count_12m",
        "credit_txn_count_12m", "debit_txn_value_12m", "credit_txn_value_12m",
        "cibil_score", "complaint_count_12m", "nrv_12m"}
FLOATS = {"avg_monthly_txn_count", "digital_txn_ratio", "propensity_score"}
FIELDS = {f.name for f in Customer._meta.get_fields() if hasattr(f, "attname")}

objs, fbs = [], []
with csv_path.open() as fh:
    for i, row in enumerate(csv.DictReader(fh)):
        if i >= 800:
            break
        d = {}
        for k, v in row.items():
            if k not in FIELDS:
                continue
            if k in BOOLS:
                d[k] = v in ("1", "True", "true")
            elif k in INTS:
                d[k] = int(float(v or 0))
            elif k in FLOATS:
                d[k] = float(v or 0)
            else:
                d[k] = v
        objs.append(Customer(**d))
        if row.get("has_real_feedback") == "1" and row.get("feedback_text"):
            fbs.append((row["customer_id"], row))

Customer.objects.bulk_create(objs)
for cid, row in fbs:
    FeedbackRecord.objects.create(
        customer_id=cid, channel=row["feedback_channel"], text=row["feedback_text"],
        sentiment=row["feedback_sentiment"], signal=row["feedback_signal"],
        is_synthetic=False)

check("customers loaded", Customer.objects.count() == 800, f"n={Customer.objects.count()}")
check("real feedback loaded", FeedbackRecord.objects.count() == len(fbs), f"n={len(fbs)}")
check("feedback ratio ~10%", 0.06 <= len(fbs) / 800 <= 0.14, f"{len(fbs)/800:.1%}")

print("\n=== business rules ===")
base = Customer.objects.filter(is_fd_base=True).count()
elig = Customer.objects.filter(is_eligible=True).count()
conv = Customer.objects.filter(cross_sell_flag=True).count()
check("FD base flag matches >10L rule",
      base == Customer.objects.filter(fd_balance__gt=1_000_000).count(), f"base={base}")
check("every convert is eligible",
      Customer.objects.filter(cross_sell_flag=True, is_eligible=False).count() == 0)
check("every convert has a product",
      Customer.objects.filter(cross_sell_flag=True).exclude(cross_sell_product="").count() == conv)
rate = conv / elig * 100 if elig else 0
check("cross-sell rate near 5%", 3.0 <= rate <= 8.0, f"{rate:.2f}% of {elig} eligible")

print("\n=== model helpers ===")
c = Customer.objects.filter(is_eligible=True).order_by("-propensity_score").first()
check("profile_sentence non-trivial", len(c.profile_sentence()) > 120)
check("fd_lakhs computed", c.fd_lakhs > 10, f"{c.fd_lakhs}L")

print("\n=== serializers ===")
ser = CustomerListSerializer(c).data
check("list serializer has key fields",
      {"customer_id", "fd_balance", "propensity_score", "cross_sell_product"} <= set(ser))
det = CustomerDetailSerializer(c).data
check("detail serializer includes all columns", len(det) > 40, f"{len(det)} fields")

print("\n=== eligibility agent ===")
agent = ProductEligibilityAgent()
r = agent.check(c, "Health-Insurance")
check("eligible customer passes", r.eligible, f"reasons={len(r.reasons)}")

low = Customer(customer_id="X1", age=40, gender="M", marital_status="Married",
               city_tier="Tier-1", occupation="Salaried", life_stage="Peak-Earner",
               annual_income=900000, relationship_tenure_months=40, segment="Classic",
               fd_balance=250_000, cibil_score=780)
r2 = agent.check(low, "Health-Insurance")
check("sub-threshold FD is blocked", not r2.eligible and any("below" in b for b in r2.blocked_by))

delinq = Customer(customer_id="X2", age=40, gender="M", marital_status="Married",
                  city_tier="Tier-1", occupation="Salaried", life_stage="Peak-Earner",
                  annual_income=900000, relationship_tenure_months=40, segment="Classic",
                  fd_balance=2_500_000, cibil_score=780, delinquency_flag=True)
check("delinquency blocks", not agent.check(delinq, "Health-Insurance").eligible)

old = Customer(customer_id="X3", age=72, gender="M", marital_status="Married",
               city_tier="Tier-1", occupation="Retired", life_stage="Retiree",
               annual_income=900000, relationship_tenure_months=40, segment="Classic",
               fd_balance=2_500_000, cibil_score=780)
check("age band blocks Health-Insurance at 72",
      not agent.check(old, "Health-Insurance").eligible)

held = Customer(customer_id="X4", age=40, gender="M", marital_status="Married",
                city_tier="Tier-1", occupation="Salaried", life_stage="Peak-Earner",
                annual_income=900000, relationship_tenure_months=40, segment="Classic",
                fd_balance=2_500_000, cibil_score=780, holds_3p_insurance=True)
check("already-held insurance blocks",
      not agent.check(held, "Health-Insurance").eligible)

print("\n=== product knowledge bot ===")
kb = ProductKnowledgeBot()
check("catalogue has 5 products", len(PRODUCT_CATALOGUE) == 5)
check("describe returns detail", len(kb.describe("ULIP")) > 80)
check("catalogue_context covers all", kb.catalogue_context().count("\n") == 4)

print("\n=== LLM guard ===")
from rag.llm import LLMClient, LLMNotConfigured

try:
    LLMClient(api_key="").complete("hi")
    check("missing key raises", False)
except LLMNotConfigured:
    check("missing key raises LLMNotConfigured", True)

print("\n=== stats aggregation (view logic) ===")
from django.db.models import Count

by_product = list(Customer.objects.filter(cross_sell_flag=True)
                  .values("cross_sell_product").annotate(count=Count("customer_id")))
check("stats groups by product", len(by_product) >= 3, f"{len(by_product)} products")

print("\n=== URL routing ===")
from django.urls import reverse

for name, kw in [("health", {}), ("stats", {}), ("customer-list", {}),
                 ("chat", {}), ("nudge-queue", {}), ("synthesis-runs", {}),
                 ("customer-detail", {"customer_id": "CUST-100001"}),
                 ("recommend", {"customer_id": "CUST-100001"})]:
    try:
        reverse(name, kwargs=kw)
        check(f"route '{name}' resolves", True)
    except Exception as e:  # noqa: BLE001
        check(f"route '{name}' resolves", False, str(e))

print("\n=== chat intent routing (LLM mocked) ===")
with mock.patch("agents.registry.get_llm") as m1, mock.patch("agents.chat.get_llm") as m2:
    fake = mock.MagicMock()
    fake.complete_json.return_value = {"intent": "target_list", "customer_id": None,
                                       "product": "Health-Insurance", "chart_type": None,
                                       "limit": 3}
    fake.complete.return_value = mock.MagicMock(text="Three targets identified.")
    m1.return_value = fake
    m2.return_value = fake

    from agents.chat import ChatService
    svc = ChatService()
    with mock.patch("rag.retriever.retrieve", return_value=[]), \
         mock.patch("rag.retriever.build_context", return_value=""):
        out = svc.ask("who should I target for health insurance")
    check("chat returns answer", bool(out.get("answer")))
    check("chat reports agents", len(out.get("agents_used", [])) >= 2, str(out.get("agents_used")))
    check("chat returns customers", len(out.get("customers", [])) > 0,
          f"{len(out.get('customers', []))} targets")
    check("chat persists turns", ChatMessage.objects.count() >= 2)

    fake.complete_json.return_value = {"intent": "out_of_scope", "customer_id": None,
                                       "product": None, "chart_type": None, "limit": None}
    out2 = svc.ask("what is the weather in paris")
    check("out-of-scope is declined", out2.get("guardrail") == "out_of_scope_declined")

    fake.complete_json.return_value = {"intent": "chart", "customer_id": None,
                                       "product": None, "chart_type": "pie", "limit": None}
    out3 = svc.ask("show me a chart of converts by product")
    check("chart intent returns a chart spec", out3.get("chart") is not None)
    check("chart has data points", len(out3["chart"]["data"]) > 0,
          f"{len(out3['chart']['data'])} slices")

print("\n=== synthesis helpers ===")
from ingest.synthesize import _structured_vector, drift_score, _nearest_seeds
import numpy as np

v = _structured_vector(c)
check("structured vector is 12-dim", v.shape == (12,), str(v.shape))
check("vector normalised 0..1", bool(((v >= 0) & (v <= 1.001)).all()))

pool = [(x, _structured_vector(x), "sample feedback text here")
        for x in Customer.objects.all()[:60]]
near = _nearest_seeds(c, pool, k=3)
check("nearest seeds returns k=3", len(near) == 3)
check("nearest sorted ascending", near[0][0] <= near[1][0] <= near[2][0])
check("drift score in range", 0 < drift_score(pool) <= 10)

print("\n" + "=" * 58)
print(f"PASSED {len(PASS)}   FAILED {len(FAIL)}")
if FAIL:
    print("failures:")
    for f in FAIL:
        print("  -", f)
    sys.exit(1)
print("ALL BACKEND CHECKS PASSED")
