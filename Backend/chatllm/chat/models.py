# chats/models.py
from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from pgvector.django import VectorField
from pgvector.django import IvfflatIndex

class Conversation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

class Message(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    has_context = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

class MessageVersion(models.Model):
    message = models.ForeignKey(Message, related_name='versions', on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

class MessageFile(models.Model):
    message = models.ForeignKey(Message, related_name='files', on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255, default='')
    file_path = models.CharField(max_length=255, default='')
    file_type = models.CharField(max_length=100, default='')
    file_size = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

class DocumentChunk(models.Model):
    file = models.ForeignKey('MessageFile', related_name='chunks', on_delete=models.CASCADE)
    content = models.TextField()
    embedding = VectorField(dimensions=1536)  # For text-embedding-3-large
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['file']),
            IvfflatIndex(
                name='document_chunk_embedding_idx',  # Added name for the index
                fields=['embedding'], 
                lists=100,
                opclasses=['vector_cosine_ops']
            )
        ]