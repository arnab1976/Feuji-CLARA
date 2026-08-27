.PHONY: help data test build up down migrate load index synth clean

help:
	@echo "make data     - regenerate data/customers.csv"
	@echo "make test     - backend selftest + frontend build"
	@echo "make up       - docker compose up"
	@echo "make migrate  - run django migrations"
	@echo "make load     - load customers.csv into postgres"
	@echo "make index    - build the pgvector RAG index"
	@echo "make synth    - run the growing-seed synthesis loop"

data:
	python scripts/generate_dataset.py --rows 10000 --out data/customers.csv

test:
	cd backend && python selftest.py
	cd frontend && npm run build

up:
	docker compose up -d

down:
	docker compose down

migrate:
	cd backend && python manage.py migrate

load:
	cd backend && python manage.py load_customers --path ../data/customers.csv

index:
	cd backend && python manage.py build_index

synth:
	cd backend && python manage.py synthesize
