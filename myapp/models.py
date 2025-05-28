from django.db import models
from django.contrib.auth.models import AbstractBaseUser
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.hashers import make_password, check_password
import uuid


class UserProfile(AbstractBaseUser):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=50, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    status = models.CharField(max_length=20, default='offline')
    last_active = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'user'
    
    def __str__(self):
        return self.user.username

class Device(models.Model):
    device_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, blank=True, default="Anonymous Device")
    username = models.CharField(max_length=50, blank=True, null=True, unique=True)
    full_name = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=128, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    avatar = models.ImageField(upload_to='device_avatars/', null=True, blank=True)
    
    def set_password(self, raw_password):
        """Hash and set password"""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check if provided password matches"""
        if not self.password:
            return False
        return check_password(raw_password, self.password)
    
    def __str__(self):
        if self.full_name:
            return f"{self.full_name} (@{self.username}) - {self.device_id}"
        elif self.username:
            return f"{self.username} ({self.device_id})"
        return f"{self.name} ({self.device_id})"

# Modify Conversation to handle both users and devices
class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations', blank=True)
    device_participants = models.ManyToManyField(Device, related_name='conversations', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Conversation {self.id}"

# Modify Message to handle senders from both users and devices
class Message(models.Model):
    MESSAGE_STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages', null=True, blank=True)
    device_sender = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='sent_messages', null=True, blank=True)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=MESSAGE_STATUS_CHOICES, default='sent')
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        sender_name = self.sender.username if self.sender else (self.device_sender.name if self.device_sender else "Unknown")
        return f"Message from {sender_name} at {self.timestamp}"
    
    def get_status_for_device(self, device):
        """Get message status for a specific device"""
        if self.device_sender == device:
            # If this device sent the message, show the actual status
            return self.status
        else:
            # For received messages, the status represents what the sender sees
            return self.status
    
    def mark_as_delivered(self):
        """Mark message as delivered"""
        if self.status == 'sent':
            self.status = 'delivered'
            self.save()
    
    def mark_as_read(self):
        """Mark message as read"""
        self.status = 'read'
        self.save()

# Create a UserProfile when a new User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

class MessageReadStatus(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_statuses')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='message_read_statuses', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_read_statuses', null=True, blank=True)
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [
            ['message', 'device'],
            ['message', 'user']
        ]
    
    def __str__(self):
        reader = self.device.username if self.device else self.user.username
        return f"{reader} read message {self.message.id}"