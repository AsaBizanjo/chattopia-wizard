# chats/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Conversation, Message, MessageFile
from .serializers import ConversationSerializer, MessageSerializer
import openai  # or your preferred AI service

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(conversation=conversation)
            # Update the conversation's updated_at time
            conversation.save(update_fields=['updated_at'])
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only allow users to access their own messages
        return Message.objects.filter(conversation__user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Only allow editing user messages
        if instance.role != 'user':
            return Response(
                {"detail": "Only user messages can be edited."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the message
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Update the conversation's updated_at time
        instance.conversation.save(update_fields=['updated_at'])
        
        return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_completion(request):
    message = request.data.get('message')
    conversation_id = request.data.get('conversation_id')
    is_edit = request.data.get('is_edit', False)
    previous_message_id = request.data.get('previous_message_id')
    
    # Get endpoint settings from request
    endpoint_id = request.data.get('endpoint_id')
    endpoint_base_url = request.data.get('endpoint_base_url')
    endpoint_api_key = request.data.get('endpoint_api_key')
    endpoint_model = request.data.get('endpoint_model', 'gpt-4')  # Default to gpt-4 if not specified
    
    # Get conversation
    conversation = Conversation.objects.get(id=conversation_id, user=request.user)
    
    # If this is an edit, we might want to get messages up to the edited message
    if is_edit and previous_message_id:
        # Get all messages up to and including the edited message
        messages = conversation.messages.filter(
            created_at__lte=Message.objects.get(id=previous_message_id).created_at
        )
    else:
        messages = conversation.messages.all()
    
    # Format messages for AI service
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
    
    # Call your AI service with the provided endpoint settings
    try:
        # Configure OpenAI client with the provided endpoint settings
        if endpoint_base_url and endpoint_api_key:
            # Create a custom OpenAI client with the provided base URL and API key
            client = openai.OpenAI(
                base_url=endpoint_base_url,
                api_key=endpoint_api_key
            )
            
            response = client.chat.completions.create(
                model=endpoint_model,
                messages=formatted_messages
            )
            ai_response = response.choices[0].message.content
        else:
            # Fall back to default OpenAI configuration if no endpoint settings provided
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=formatted_messages
            )
            ai_response = response.choices[0].message.content
            
        return Response({"response": ai_response})
    except Exception as e:
        return Response({"error": str(e)}, status=500)