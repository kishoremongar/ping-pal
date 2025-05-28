"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application

# Set the Django settings module FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Setup Django BEFORE importing anything else
django.setup()

# Now import the routing after Django is set up
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import myapp.routing

# Get the Django ASGI application
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            myapp.routing.websocket_urlpatterns
        )
    ),
})

