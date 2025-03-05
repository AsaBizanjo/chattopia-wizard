# chat/views.py
from django.http import JsonResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Conversation, Message, MessageFile, MessageVersion, DocumentChunk
from .serializers import ConversationSerializer, MessageSerializer, MessageVersionSerializer, MessageFileSerializer
import openai
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import connection
import os
import json
import numpy as np
from typing import List, Dict, Any
from django.shortcuts import get_object_or_404
from pgvector.django import L2Distance
from django.db.models import F
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user).order_by('-updated_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(data=request.data)
        
        if serializer.is_valid():
            message = serializer.save(conversation=conversation)
            conversation.save(update_fields=['updated_at'])
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def clear_history(self, request, pk=None):
        conversation = self.get_object()
        conversation.messages.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Message.objects.filter(conversation__user=self.request.user)
    
    def perform_create(self, serializer):
        message = serializer.save()
        message.conversation.save(update_fields=['updated_at'])
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Store current version
        MessageVersion.objects.create(
            message=instance,
            content=instance.content
        )
        
        # Update message
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Update conversation timestamp
        instance.conversation.save(update_fields=['updated_at'])
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        conversation = instance.conversation
        
        # If this is a user message, also delete the next assistant message if it exists
        if instance.role == 'user':
            next_message = conversation.messages.filter(
                created_at__gt=instance.created_at
            ).first()
            if next_message and next_message.role == 'assistant':
                next_message.delete()
        
        self.perform_destroy(instance)
        conversation.save(update_fields=['updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['GET'])
    def versions(self, request, pk=None):
        message = self.get_object()
        versions = message.versions.all()
        serializer = MessageVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['POST'])
    def regenerate(self, request, pk=None):
        message = self.get_object()
        conversation = message.conversation
        
        # Get all messages up to this one
        previous_messages = conversation.messages.filter(
            created_at__lte=message.created_at
        ).order_by('created_at')
        
        # Format messages for AI
        formatted_messages = []
        for msg in previous_messages:
            formatted_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Get endpoint settings from request
        endpoint_base_url = request.data.get('endpoint_base_url')
        endpoint_api_key = request.data.get('endpoint_api_key')
        endpoint_model = request.data.get('endpoint_model', 'gpt-4')
        
        try:
            # Configure OpenAI client
            client = openai.OpenAI(
                base_url=endpoint_base_url,
                api_key=endpoint_api_key
            )
            
            # Get new response
            response = client.chat.completions.create(
                model=endpoint_model,
                messages=formatted_messages
            )
            
            new_content = response.choices[0].message.content
            
            # Update the message
            message.content = new_content
            message.save()
            
            return Response({
                "status": "success",
                "content": new_content
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MessageVersionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MessageVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MessageVersion.objects.filter(
            message__conversation__user=self.request.user
        ).order_by('-created_at')

class MessageFileViewSet(viewsets.ModelViewSet):
    serializer_class = MessageFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MessageFile.objects.filter(message__conversation__user=self.request.user)
    
    @action(detail=False, methods=['POST'])
    def upload(self, request):
        message_id = request.data.get('message_id')
        files = request.FILES.getlist('files')
        endpoint_base_url = request.data.get('endpoint_base_url')
        endpoint_api_key = request.data.get('endpoint_api_key')
        
        try:
            message = Message.objects.get(id=message_id, conversation__user=request.user)
            file_records = []
            chunks_processed = 0
            
            client = openai.OpenAI(
                base_url=endpoint_base_url,
                api_key=endpoint_api_key
            )
            
            for file in files:
                # Save file
                path = default_storage.save(
                    f'message_files/{message.id}/{file.name}',
                    ContentFile(file.read())
                )
                
                file_record = MessageFile.objects.create(
                    message=message,
                    file_name=file.name,
                    file_path=path,
                    file_type=file.content_type,
                    file_size=file.size
                )
                
                # Process file content
                with default_storage.open(path) as f:
                    text_content = f.read().decode('utf-8')
                
                # Create chunks with overlap
                chunk_size = 1000
                overlap = 100
                text_chunks = []
                for i in range(0, len(text_content), chunk_size - overlap):
                    chunk = text_content[i:i + chunk_size]
                    if chunk:
                        text_chunks.append(chunk)
                
                # Batch process embeddings
                batch_size = 10
                for i in range(0, len(text_chunks), batch_size):
                    batch = text_chunks[i:i + batch_size]
                    try:
                        # Get embeddings for batch
                        embedding_response = client.embeddings.create(
                            model="text-embedding-3-large",
                            input=batch
                        )
                        
                        # Create chunks with embeddings
                        for j, (chunk, embedding_data) in enumerate(zip(batch, embedding_response.data)):
                            DocumentChunk.objects.create(
                                file=file_record,
                                content=chunk,
                                embedding=embedding_data.embedding,
                                metadata={
                                    'source': file.name,
                                    'chunk_index': i + j,
                                    'position': i + j * (chunk_size - overlap)
                                }
                            )
                            chunks_processed += 1
                            
                    except Exception as e:
                        print(f"Error processing batch {i//batch_size} of {file.name}: {str(e)}")
                        continue
                
                file_records.append(file_record)
            
            return Response({
                "status": "success",
                "files": len(file_records),
                "chunks_processed": chunks_processed
            })
            
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_completion(request):
    try:
        message = request.data.get('message')
        conversation_id = request.data.get('conversation_id')
        endpoint_base_url = request.data.get('endpoint_base_url')
        endpoint_api_key = request.data.get('endpoint_api_key')
        endpoint_model = request.data.get('endpoint_model', 'gpt-4')
        use_context = request.data.get('use_context', False)

        conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
        messages = conversation.messages.all()
        formatted_messages = []
        
        if use_context:
            try:
                client = openai.OpenAI(
                    base_url=endpoint_base_url,
                    api_key=endpoint_api_key
                )

                # Get query embedding
                embedding_response = client.embeddings.create(
                    model="text-embedding-3-large",
                    input=message
                )
                query_embedding = embedding_response.data[0].embedding

                # Vector similarity search using L2Distance
                relevant_chunks = DocumentChunk.objects.annotate(
                    distance=L2Distance('embedding', query_embedding)
                ).filter(
                    file__message__conversation_id=conversation_id,
                    distance__lte=1.0  # Adjust threshold as needed
                ).order_by('distance')[:5]

                if relevant_chunks.exists():
                    context = "\n\n".join([
                        f"[Source: {chunk.metadata.get('source', 'Unknown')}, "
                        f"Distance: {chunk.distance:.4f}]\n{chunk.content}"
                        for chunk in relevant_chunks
                    ])
                    context_prompt = f"""Use the following relevant context to answer the user's question. this context is drived from a pdf given by the user:

Context:
{context}

Answer the question based on the context above. If the context doesn't contain sufficient information, use your general knowledge but mention this fact."""
                    formatted_messages.append({"role": "system", "content": context_prompt})
                else:
                    formatted_messages.append({
                        "role": "system", 
                        "content": "No relevant context found. Answering based on general knowledge."
                    })

            except Exception as context_error:
                print(f"Error during context retrieval: {str(context_error)}")
                formatted_messages.append({
                    "role": "system", 
                    "content": "Context retrieval failed. Answering based on general knowledge."
                })

        # Add conversation history and new message
        formatted_messages.extend([
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ])
        formatted_messages.append({"role": "user", "content": message})

        # Get completion
        client = openai.OpenAI(
            base_url=endpoint_base_url,
            api_key=endpoint_api_key
        )
        
        response = client.chat.completions.create(
            model=endpoint_model,
            messages=formatted_messages
        )
        
        ai_response = response.choices[0].message.content

        return Response({
            "response": ai_response,
            "used_context": use_context and relevant_chunks.exists()
        })

    except Exception as e:
        print(f"Error in chat completion: {str(e)}")
        return Response(
            {
                "error": "Failed to get response from AI service",
                "details": str(e)
            },
            status=500
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_context(request):
    try:
        query = request.data.get('query')
        n_results = request.data.get('n_results', 5)
        max_distance = request.data.get('max_distance', 1.0)  # Threshold for L2 distance
        endpoint_base_url = request.data.get('endpoint_base_url')
        endpoint_api_key = request.data.get('endpoint_api_key')
        
        if not query:
            return Response({"error": "No query provided"}, status=400)
        
        client = openai.OpenAI(
            base_url=endpoint_base_url,
            api_key=endpoint_api_key
        )
        
        # Get embedding for query
        embedding_response = client.embeddings.create(
            model="text-embedding-3-large",
            input=query
        )
        query_embedding = embedding_response.data[0].embedding
        
        # Vector search with L2Distance
        results = DocumentChunk.objects.annotate(
            distance=L2Distance('embedding', query_embedding)
        ).filter(
            distance__lte=max_distance
        ).order_by('distance')[:n_results]
        
        return Response({
            "results": [
                {
                    "text": chunk.content,
                    "metadata": chunk.metadata,
                    "distance": float(chunk.distance),
                    "source": chunk.metadata.get('source', 'Unknown'),
                    "chunk_index": chunk.metadata.get('chunk_index', 0)
                }
                for chunk in results
            ],
            "total_results": results.count()
        })
    except Exception as e:
        print(f"Search context error: {str(e)}")
        return Response({"error": str(e)}, status=500)
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fork_conversation(request, conversation_id):
    try:
        # Get original conversation
        original_conv = get_object_or_404(
            Conversation,
            id=conversation_id,
            user=request.user
        )
        
        # Create new conversation
        new_conv = Conversation.objects.create(
            user=request.user,
            title=f"Fork of {original_conv.title}"
        )
        
        # Copy messages
        for message in original_conv.messages.all():
            Message.objects.create(
                conversation=new_conv,
                role=message.role,
                content=message.content
            )
        
        serializer = ConversationSerializer(new_conv)
        return Response(serializer.data)
    
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rename_conversation(request, conversation_id):
    try:
        conversation = get_object_or_404(
            Conversation,
            id=conversation_id,
            user=request.user
        )
        
        new_title = request.data.get('title')
        if not new_title:
            return Response(
                {"error": "Title is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        conversation.title = new_title
        conversation.save()
        
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)
    
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    

from openai import OpenAI

@csrf_exempt
@require_POST
def fetch_models(request):
    try:
        # Parse request body
        data = json.loads(request.body)
        api_url = data.get('apiUrl')
        api_key = data.get('apiKey')
        
        # Validate inputs
        if not api_url or not api_key:
            return JsonResponse({
                'success': False,
                'error': 'API URL and API key are required'
            }, status=400)
        
        # Create OpenAI client with the provided API URL and key
        client = OpenAI(
            api_key=api_key,
            base_url=api_url,
            max_retries=0,
            timeout=100
        )
        
        # Fetch models using the client
        model_list = client.models.list()
        
        # Extract model IDs
        model_ids = [model.id for model in model_list.data]
        
        return JsonResponse({
            'success': True,
            'models': model_ids
        })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)