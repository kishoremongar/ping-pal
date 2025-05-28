from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Device, Conversation, Message

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['id', 'display_name', 'avatar', 'status', 'last_active']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['device_id', 'name', 'username', 'full_name', 'created_at', 'last_active', 'avatar']
        read_only_fields = ['device_id', 'created_at', 'last_active']

class DeviceLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        try:
            device = Device.objects.get(username=username)
            if not device.check_password(password):
                raise serializers.ValidationError("Invalid credentials")
            data['device'] = device
        except Device.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")
        
        return data

class DeviceRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = Device
        fields = ['username', 'full_name', 'password', 'confirm_password']
    
    def validate_username(self, value):
        if Device.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        device = Device.objects.create(**validated_data)
        device.set_password(password)
        device.save()
        return device


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    device_sender = DeviceSerializer(read_only=True)
    sender_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'device_sender', 'sender_name', 'content', 'timestamp', 'status']
    
    def get_sender_name(self, obj):
        if obj.sender:
            return obj.sender.username
        elif obj.device_sender:
            return obj.device_sender.username or obj.device_sender.name or f"Anonymous ({obj.device_sender.device_id})"
        return "Unknown"

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    device_participants = DeviceSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'device_participants', 'created_at', 'updated_at', 'last_message', 'unread_count']
    
    def get_last_message(self, obj):
        last_message = obj.messages.order_by('-timestamp').first()
        if last_message:
            return MessageSerializer(last_message).data
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'current_device'):
            # Count messages that are not from current device and not read
            unread_messages = obj.messages.exclude(
                device_sender=request.current_device
            ).exclude(status='read')
            return unread_messages.count()
        return 0
