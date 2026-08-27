"""Django settings for the cross-sell nudge platform."""

from pathlib import Path
import os
import sys

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "crosssell.urls"
WSGI_APPLICATION = "crosssell.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# --- Database Config (PostgreSQL + pgvector with SQLite fallback) ----------
USE_SQLITE = os.getenv("USE_SQLITE", "1") == "1"

if USE_SQLITE:
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

    from django.db.migrations.operations.base import Operation

    class _FakeExtension(Operation):
        def database_forwards(self, app_label, schema_editor, from_state, to_state):
            pass
        def database_backwards(self, app_label, schema_editor, from_state, to_state):
            pass
        def state_forwards(self, app_label, state):
            pass

    _stub = types.ModuleType("pgvector.django")
    _stub.VectorField = _FakeVector
    _stub.HnswIndex = _FakeIndex
    _stub.CosineDistance = _FakeCosine
    _stub.VectorExtension = _FakeExtension
    _pkg = types.ModuleType("pgvector")
    _pkg.django = _stub
    sys.modules["pgvector"] = _pkg
    sys.modules["pgvector.django"] = _stub

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "crosssell"),
            "USER": os.getenv("POSTGRES_USER", "crosssell"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "crosssell"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SAVED_DATASET_KEEP = int(os.getenv("SAVED_DATASET_KEEP", "5"))

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 50,
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100 MB

CORS_ALLOW_ALL_ORIGINS = True

# --- LLM / RAG -------------------------------------------------------------
# Provider: explicit LLM_PROVIDER wins; otherwise infer from whichever key is set
# (an OpenAI key with no Anthropic key means OpenAI).
_openai_key = os.getenv("OPENAI_API_KEY", "")
_anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
_explicit_provider = os.getenv("LLM_PROVIDER", "").lower()
if _explicit_provider:
    LLM_PROVIDER = _explicit_provider
elif _openai_key and not _anthropic_key:
    LLM_PROVIDER = "openai"
else:
    LLM_PROVIDER = "anthropic"

if LLM_PROVIDER == "openai":
    LLM_API_KEY = _openai_key
    LLM_MODEL = os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
else:
    LLM_API_KEY = _anthropic_key
    LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-4-6")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1200"))

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-mpnet-base-v2")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "768"))

RAG_TOP_K = int(os.getenv("RAG_TOP_K", "8"))

# Business rules — the FD base threshold and target products.
FD_BASE_THRESHOLD = int(os.getenv("FD_BASE_THRESHOLD", "1000000"))
TARGET_PRODUCTS = [
    "Health-Insurance", "Term-Life", "ULIP", "Mutual-Fund", "Retirement-Pension",
]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.getenv("LOG_LEVEL", "INFO")},
}
