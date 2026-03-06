import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# ✅ Load backend/.env
load_dotenv(BASE_DIR / ".env")


# =============================================================================
# Core
# =============================================================================

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-!b&^33$ue-bvce13e)p+@v)#gujh@yz+t$hef#*8121*(4msvm",
)

DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
    if h.strip()
]


# =============================================================================
# Applications
# =============================================================================

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",

    # Local apps
    "accounts",
    "vendors",
    "products",
    "orders",
    "core",
    "adminpanel",
    "payments",
    "offers",
    "vendor_dashboard",
    "disputes",
]


# =============================================================================
# Middleware
# =============================================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",

    # keep CSRF enabled
    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


# =============================================================================
# Templates
# =============================================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# =============================================================================
# Database
# =============================================================================

DATABASES = {
    "default": {
        "ENGINE": os.getenv("DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.getenv("DB_NAME", str(BASE_DIR / "db.sqlite3")),
    }
}

if DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3":
    DATABASES["default"].update(
        {
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    )


# =============================================================================
# Auth
# =============================================================================

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# =============================================================================
# Internationalization
# =============================================================================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True


# =============================================================================
# Static / Media
# =============================================================================

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =============================================================================
# DRF + JWT
# =============================================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=6),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}


# =============================================================================
# CORS (React / Vite dev servers)
# =============================================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
CORS_ALLOW_CREDENTIALS = True


# =============================================================================
# Base URL
# =============================================================================

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000").rstrip("/")


# =============================================================================
# M-Pesa / Daraja
# =============================================================================

MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "").strip()
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "").strip()
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379").strip()
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "").strip()

MPESA_CALLBACK_URL = os.getenv(
    "MPESA_CALLBACK_URL",
    f"{BASE_URL}/api/payments/mpesa/callback/",
).strip()

MPESA_STK_CALLBACK_URL = os.getenv(
    "MPESA_STK_CALLBACK_URL",
    MPESA_CALLBACK_URL,
).strip()

MPESA_MOCK = os.getenv("MPESA_MOCK", "False").lower() in ("true", "1", "yes")

if DEBUG:
    missing = []
    if not MPESA_CONSUMER_KEY:
        missing.append("MPESA_CONSUMER_KEY")
    if not MPESA_CONSUMER_SECRET:
        missing.append("MPESA_CONSUMER_SECRET")
    if not MPESA_PASSKEY:
        missing.append("MPESA_PASSKEY")

    if missing:
        print(f"[WARN] Missing M-Pesa settings in .env: {', '.join(missing)}")

    if MPESA_MOCK:
        print("[WARN] MPESA_MOCK=True (Daraja calls are mocked).")


# =============================================================================
# Cache
# =============================================================================

USE_REDIS_CACHE = os.getenv("USE_REDIS_CACHE", "False").lower() in ("true", "1", "yes")

if USE_REDIS_CACHE:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1"),
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "local-dev-cache",
        }
    }


# =============================================================================
# Logging
# =============================================================================

LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "{levelname} {asctime} {module} {message}", "style": "{"}
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": str(LOG_DIR / "app.log"),
            "formatter": "verbose",
        },
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "loggers": {
        "django": {
            "handlers": ["file", "console"] if DEBUG else ["file"],
            "level": "INFO",
            "propagate": True,
        }
    },
}