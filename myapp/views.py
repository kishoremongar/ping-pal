from django.utils import timezone
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.contrib.auth.models import User
from .models import UserProfile, Device, Conversation, Message
from .serializers import UserSerializer, UserProfileSerializer, DeviceSerializer, ConversationSerializer, MessageSerializer, DeviceRegistrationSerializer, DeviceLoginSerializer  
import uuid
import logging

logger = logging.getLogger(__name__)

# Custom permission for device authentication
class IsDeviceAuthenticated(permissions.BasePermission):
    def has_permission(self, request, view):
        print("=== IsDeviceAuthenticated called ===")
        print(f"Session device_id: {request.session.get('device_id')}")
        print(f"Header X-Device-ID: {request.headers.get('X-Device-ID')}")
        
        # Check if device_id is in session
        if 'device_id' in request.session:
            try:
                device = Device.objects.get(device_id=request.session['device_id'])
                print(f"Device found in session: {device}")
                return True
            except Device.DoesNotExist:
                print("Device in session not found in DB, clearing session")
                # Clear invalid session data
                del request.session['device_id']
                return False
                
        # Check if device_id is in headers
        device_id = request.headers.get('X-Device-ID')
        if device_id:
            try:
                device = Device.objects.get(device_id=device_id)
                print(f"Device found in headers: {device}")
                # Store in session for future requests
                request.session['device_id'] = device_id
                return True
            except Device.DoesNotExist:
                print("Device in headers not found in DB")
                return False
        
        print("No valid device authentication found")
        return False

# Combined permission for either user or device authentication
class IsUserOrDeviceAuthenticated(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated or IsDeviceAuthenticated().has_permission(request, view)

# Device registration and authentication
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_device_anonymous(request):
    """Register a new anonymous device (no credentials required)"""
    try:
        # Check if a device_id already exists in the session
        if 'device_id' in request.session:
            try:
                # Try to get the existing device by device_id from session
                device = Device.objects.get(device_id=request.session['device_id'])
            except Device.DoesNotExist:
                # If the device doesn't exist in the database, create a new one
                device = Device.objects.create()
                request.session['device_id'] = str(device.device_id)
        # Check if device_id is in headers
        elif 'X-Device-ID' in request.headers:
            try:
                device = Device.objects.get(device_id=request.headers['X-Device-ID'])
                request.session['device_id'] = request.headers['X-Device-ID']
            except Device.DoesNotExist:
                device = Device.objects.create()
                request.session['device_id'] = str(device.device_id)
        else:
            # If no device_id in session or headers, create a new device
            device = Device.objects.create()
            request.session['device_id'] = str(device.device_id)
        
        # Update device properties if provided in the request
        if 'name' in request.data:
            device.name = request.data['name']
        
        if 'username' in request.data:
            username = request.data['username']
            # Check if username is available
            if username and Device.objects.filter(username=username).exclude(device_id=device.device_id).exists():
                return Response({"error": "Username already taken", "code": "username_taken"}, status=status.HTTP_400_BAD_REQUEST)
            device.username = username
        
        device.save()  # Save the device to the database
        
        # Set cookie in response for frontend to use
        serializer = DeviceSerializer(device)
        response = Response(serializer.data)
        response.set_cookie(
            'deviceId', 
            str(device.device_id), 
            max_age=60*60*24*30,  # 30 days
            httponly=False,  # Allow JavaScript access
            samesite='Lax'
        )
        return response
    except Exception as e:
        # Log the error for debugging
        import logging
        logging.error(f"Error in register_device: {str(e)}")
        return Response({"error": "Failed to register device", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def device_login(request):
    """Login with existing device credentials"""
    try:
        serializer = DeviceLoginSerializer(data=request.data)
        if serializer.is_valid():
            device = serializer.validated_data['device']
            
            # Store device_id in session
            request.session['device_id'] = str(device.device_id)
            
            # Update last active
            device.last_active = timezone.now()
            device.save()
            
            # Return device data
            device_serializer = DeviceSerializer(device)
            response = Response({
                "success": True,
                "message": "Login successful",
                "device": device_serializer.data
            })
            
            # Set cookie
            response.set_cookie(
                'deviceId', 
                str(device.device_id), 
                max_age=60*60*24*30,
                httponly=False,
                samesite='Lax'
            )
            return response
        else:
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            "success": False,
            "error": "Login failed",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def device_register(request):
    """Register a new device with credentials"""
    try:
        serializer = DeviceRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            device = serializer.save()
            
            # Store device_id in session
            request.session['device_id'] = str(device.device_id)
            
            # Return device data
            device_serializer = DeviceSerializer(device)
            response = Response({
                "success": True,
                "message": "Registration successful",
                "device": device_serializer.data
            }, status=status.HTTP_201_CREATED)
            
            # Set cookie
            response.set_cookie(
                'deviceId', 
                str(device.device_id), 
                max_age=60*60*24*30,
                httponly=False,
                samesite='Lax'
            )
            return response
        else:
            return Response({
                "success": False,
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            "success": False,
            "error": "Registration failed",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [IsDeviceAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        device = Device.objects.get(device_id=request.session['device_id'])
        serializer = self.get_serializer(device)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def update_me(self, request):
        device = Device.objects.get(device_id=request.session['device_id'])
        serializer = self.get_serializer(device, data=request.data, partial=True)
        if serializer.is_valid():
            # Check if username is available if it's being updated
            if 'username' in request.data and request.data['username']:
                username = request.data['username']
                if Device.objects.filter(username=username).exclude(device_id=device.device_id).exists():
                    return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def device_username_update(self, request):
        device = Device.objects.get(device_id=request.session['device_id'])
        
        if 'username' not in request.data or not request.data['username']:
            return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        username = request.data['username']
        # Check if username is available
        if Device.objects.filter(username=username).exclude(device_id=device.device_id).exists():
            return Response({"error": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)
            
        device.username = username
        device.save()
        
        serializer = self.get_serializer(device)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for devices by username"""
        query = request.query_params.get('q', '')
        if not query or len(query) < 3:
            return Response({"error": "Search query too short"}, status=status.HTTP_400_BAD_REQUEST)
        
        devices = Device.objects.filter(username__icontains=query)
        serializer = self.get_serializer(devices, many=True)
        return Response(serializer.data)

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsUserOrDeviceAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Conversation.objects.filter(participants=self.request.user)
        elif 'device_id' in self.request.session:
            device_id = self.request.session['device_id']
            device = Device.objects.get(device_id=device_id)
            return Conversation.objects.filter(device_participants=device)
        return Conversation.objects.none()
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def start_conversation(self, request):
        # Handle both user and device initiated conversations
        if request.user.is_authenticated:
            # User-initiated conversation
            user_ids = request.data.get('user_ids', [])
            device_ids = request.data.get('device_ids', [])
            
            if request.user.id not in user_ids:
                user_ids.append(request.user.id)
            
            users = User.objects.filter(id__in=user_ids)
            devices = Device.objects.filter(device_id__in=device_ids)
            
            conversation = Conversation.objects.create()
            conversation.participants.set(users)
            conversation.device_participants.set(devices)
            
        elif 'device_id' in request.session:
            # Device-initiated conversation
            device_id = request.session['device_id']
            device = Device.objects.get(device_id=device_id)
            
            user_ids = request.data.get('user_ids', [])
            device_ids = request.data.get('device_ids', [])
            
            if str(device.device_id) not in device_ids:
                device_ids.append(str(device.device_id))
            
            users = User.objects.filter(id__in=user_ids)
            devices = Device.objects.filter(device_id__in=device_ids)
            
            conversation = Conversation.objects.create()
            conversation.participants.set(users)
            conversation.device_participants.set(devices)
        else:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsUserOrDeviceAuthenticated]
    
    def get_queryset(self):
        # For list action, check if conversation_id is provided as a query parameter
        if self.action == 'list':
            conversation_id = self.request.query_params.get('conversation_id')
            if conversation_id:
                # Return messages for specific conversation
                if self.request.user.is_authenticated:
                    return Message.objects.filter(
                        conversation_id=conversation_id,
                        conversation__participants=self.request.user
                    ).order_by('timestamp')
                elif 'device_id' in self.request.session:
                    device_id = self.request.session['device_id']
                    device = Device.objects.get(device_id=device_id)
                    return Message.objects.filter(
                        conversation_id=conversation_id,
                        conversation__device_participants=device
                    ).order_by('timestamp')
        
        # For retrieve action (single message), use the pk as message ID
        if self.action == 'retrieve':
            if self.request.user.is_authenticated:
                return Message.objects.filter(conversation__participants=self.request.user)
            elif 'device_id' in self.request.session:
                device_id = self.request.session['device_id']
                device = Device.objects.get(device_id=device_id)
                return Message.objects.filter(conversation__device_participants=device)
        
        return Message.objects.none()

@api_view(['GET', 'OPTIONS'])
@permission_classes([IsDeviceAuthenticated])
def get_device_profile(request):
    """Get device profile information"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return Response(status=status.HTTP_200_OK)
    
    logger.info("=== get_device_profile called ===")
    logger.info(f"Method: {request.method}")
    logger.info(f"Session: {dict(request.session)}")
    logger.info(f"Headers: {dict(request.headers)}")
    
    try:
        device_id = request.session.get('device_id') or request.headers.get('X-Device-ID')
        logger.info(f"Device ID: {device_id}")
        
        if not device_id:
            logger.error("No device ID found")
            return Response({"error": "No device ID provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        device = Device.objects.get(device_id=device_id)
        logger.info(f"Device found: {device}")
        
        serializer = DeviceSerializer(device)
        logger.info(f"Serialized data: {serializer.data}")
        
        return Response(serializer.data)
    except Device.DoesNotExist:
        logger.error("Device not found in database")
        return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": "Internal server error", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'OPTIONS'])
@permission_classes([IsDeviceAuthenticated])
def get_device_conversations(request):
    """Get all conversations for a device"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return Response(status=status.HTTP_200_OK)
    
    try:
        device_id = request.session.get('device_id') or request.headers.get('X-Device-ID')
        device = Device.objects.get(device_id=device_id)
        conversations = Conversation.objects.filter(device_participants=device).order_by('-updated_at')
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)
    except Device.DoesNotExist:
        return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'OPTIONS'])
@permission_classes([IsDeviceAuthenticated])
def get_conversation_messages(request, conversation_id):
    """Get all messages for a specific conversation"""
    
    print(f"=== get_conversation_messages called ===")
    print(f"Conversation ID: {conversation_id}")
    print(f"Method: {request.method}")
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return Response(status=status.HTTP_200_OK)
    
    try:
        device_id = request.session.get('device_id') or request.headers.get('X-Device-ID')
        print(f"Device ID: {device_id}")
        
        device = Device.objects.get(device_id=device_id)
        conversation = Conversation.objects.get(id=conversation_id)
        
        # Check if device is part of conversation
        if device not in conversation.device_participants.all():
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            
        messages = conversation.messages.all().order_by('timestamp')
        print(f"Found {messages.count()} messages")
        
        serializer = MessageSerializer(messages, many=True)
        print(f"Serialized data: {serializer.data}")
        
        return Response(serializer.data)
    except Device.DoesNotExist:
        print("Device not found")
        return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)
    except Conversation.DoesNotExist:
        print("Conversation not found")
        return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST', 'OPTIONS'])
@permission_classes([IsDeviceAuthenticated])
def send_message_api(request):
    """Send a message via REST API"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return Response(status=status.HTTP_200_OK)
    
    try:
        device_id = request.session.get('device_id') or request.headers.get('X-Device-ID')
        device = Device.objects.get(device_id=device_id)
        
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content', '').strip()
        
        if not conversation_id or not content:
            return Response({"error": "conversation_id and content are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        conversation = Conversation.objects.get(id=conversation_id)
        
        # Check if device is part of conversation
        if device not in conversation.device_participants.all():
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Create message
        message = Message.objects.create(
            conversation=conversation,
            device_sender=device,
            content=content,
            status='sent'
        )
        
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Device.DoesNotExist:
        return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)
    except Conversation.DoesNotExist:
        return Response({"error": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET', 'OPTIONS'])
@permission_classes([IsDeviceAuthenticated])
def search_devices(request):
    """Search for devices by username or device_id"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return Response(status=status.HTTP_200_OK)
    
    logger.info("=== search_devices called ===")
    
    query = request.query_params.get('q', '').strip()
    logger.info(f"Search query: {query}")
    
    if not query:
        return Response({"error": "Search query is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(query) < 2:
        return Response({"error": "Search query must be at least 2 characters"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get current device to exclude from results
        current_device_id = request.session.get('device_id') or request.headers.get('X-Device-ID')
        logger.info(f"Current device ID: {current_device_id}")
        
        # Search by username or device_id (partial match for username, exact match for device_id)
        devices = Device.objects.filter(
            models.Q(username__icontains=query) | 
            models.Q(device_id__icontains=query) |
            models.Q(name__icontains=query)
        ).exclude(
            device_id=current_device_id  # Exclude current device from results
        )[:20]  # Limit to 20 results
        
        logger.info(f"Found {len(devices)} devices")
        
        serializer = DeviceSerializer(devices, many=True)
        return Response({
            "results": serializer.data,
            "count": len(serializer.data),
            "query": query
        })
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": "Search failed", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST', 'OPTIONS'])
@permission_classes([IsDeviceAuthenticated])
def start_conversation_with_device(request):
    """Start a conversation with a specific device"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return Response(status=status.HTTP_200_OK)
    
    logger.info("=== start_conversation_with_device called ===")
    
    target_device_id = request.data.get('target_device_id')
    if not target_device_id:
        return Response({"error": "target_device_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get current device
        current_device_id = request.session.get('device_id') or request.headers.get('X-Device-ID')
        current_device = Device.objects.get(device_id=current_device_id)
        
        # Get target device
        target_device = Device.objects.get(device_id=target_device_id)
        
        # Check if conversation already exists between these devices
        existing_conversation = Conversation.objects.filter(
            device_participants=current_device
        ).filter(
            device_participants=target_device
        ).first()
        
        if existing_conversation:
            logger.info(f"Existing conversation found: {existing_conversation.id}")
            serializer = ConversationSerializer(existing_conversation)
            return Response(serializer.data)
        
        # Create new conversation
        conversation = Conversation.objects.create()
        conversation.device_participants.set([current_device, target_device])
        
        logger.info(f"New conversation created: {conversation.id}")
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Device.DoesNotExist:
        return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": "Failed to create conversation", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
