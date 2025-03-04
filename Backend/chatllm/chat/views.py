# chats/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Conversation, Message, MessageFile, MessageVersion
from .serializers import ConversationSerializer, MessageSerializer, MessageVersionSerializer, MessageFileSerializer
import openai  # or your preferred AI service
import requests
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import base64
import json

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
        
        # Store the current version before updating
        MessageVersion.objects.create(
            message=instance,
            content=instance.content
        )
        
        # Update the message
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Update the conversation's updated_at time
        instance.conversation.save(update_fields=['updated_at'])
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['GET'])
    def versions(self, request, pk=None):
        message = self.get_object()
        versions = message.versions.all()
        serializer = MessageVersionSerializer(versions, many=True)
        return Response(serializer.data)

class MessageVersionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MessageVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        message_id = self.kwargs.get('message_pk')
        return MessageVersion.objects.filter(
            message_id=message_id,
            message__conversation__user=self.request.user
        )

class MessageFileViewSet(viewsets.ModelViewSet):
    serializer_class = MessageFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MessageFile.objects.filter(message__conversation__user=self.request.user)
    
    @action(detail=False, methods=['POST'])
    def upload(self, request):
        message_id = request.data.get('message_id')
        files = request.FILES.getlist('files')
        
        try:
            message = Message.objects.get(id=message_id, conversation__user=request.user)
            
            file_records = []
            for file in files:
                # Save file to storage
                path = default_storage.save(f'message_files/{message.id}/{file.name}', ContentFile(file.read()))
                
                # Create file record
                file_record = MessageFile.objects.create(
                    message=message,
                    file_name=file.name,
                    file_path=path,
                    file_type=file.content_type,
                    file_size=file.size
                )
                file_records.append(file_record)
            
            return Response({"status": "success", "files": len(file_records)})
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_completion(request):
    message = request.data.get('message')
    conversation_id = request.data.get('conversation_id')
    is_edit = request.data.get('is_edit', False)
    previous_message_id = request.data.get('previous_message_id')
    system_prompt = request.data.get('system_prompt')  # Added system prompt
    
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
    formatted_messages = []
    
    # Add system prompt if provided
    if system_prompt:
        formatted_messages.append({"role": "system", "content": system_prompt})
    
    # Add conversation messages
    formatted_messages.extend([{"role": msg.role, "content": msg.content} for msg in messages])
    
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def raggie_ai_chat(request):
    message = request.data.get('message')
    conversation_id = request.data.get('conversation_id')
    file_ids = request.data.get('file_ids', [])
    model = request.data.get('model', 'gpt-4-vision-preview')
    raggie_api_key = request.data.get('api_key')
    
    if not raggie_api_key:
        return Response({"error": "Raggie AI API key not provided"}, status=400)
    
    # Get conversation
    conversation = Conversation.objects.get(id=conversation_id, user=request.user)
    
    # Format messages for context
    messages = conversation.messages.all()
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
    
    # Call Raggie AI API
    try:
        raggie_response = requests.post(
            'https://api.raggieai.com/chat',
            json={
                'api_key': raggie_api_key,
                'message': message,
                'file_ids': file_ids,
                'model': model,
                'context': formatted_messages  # Optional: send conversation history
            },
            headers={'Content-Type': 'application/json'}
        )
        
        if raggie_response.status_code != 200:
            return Response({"error": f"Raggie AI error: {raggie_response.text}"}, status=500)
        
        response_data = raggie_response.json()
        ai_response = response_data.get('response')
        
        return Response({"response": ai_response})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def raggie_ai_upload(request):
    try:
        files = request.FILES.getlist('files')
        raggie_api_key = request.data.get('api_key')
        
        if not files:
            return Response({"error": "No files provided"}, status=400)
        
        if not raggie_api_key:
            return Response({"error": "Raggie AI API key not provided"}, status=400)
        
        # Prepare multipart form data
        form_data = {'api_key': raggie_api_key}
        files_dict = {}
        
        for i, file in enumerate(files):
            files_dict[f'file{i}'] = (file.name, file.read(), file.content_type)
        
        # Send to Raggie AI
        response = requests.post(
            'https://api.raggieai.com/upload',
            data=form_data,
            files=files_dict
        )
        
        if response.status_code != 200:
            return Response({"error": f"Raggie AI upload error: {response.text}"}, status=500)
        
        return Response(response.json())
    except Exception as e:
        return Response({"error": str(e)}, status=500)