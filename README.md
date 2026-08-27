# Cross-Sell Nudge Platform

GenAI-powered hyper-personalised cross-sell for retail banking.

The base cohort is **FD holders with a running balance above ₹10,00,000**. The
cross-sell targets are third-party **Insurance** and **Wealth-Management**
products. The platform has two user-facing parts:

1. **Nudge Portal** — product recommendation with reasoning, per customer.
2. **RM Chatbot** — a relationship manager asks which product to sell, to whom,
   why, and can request charts.

> **The cross-sell model is not built here.** `cross_sell_flag`,
> `cross_sell_product` and `propensity_score` are **supplied by the bank** as
> ground truth. This application reads that label and reasons over it. Nothing
> in this repository trains, fits or evaluates a propensity model.

---

## Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Backend    | Django 5 + Django REST Framework                    |
| Database   | PostgreSQL 16 + pgvector (HNSW cosine index)        |
| RAG        | sentence-transformers embeddings, ensemble retrieval |
| LLM        | Anthropic API (real calls, key via env)             |
| Frontend   | React 18 + Vite + Recharts                          |
| Deploy     | Docker Compose                                      |

---

## Repository layout

```
.
├── backend/
│   ├── crosssell/            Django project (settings, urls, wsgi)
│   ├── api/                  models, serializers, views, urls, migrations
│   │   └── management/commands/
│   │       ├── load_customers.py    load the bank CSV
│   │       ├── build_index.py       chunk + embed + index into pgvector
│   │       └── synthesize.py        growing-seed feedback synthesis
│   ├── agents/
│   │   ├── registry.py       Intent / ProductKnowledge / Eligibility / Nudge
│   │   └── chat.py           RM chatbot service + chart builder
│   ├── rag/
│   │   ├── llm.py            Anthropic client
│   │   └── retriever.py      dense + sparse + RRF + MMR retrieval
│   ├── ingest/
│   │   └── synthesize.py     iterative growing-seed synthesis loop
│   ├── selftest.py           offline test harness (42 checks, no DB needed)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/            Dashboard, NudgeQueue, CustomerDetail, Chatbot, Synthesis
│       ├── components/       Chart, RecommendationCard, Loading, ErrorBox
│       └── api/client.js
├── data/
│   ├── customers.csv         10,000 synthesized customers (see below)
│   └── DATA_DICTIONARY.md
├── scripts/generate_dataset.py
└── docker-compose.yml
```

---

## Quick start

### 1. Docker (recommended)

```bash
cp .env.example .env
# put your key in .env:  ANTHROPIC_API_KEY=sk-ant-...

docker compose up -d db
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py load_customers --path /data/customers.csv
docker compose run --rm backend python manage.py build_index
docker compose up -d
```

Frontend on <http://localhost:5173>, API on <http://localhost:8000/api/health/>.

### 2. Local development

```bash
# --- database ---
docker run -d --name xsell-db -p 5432:5432 \
  -e POSTGRES_DB=crosssell -e POSTGRES_USER=crosssell -e POSTGRES_PASSWORD=crosssell \
  pgvector/pgvector:pg16

# --- backend ---
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python manage.py migrate
python manage.py load_customers --path ../data/customers.csv
python manage.py build_index
python manage.py runserver

# --- frontend ---
cd ../frontend
npm install
npm run dev
```

### 3. Offline checks (no DB, no API key)

```bash
cd backend && python selftest.py     # 42 assertions
cd ../frontend && npm run build
```

---

## The dataset — `data/customers.csv`

10,000 customers at `customer_id` level with 12 months of history, 46 columns.

| Metric                              | Value          |
|-------------------------------------|----------------|
| Total customers                     | 10,000         |
| FD base (balance > ₹10,00,000)      | 6,138 (61.4%)  |
| Eligible (no third-party product)   | 3,719          |
| Cross-sell converts                 | 194            |
| **Cross-sell rate (of eligible)**   | **5.22%**      |
| Customers with real feedback        | 1,003 (10.0%)  |

Independent variables cover demography, FD/RD/SB/AQB balances, the
`balance_gt_10l_flag`, product and account counts, debit/credit transaction
counts and values, digital ratio, demat and loan holdings, CIBIL, delinquency,
complaints and NRV — plus `holds_3p_insurance` and `holds_wealth_product`.

Regenerate with:

```bash
python scripts/generate_dataset.py --rows 10000 --out data/customers.csv
```

See `data/DATA_DICTIONARY.md` for every column.

---

## Feedback synthesis — growing seed

Only ~10% of customers carry real unstructured feedback (VOC, inbound call,
SMS, outbound, complaint). The remaining ~90% is synthesized iteratively:

```
round 1 : seed = 1,000 real            -> synthesize 1,000 -> merge -> 2,000
round 2 : seed = 2,000 merged          -> synthesize 1,000 -> merge -> 3,000
round 3 : seed = 3,000 merged          -> synthesize 1,000 -> merge -> 4,000
...
round 9 : seed = 9,000 merged          -> synthesize 1,000 -> merge -> 10,000
```

Each target customer is matched to its **nearest structured neighbours** in the
seed (a 12-dimensional normalised vector over FD balance, AQB, NRV, txn counts,
digital ratio, CIBIL, tenure and holdings), so generated feedback stays
consistent with that customer's actual numbers.

```bash
python manage.py synthesize            # all 9 rounds
python manage.py synthesize --one      # a single round
python manage.py synthesize --dry-run  # no LLM calls, no writes
```

**Known tradeoff.** Because the seed grows, synthetic text can seed further
synthetic text, which can cause drift and phrasing collapse. `drift_score()` in
`ingest/synthesize.py` tracks lexical diversity, the Synthesis Ops screen shows
the seed size per round, and the cleaning stage removes collapsed generations.
If drift falls below roughly 0.35, switch to a fixed seed (use only the original
1,000 real records) by pinning `_load_seed_pool()` to `is_synthetic=False`.

---

## Agents

| Agent                       | Responsibility                                        |
|-----------------------------|-------------------------------------------------------|
| **Intent Agent**            | Classify the RM's ask, extract customer/product/chart  |
| **Product Knowledge Bot**   | Ground answers in the product catalogue                |
| **Product Eligibility Agent** | Hard rules — runs *before* generation, never after   |
| **Nudge Agent**             | Compose recommendation, reasoning, next best action    |

Eligibility rules enforced before any pitch is generated:

- FD balance above ₹10,00,000
- No existing third-party product in the same category
- No delinquency flag
- Not more than one complaint in 12 months
- CIBIL at or above 650
- Age within the product's permitted band

An ineligible customer never reaches the LLM.

---

## API

| Method | Path                                    | Purpose                          |
|--------|-----------------------------------------|----------------------------------|
| GET    | `/api/health/`                          | status, row counts, LLM configured |
| GET    | `/api/stats/`                           | portfolio aggregates for the dashboard |
| GET    | `/api/products/`                        | product catalogue                |
| GET    | `/api/customers/`                       | filter/sort/paginate customers   |
| GET    | `/api/customers/{id}/`                  | full customer record + feedback  |
| POST   | `/api/customers/{id}/recommend/`        | **Part 1** — recommendation with reasoning |
| GET    | `/api/customers/{id}/eligibility/`      | eligibility trace                |
| GET    | `/api/nudge-queue/`                     | ranked work queue                |
| POST   | `/api/chat/`                            | **Part 2** — RM chatbot          |
| GET    | `/api/chat/{session_id}/`               | chat transcript                  |
| GET    | `/api/synthesis/runs/`                  | synthesis audit trail            |
| POST   | `/api/synthesis/step/`                  | run one synthesis round          |
| GET    | `/api/rag/search/?q=`                   | raw retrieval, for transparency  |

Example:

```bash
curl -X POST http://localhost:8000/api/chat/ \
  -H 'Content-Type: application/json' \
  -d '{"message":"who should I target for health insurance?"}'
```

---

## Notes and limitations

- **An API key is required.** Recommendation, chat and synthesis endpoints
  return `503 llm_not_configured` without `ANTHROPIC_API_KEY`. This is
  deliberate — the platform never fabricates model output while claiming it came
  from a model.
- **The dataset is synthetic.** It is statistically shaped to the brief, not
  drawn from real customers. Replace `data/customers.csv` with the bank's
  extract; the loader maps columns by name.
- Synthesising all 9 rounds makes roughly 450 LLM calls (20 customers per call).
  Run `--dry-run` first to check the batching.
- `selftest.py` covers the model, business rules, eligibility, serializers,
  routing, chat routing and synthesis helpers. It does **not** exercise pgvector
  similarity search, which needs a live PostgreSQL.
