import sys
from pathlib import Path
from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        # Prevent running during management commands like makemigrations or collectstatic
        if "manage.py" in sys.argv and any(cmd in sys.argv for cmd in ["makemigrations", "collectstatic"]):
            return

        try:
            from django.core.management import call_command
            from django.db import connection

            tables = connection.introspection.table_names()
            if "api_customer" not in tables:
                call_command("migrate", interactive=False)

            # Check if Customer table is empty and auto-load dataset
            from api.models import Customer
            if Customer.objects.count() == 0:
                csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "customers.csv"
                if not csv_path.exists():
                    csv_path = Path("/data/customers.csv")
                if csv_path.exists():
                    call_command("load_customers", path=str(csv_path))
        except Exception:
            pass
