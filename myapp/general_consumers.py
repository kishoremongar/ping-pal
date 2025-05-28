import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Device, Conversation, Message

class GeneralChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract device_id from query_string - improved parsing
        query_string = self.scope.get('query_string', b'').decode()
        if query_string:
            try:
                query_params = dict(x.split('=') for x in query_string.split('&') if '=' in x)
                self.device_id = query_params.get('device_id')
            except ValueError:
                await self.close()
                return
        else:
            await self.close()
            return
        
        if not self.device_id:
            await self.close()
            return
        
        # Check if device exists
        if not await self.device_exists(self.device_id):
            await self.close()
            return
        
        # Join device-specific group for notifications
        self.device_group_name = f'device_{self.device_id}'
        await self.channel_layer.group_add(
            self.device_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave device group
        if hasattr(self, 'device_group_name'):
            await self.channel_layer.group_discard(
                self.device_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', '')
            
            if message_type == 'get_profile':
                await self.handle_get_profile()
            elif message_type == 'get_chat_list':
                await self.handle_get_chat_list()
            elif message_type == 'get_conversation_messages':
                await self.handle_get_conversation_messages(text_data_json)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))

    async def handle_get_profile(self):
        profile = await self.get_device_profile(self.device_id)
        await self.send(text_data=json.dumps({
            'type': 'profile',
            'data': profile
        }))

    async def handle_get_chat_list(self):
        chat_list = await self.get_device_conversations(self.device_id)
        await self.send(text_data=json.dumps({
            'type': 'chat_list',
            'data': chat_list
        }))

    async def handle_get_conversation_messages(self, data):
        conversation_id = data.get('conversation_id')
        if conversation_id:
            messages = await self.get_conversation_messages(conversation_id, self.device_id)
            await self.send(text_data=json.dumps({
                'type': 'conversation_messages',
                'conversation_id': conversation_id,
                'data': messages
            }))

    # Add method to handle real-time notifications
    async def conversation_update(self, event):
        """Handle conversation updates from group"""
        await self.send(text_data=json.dumps({
            'type': 'conversation_update',
            'data': event['data']
        }))

    async def new_message_notification(self, event):
        """Handle new message notifications"""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'data': event['data']
        }))

    @database_sync_to_async
    def device_exists(self, device_id):
        try:
            Device.objects.get(device_id=device_id)
            return True
        except Device.DoesNotExist:
            return False

    @database_sync_to_async
    def get_device_profile(self, device_id):
        try:
            device = Device.objects.get(device_id=device_id)
            from .serializers import DeviceSerializer
            return DeviceSerializer(device).data
        except Device.DoesNotExist:
            return None

    @database_sync_to_async
    def get_device_conversations(self, device_id):
        try:
            device = Device.objects.get(device_id=device_id)
            conversations = Conversation.objects.filter(device_participants=device).order_by('-updated_at')
            from .serializers import ConversationSerializer
            return ConversationSerializer(conversations, many=True).data
        except Device.DoesNotExist:
            return []

    @database_sync_to_async
    def get_conversation_messages(self, conversation_id, device_id):
        try:
            device = Device.objects.get(device_id=device_id)
            conversation = Conversation.objects.get(id=conversation_id)
            
            # Check if device is part of conversation
            if device not in conversation.device_participants.all():
                return []
                
            messages = conversation.messages.all().order_by('timestamp')
            from .serializers import MessageSerializer
            return MessageSerializer(messages, many=True).data
        except (Device.DoesNotExist, Conversation.DoesNotExist):
            return []
