"""
Data model for the cross-sell nudge platform.

The `cross_sell_flag` / `cross_sell_product` / `propensity_score` fields are
GROUND TRUTH SUPPLIED BY THE BANK. This application does not train or fit a
cross-sell model — it reads the label and reasons over it.
"""

from django.db import models
from pgvector.django import VectorField, HnswIndex


class Customer(models.Model):
    """One row per customer_id, carrying 12 months of history."""

    customer_id = models.CharField(max_length=32, primary_key=True)

    # ---- demography ----------------------------------------------------
    age = models.IntegerField()
    gender = models.CharField(max_length=8)
    marital_status = models.CharField(max_length=16)
    city_tier = models.CharField(max_length=16)
    occupation = models.CharField(max_length=32)
    life_stage = models.CharField(max_length=32)
    annual_income = models.BigIntegerField()
    relationship_tenure_months = models.IntegerField()
    segment = models.CharField(max_length=16)

    # ---- balances ------------------------------------------------------
    fd_balance = models.BigIntegerField(db_index=True)
    fd_count = models.IntegerField(default=0)
    fd_avg_tenor_months = models.IntegerField(default=0)
    rd_balance = models.BigIntegerField(default=0)
    sb_balance = models.BigIntegerField(default=0)
    aqb = models.BigIntegerField(default=0)
    balance_gt_10l_flag = models.BooleanField(default=False)

    # ---- holdings ------------------------------------------------------
    num_products = models.IntegerField(default=0)
    num_accounts = models.IntegerField(default=0)
    has_demat = models.BooleanField(default=False)
    demat_balance = models.BigIntegerField(default=0)
    has_loan = models.BooleanField(default=False)
    loan_outstanding = models.BigIntegerField(default=0)

    # ---- transactions --------------------------------------------------
    debit_txn_count_12m = models.IntegerField(default=0)
    credit_txn_count_12m = models.IntegerField(default=0)
    debit_txn_value_12m = models.BigIntegerField(default=0)
    credit_txn_value_12m = models.BigIntegerField(default=0)
    avg_monthly_txn_count = models.FloatField(default=0)
    digital_txn_ratio = models.FloatField(default=0)

    # ---- risk / servicing ----------------------------------------------
    cibil_score = models.IntegerField(default=0)
    delinquency_flag = models.BooleanField(default=False)
    complaint_count_12m = models.IntegerField(default=0)
    nrv_12m = models.BigIntegerField(default=0)

    # ---- existing third-party holdings ---------------------------------
    holds_3p_insurance = models.BooleanField(default=False)
    holds_wealth_product = models.BooleanField(default=False)

    # ---- cohort flags ---------------------------------------------------
    is_fd_base = models.BooleanField(default=False, db_index=True)
    is_eligible = models.BooleanField(default=False, db_index=True)

    # ---- BANK-SUPPLIED TARGET (not modelled here) -----------------------
    cross_sell_flag = models.BooleanField(default=False, db_index=True)
    cross_sell_product = models.CharField(max_length=32, blank=True, default="")
    propensity_score = models.FloatField(default=0.0, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_eligible", "-propensity_score"]),
            models.Index(fields=["cross_sell_product"]),
        ]

    def __str__(self) -> str:
        return self.customer_id

    # -- convenience ------------------------------------------------------
    @property
    def fd_lakhs(self) -> float:
        return round(self.fd_balance / 100_000, 1)

    @property
    def recommended_product(self) -> str:
        """Returns the target cross-sell product if converted, or top recommended product derived from customer profile."""
        if self.cross_sell_product and self.cross_sell_product.strip():
            return self.cross_sell_product.strip()
        if self.age >= 50:
            return "Retirement-Pension"
        if self.annual_income >= 2500000 and self.cibil_score >= 750:
            return "ULIP" if self.has_demat else "Mutual-Fund"
        if self.life_stage in ["Young-Family", "Mature-Family", "Married-No-Kids"]:
            return "Health-Insurance" if self.age > 38 else "Term-Life"
        if self.aqb >= 500000 or self.fd_balance >= 2500000:
            return "Mutual-Fund"
        return "Health-Insurance"

    def profile_sentence(self) -> str:
        """Compact natural-language profile used for embedding and prompting."""
        bits = [
            f"Customer {self.customer_id}",
            f"age {self.age}",
            f"{self.occupation.lower()}",
            f"{self.life_stage.lower().replace('-', ' ')}",
            f"{self.city_tier}",
            f"FD balance INR {self.fd_balance:,}",
            f"AQB INR {self.aqb:,}",
            f"{self.num_products} products across {self.num_accounts} accounts",
            f"{self.debit_txn_count_12m} debit and {self.credit_txn_count_12m} credit transactions in 12 months",
            f"NRV INR {self.nrv_12m:,}",
            f"CIBIL {self.cibil_score}",
        ]
        if self.has_demat:
            bits.append(f"demat balance INR {self.demat_balance:,}")
        if self.has_loan:
            bits.append(f"loan outstanding INR {self.loan_outstanding:,}")
        bits.append(
            "holds third-party insurance" if self.holds_3p_insurance
            else "no third-party insurance"
        )
        bits.append(
            "holds wealth product" if self.holds_wealth_product
            else "no wealth management product"
        )
        return ", ".join(bits) + "."


class FeedbackRecord(models.Model):
    """
    Unstructured feedback for a customer.

    `is_synthetic=False` -> real VOC / call / SMS / complaint text (~10%).
    `is_synthetic=True`  -> generated by the growing-seed synthesis loop.
    """

    CHANNELS = [
        ("VOC", "Voice of Customer"),
        ("InboundCall", "Inbound Call"),
        ("SMS", "SMS"),
        ("Outbound", "Outbound"),
        ("Complaint", "Complaint"),
        ("Synthetic", "Synthetic"),
    ]

    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="feedback"
    )
    channel = models.CharField(max_length=24, choices=CHANNELS)
    text = models.TextField()
    sentiment = models.CharField(max_length=16, blank=True, default="")
    signal = models.CharField(max_length=32, blank=True, default="")
    is_synthetic = models.BooleanField(default=False, db_index=True)
    synthesis_round = models.IntegerField(null=True, blank=True)
    seed_corpus_size = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["is_synthetic", "synthesis_round"])]

    def __str__(self) -> str:
        kind = "synthetic" if self.is_synthetic else "real"
        return f"{self.customer_id} [{kind}/{self.channel}]"


class DocumentChunk(models.Model):
    """A retrievable chunk in the RAG databank, stored with its pgvector embedding."""

    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="chunks"
    )
    chunk_type = models.CharField(max_length=24)  # profile | feedback | holdings
    content = models.TextField()
    embedding = VectorField(dimensions=768, null=True)
    token_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            HnswIndex(
                name="chunk_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
            models.Index(fields=["chunk_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.customer_id}:{self.chunk_type}"


class SynthesisRun(models.Model):
    """Audit record for one round of the growing-seed synthesis loop."""

    round_number = models.IntegerField()
    batch_size = models.IntegerField()
    seed_corpus_size = models.IntegerField()
    coverage_after = models.IntegerField()
    llm_model = models.CharField(max_length=64, blank=True, default="")
    duration_ms = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["round_number"]

    def __str__(self) -> str:
        return f"round {self.round_number} -> {self.coverage_after}"


class SavedDataset(models.Model):
    """Persisted CSV upload snapshot. Last 5 are retained for re-activation."""

    name = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255, blank=True, default="")
    file = models.FileField(upload_to="saved_datasets/")
    total_customers = models.IntegerField(default=0)
    target_fd_base = models.IntegerField(default=0)
    eligible = models.IntegerField(default=0)
    high_propensity = models.IntegerField(default=0)
    schema_columns = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.total_customers})"


class ChatMessage(models.Model):
    """Persisted RM chatbot turns, for audit and follow-up context."""

    session_id = models.CharField(max_length=64, db_index=True)
    role = models.CharField(max_length=16)  # user | assistant
    content = models.TextField()
    intent = models.CharField(max_length=32, blank=True, default="")
    agents_used = models.JSONField(default=list, blank=True)
    chart_spec = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
