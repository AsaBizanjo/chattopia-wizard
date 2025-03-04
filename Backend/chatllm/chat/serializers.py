# chats/serializers.py
from rest_framework import serializers
from .models import Conversation, Message, MessageFile, MessageVersion

class MessageFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageFile
        fields = ['id', 'file', 'filename']

class MessageSerializer(serializers.ModelSerializer):
    files = MessageFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at', 'files']

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'created_at', 'updated_at', 'messages']


class MessageVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageVersion
        fields = ['id', 'content', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    versions = MessageVersionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at', 'versions']
        
class MessageFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageFile
        fields = ['id', 'message', 'file_name', 'file_path', 'file_type', 'file_size', 'created_at']
        read_only_fields = ['created_at']