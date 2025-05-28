import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Device, Conversation, Message
from .serializers import DeviceSerializer, ConversationSerializer, MessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # Extract device_id from query_string or session
        if 'session' in self.scope and 'device_id' in self.scope['session']:
            self.device_id = self.scope['session']['device_id']
        elif 'query_string' in self.scope:
            query_params = dict(x.split('=') for x in self.scope['query_string'].decode().split('&'))
            self.device_id = query_params.get('device_id')
        else:
            await self.close()
            return
        
        # Check if device exists and is part of conversation
        if not await self.device_exists(self.device_id):
            await self.close()
            return
            
        if not await self.device_in_conversation(self.device_id, self.conversation_id):
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'message')
            
            if message_type == 'message':
                await self.handle_message(text_data_json)
            elif message_type == 'get_profile':
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

    async def handle_message(self, data):
        message = data.get('message', '')
        if not message.strip():
            return
            
        # Save message to database
        msg = await self.save_message(self.device_id, message)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'device_id': self.device_id,
                'timestamp': str(msg['timestamp']),
                'message_id': msg['id'],
                'sender_name': msg['sender_name']
            }
        )

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

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        device_id = event['device_id']
        timestamp = event['timestamp']
        message_id = event['message_id']
        sender_name = event['sender_name']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': message,
            'device_id': device_id,
            'timestamp': timestamp,
            'message_id': message_id,
            'sender_name': sender_name,
            'conversation_id': self.conversation_id
        }))

    @database_sync_to_async
    def device_exists(self, device_id):
        try:
            Device.objects.get(device_id=device_id)
            return True
        except Device.DoesNotExist:
            return False

    @database_sync_to_async
    def device_in_conversation(self, device_id, conversation_id):
        try:
            device = Device.objects.get(device_id=device_id)
            conversation = Conversation.objects.get(id=conversation_id)
            return device in conversation.device_participants.all()
        except (Device.DoesNotExist, Conversation.DoesNotExist):
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

    @database_sync_to_async
    def save_message(self, device_id, message):
        device = Device.objects.get(device_id=device_id)
        conversation = Conversation.objects.get(id=int(self.conversation_id))
        
        msg = Message.objects.create(
            conversation=conversation,
            device_sender=device,
            content=message,
            status='sent'
        )
        
        return {
            'id': msg.id,
            'timestamp': msg.timestamp,
            'sender_name': device.username or device.name or f"Anonymous ({device.device_id})"
        }

async def handle_mark_as_read(self, data):
    """Handle marking messages as read"""
    message_ids = data.get('message_ids', [])
    if not message_ids:
        return
    
    # Mark messages as read
    await self.mark_messages_as_read(message_ids)
    
    # Notify other participants about read status
    await self.channel_layer.group_send(
        self.room_group_name,
        {
            'type': 'messages_read',
            'message_ids': message_ids,
            'reader_device_id': self.device_id,
        }
    )

@database_sync_to_async
def mark_messages_as_read(self, message_ids):
    """Mark specific messages as read"""
    try:
        device = Device.objects.get(device_id=self.device_id)
        messages = Message.objects.filter(
            id__in=message_ids,
            conversation_id=self.conversation_id
        ).exclude(device_sender=device)  # Don't mark own messages as read
        
        # Update all messages to read status
        messages.update(status='read')
        
        return True
    except Device.DoesNotExist:
        return False

@database_sync_to_async
def mark_messages_as_delivered(self):
    """Mark undelivered messages as delivered when user connects"""
    try:
        device = Device.objects.get(device_id=self.device_id)
        conversation = Conversation.objects.get(id=self.conversation_id)
        
        # Get messages that haven't been delivered to this device
        undelivered_messages = conversation.messages.exclude(
            device_sender=device
        ).filter(status='sent')
        
        # Update status to delivered
        undelivered_messages.update(status='delivered')
        
    except (Device.DoesNotExist, Conversation.DoesNotExist):
        pass
