from django.db import migrations, models
import django.db.models.deletion
import pgvector.django
from pgvector.django import VectorExtension


class Migration(migrations.Migration):

    initial = True
    dependencies = []

    operations = [
        # enable the pgvector extension before any VectorField is created
        VectorExtension(),

        migrations.CreateModel(
            name="Customer",
            fields=[
                ("customer_id", models.CharField(max_length=32, primary_key=True, serialize=False)),
                ("age", models.IntegerField()),
                ("gender", models.CharField(max_length=8)),
                ("marital_status", models.CharField(max_length=16)),
                ("city_tier", models.CharField(max_length=16)),
                ("occupation", models.CharField(max_length=32)),
                ("life_stage", models.CharField(max_length=32)),
                ("annual_income", models.BigIntegerField()),
                ("relationship_tenure_months", models.IntegerField()),
                ("segment", models.CharField(max_length=16)),
                ("fd_balance", models.BigIntegerField(db_index=True)),
                ("fd_count", models.IntegerField(default=0)),
                ("fd_avg_tenor_months", models.IntegerField(default=0)),
                ("rd_balance", models.BigIntegerField(default=0)),
                ("sb_balance", models.BigIntegerField(default=0)),
                ("aqb", models.BigIntegerField(default=0)),
                ("balance_gt_10l_flag", models.BooleanField(default=False)),
                ("num_products", models.IntegerField(default=0)),
                ("num_accounts", models.IntegerField(default=0)),
                ("has_demat", models.BooleanField(default=False)),
                ("demat_balance", models.BigIntegerField(default=0)),
                ("has_loan", models.BooleanField(default=False)),
                ("loan_outstanding", models.BigIntegerField(default=0)),
                ("debit_txn_count_12m", models.IntegerField(default=0)),
                ("credit_txn_count_12m", models.IntegerField(default=0)),
                ("debit_txn_value_12m", models.BigIntegerField(default=0)),
                ("credit_txn_value_12m", models.BigIntegerField(default=0)),
                ("avg_monthly_txn_count", models.FloatField(default=0)),
                ("digital_txn_ratio", models.FloatField(default=0)),
                ("cibil_score", models.IntegerField(default=0)),
                ("delinquency_flag", models.BooleanField(default=False)),
                ("complaint_count_12m", models.IntegerField(default=0)),
                ("nrv_12m", models.BigIntegerField(default=0)),
                ("holds_3p_insurance", models.BooleanField(default=False)),
                ("holds_wealth_product", models.BooleanField(default=False)),
                ("is_fd_base", models.BooleanField(db_index=True, default=False)),
                ("is_eligible", models.BooleanField(db_index=True, default=False)),
                ("cross_sell_flag", models.BooleanField(db_index=True, default=False)),
                ("cross_sell_product", models.CharField(blank=True, default="", max_length=32)),
                ("propensity_score", models.FloatField(db_index=True, default=0.0)),
            ],
        ),
        migrations.CreateModel(
            name="SynthesisRun",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("round_number", models.IntegerField()),
                ("batch_size", models.IntegerField()),
                ("seed_corpus_size", models.IntegerField()),
                ("coverage_after", models.IntegerField()),
                ("llm_model", models.CharField(blank=True, default="", max_length=64)),
                ("duration_ms", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["round_number"]},
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("session_id", models.CharField(db_index=True, max_length=64)),
                ("role", models.CharField(max_length=16)),
                ("content", models.TextField()),
                ("intent", models.CharField(blank=True, default="", max_length=32)),
                ("agents_used", models.JSONField(blank=True, default=list)),
                ("chart_spec", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="FeedbackRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("channel", models.CharField(choices=[
                    ("VOC", "Voice of Customer"), ("InboundCall", "Inbound Call"),
                    ("SMS", "SMS"), ("Outbound", "Outbound"),
                    ("Complaint", "Complaint"), ("Synthetic", "Synthetic")], max_length=24)),
                ("text", models.TextField()),
                ("sentiment", models.CharField(blank=True, default="", max_length=16)),
                ("signal", models.CharField(blank=True, default="", max_length=32)),
                ("is_synthetic", models.BooleanField(db_index=True, default=False)),
                ("synthesis_round", models.IntegerField(blank=True, null=True)),
                ("seed_corpus_size", models.IntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                               related_name="feedback", to="api.customer")),
            ],
        ),
        migrations.CreateModel(
            name="DocumentChunk",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("chunk_type", models.CharField(max_length=24)),
                ("content", models.TextField()),
                ("embedding", pgvector.django.VectorField(dimensions=768, null=True)),
                ("token_count", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                               related_name="chunks", to="api.customer")),
            ],
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["is_eligible", "-propensity_score"],
                               name="api_cust_elig_prop_idx"),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["cross_sell_product"], name="api_cust_product_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbackrecord",
            index=models.Index(fields=["is_synthetic", "synthesis_round"],
                               name="api_fb_syn_round_idx"),
        ),
        migrations.AddIndex(
            model_name="documentchunk",
            index=pgvector.django.HnswIndex(
                ef_construction=64, fields=["embedding"], m=16,
                name="chunk_embedding_hnsw", opclasses=["vector_cosine_ops"]),
        ),
        migrations.AddIndex(
            model_name="documentchunk",
            index=models.Index(fields=["chunk_type"], name="api_chunk_type_idx"),
        ),
    ]
