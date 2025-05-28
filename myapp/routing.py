from django.urls import path
from . import consumers, general_consumers

# WebSocket URLs
websocket_urlpatterns = [
    path('ws/chat/<int:conversation_id>/', consumers.ChatConsumer.as_asgi()),
    path('ws/general/', general_consumers.GeneralChatConsumer.as_asgi()),
]
