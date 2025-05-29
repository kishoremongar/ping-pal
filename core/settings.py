import os
from pathlib import Path
from decouple import config
import dj_database_url

# Load environment variables from .env file (for local development only)
# Railway will inject its own environment variables directly.
if os.getenv('RAILWAY_ENVIRONMENT_NAME') is None:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(Path(__file__).resolve().parent.parent, '.env'))


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Determine if running in production based on DEBUG env var
IS_PRODUCTION = config('DEBUG', default='False', cast=bool)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY') # Will read from Railway env or .env locally

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = IS_PRODUCTION # True for local dev, False for Railway

# ALLOWED_HOSTS for production - IMPORTANT!
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')
if not DEBUG:
    # Add Railway's dynamic domain and custom domain if applicable
    # Railway automatically provides the PUBLIC_URL env var
    # You might also add your custom domain here if you set one.
    pass # Already handled by config('ALLOWED_HOSTS')


# CORS settings - Adjust for production!
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='').split(',')
if not DEBUG:
    # In production, ONLY allow your Vercel frontend URL
    # Replace with your actual Vercel app domain (e.g., https://ping-pal-rust.vercel.app)
    CORS_ALLOWED_ORIGINS = [
        os.environ.get('FRONTEND_URL') # This will be set as an ENV var in Railway
    ]
    CORS_ORIGIN_ALLOW_ALL = False # Crucial for production

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-device-id',  # Your custom header (lowercase!)
]

# Session settings (these look fine)
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'channels',
    'myapp',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_METHODS = [
    'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'
]
CORS_PREFLIGHT_MAX_AGE = 86400

ROOT_URLCONF = 'core.urls' # Ensure this matches your project name

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application' # Ensure this matches your project name

# Database configuration for Railway PostgreSQL
DATABASES = {
    "default": dj_database_url.config(
        # Use DATABASE_URL from Railway env, or local .env default
        default=config("DATABASE_URL"),
        conn_max_age=600 # Optional: keep connections alive for up to 10 minutes
    )
}

# Channel layers for WebSockets - USING REDIS!
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.pubsub.RedisPubSubChannelLayer',
        'CONFIG': {
            # Use REDIS_URL from Railway env, or local .env default
            'hosts': [config('REDIS_URL')],
        },
    }
}
ASGI_APPLICATION = 'core.asgi.application' # Ensure this matches your project name


# Password validation (looks fine)
AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

# Internationalization (looks fine)
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images) for WhiteNoise
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles' # Collected static files will go here
# Django will find static files inside `static/` directories of your apps.

# Default primary key field type (looks fine)
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Logging configuration (looks fine, console handler is good for cloud logs)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'myapp': { 'handlers': ['console'], 'level': 'DEBUG', 'propagate': False, },
        'channels': { 'handlers': ['console'], 'level': 'DEBUG', 'propagate': False, },
        'django': { 'handlers': ['console'], 'level': 'INFO', 'propagate': False, },
    },
}