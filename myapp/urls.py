from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Add this debugging function
def debug_view(request, conversation_id):
    print(f"DEBUG: URL matched messages/{conversation_id}/ - calling get_conversation_messages")
    return views.get_conversation_messages(request, conversation_id)

router = DefaultRouter()
router.register(r'devices', views.DeviceViewSet)
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
# Remove this line to avoid conflict:
# router.register(r'messages', views.MessageViewSet, basename='message')

urlpatterns = [
    path('device-login/', views.device_login, name='device-login'),
    path('device-register/', views.device_register, name='device-register'),
    path('register-device/', views.register_device_anonymous, name='register-device'),
    path('profile/', views.get_device_profile, name='device-profile'),
    path('conversations-list/', views.get_device_conversations, name='device-conversations'),
    path('messages/<int:conversation_id>/', views.get_conversation_messages, name='conversation-messages'),
    path('send-message/', views.send_message_api, name='send-message'),
    path('search-devices/', views.search_devices, name='search-devices'),
    path('start-conversation/', views.start_conversation_with_device, name='start-conversation'),
    path('', include(router.urls)),
]
