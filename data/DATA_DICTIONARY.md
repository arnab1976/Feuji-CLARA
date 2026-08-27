# Data Dictionary — `customers.csv`

**10,000 rows · 46 columns · customer-ID level · 12 months of history**

## Cohort summary

| Metric | Value |
|---|---|
| Total customers | 10,000 |
| FD base (balance > ₹10,00,000) | 6,138 (61.4%) |
| Eligible (no third-party product, not delinquent) | 3,719 |
| Cross-sell converts | 194 |
| **Cross-sell rate (of eligible base)** | **5.22%** |
| Customers with real unstructured feedback | 1,003 (10.0%) |

> `cross_sell_flag`, `cross_sell_product` and `propensity_score` are **supplied by the bank**.
> This application does not build a cross-sell model.

## Columns

| # | Column | Type | Description |
|---|---|---|---|
| 1 | `customer_id` | key | Primary key, one row per customer |
| 2 | `age` | int | Age in years |
| 3 | `gender` | cat | M / F |
| 4 | `marital_status` | cat | Single / Married |
| 5 | `city_tier` | cat | Tier-1 / Tier-2 / Tier-3 |
| 6 | `occupation` | cat | Salaried / Self-Employed / Business / Professional / Retired |
| 7 | `life_stage` | cat | Young-Earner / Family-Builder / Peak-Earner / Pre-Retiree / Retiree |
| 8 | `annual_income` | INR | Declared annual income |
| 9 | `relationship_tenure_months` | int | Months since relationship opened |
| 10 | `segment` | cat | Classic / Preferred / Imperia |
| 11 | `fd_balance` | INR | **Running FD balance. Base filter: > 10,00,000** |
| 12 | `fd_count` | int | Number of FD accounts held |
| 13 | `fd_avg_tenor_months` | int | Average FD tenor |
| 14 | `rd_balance` | INR | Recurring deposit balance |
| 15 | `sb_balance` | INR | Savings balance |
| 16 | `aqb` | INR | Average Quarterly Balance |
| 17 | `balance_gt_10l_flag` | bool | Any account balance above 10,00,000 |
| 18 | `num_products` | int | Total products held |
| 19 | `num_accounts` | int | Total accounts held |
| 20 | `has_demat` | bool | Holds a demat account |
| 21 | `demat_balance` | INR | Demat / trading balance |
| 22 | `has_loan` | bool | Holds a loan |
| 23 | `loan_outstanding` | INR | Loan outstanding |
| 24 | `debit_txn_count_12m` | int | Debit transaction count, 12 months |
| 25 | `credit_txn_count_12m` | int | Credit transaction count, 12 months |
| 26 | `debit_txn_value_12m` | INR | Debit transaction value, 12 months |
| 27 | `credit_txn_value_12m` | INR | Credit transaction value, 12 months |
| 28 | `avg_monthly_txn_count` | float | Average monthly transaction count |
| 29 | `digital_txn_ratio` | float | Share of transactions via digital channels (0-1) |
| 30 | `cibil_score` | int | CIBIL credit score |
| 31 | `delinquency_flag` | bool | Delinquency on any facility |
| 32 | `complaint_count_12m` | int | Complaints raised in 12 months |
| 33 | `nrv_12m` | INR | Net Relationship Value, 12 months |
| 34 | `holds_3p_insurance` | bool | Already holds a third-party insurance product |
| 35 | `holds_wealth_product` | bool | Already holds a wealth-management product |
| 36 | `has_real_feedback` | bool | **True for ~10% with real unstructured feedback** |
| 37 | `feedback_channel` | cat | VOC / InboundCall / SMS / Outbound / Complaint |
| 38 | `feedback_text` | text | Real feedback text (blank for the 90%) |
| 39 | `feedback_sentiment` | cat | positive / neutral / negative |
| 40 | `feedback_signal` | cat | protection_intent / yield_fatigue / wealth_intent / retirement_intent / service_issue / neutral |
| 41 | `feedback_date` | date | Date the feedback was captured |
| 42 | `is_fd_base` | bool | **Cohort flag: fd_balance > 10,00,000** |
| 43 | `is_eligible` | bool | In base, holds no third-party product, not delinquent |
| 44 | `cross_sell_flag` | bool | **TARGET - supplied by the bank** |
| 45 | `cross_sell_product` | cat | **TARGET product - supplied by the bank** |
| 46 | `propensity_score` | float | **Bank-supplied propensity score (0-1)** |

## Cross-sell product mix (converts only)

| Product | Count |
|---|---|
| Retirement-Pension | 54 |
| Health-Insurance | 50 |
| Mutual-Fund | 48 |
| ULIP | 27 |
| Term-Life | 15 |

## Feedback signal mix (real feedback only)

| Signal | Count |
|---|---|
| neutral | 246 |
| protection_intent | 182 |
| wealth_intent | 173 |
| yield_fatigue | 164 |
| retirement_intent | 128 |
| service_issue | 110 |

## Regenerate

```bash
python scripts/generate_dataset.py --rows 10000 --out data/customers.csv
```
