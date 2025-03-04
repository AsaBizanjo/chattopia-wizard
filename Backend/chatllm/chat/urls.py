# chats/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import (
    ConversationViewSet, MessageViewSet, MessageVersionViewSet, 
    MessageFileViewSet, chat_completion, raggie_ai_chat, raggie_ai_upload
)

# Main router
router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'message-files', MessageFileViewSet, basename='message-file')

# Nested router for message versions
message_router = routers.NestedSimpleRouter(router, r'messages', lookup='message')
message_router.register(r'versions', MessageVersionViewSet, basename='message-versions')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(message_router.urls)),  # Include the nested router URLs
    path('chat-completion/', chat_completion, name='chat-completion'),
    path('raggie-ai-chat/', raggie_ai_chat, name='raggie-ai-chat'),
    path('raggie-ai-upload/', raggie_ai_upload, name='raggie-ai-upload'),
]