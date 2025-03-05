# chats/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import (
    ConversationViewSet, MessageViewSet, MessageVersionViewSet, 
    MessageFileViewSet, chat_completion, search_context, fork_conversation, rename_conversation,fetch_models
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
    path('search-context/', search_context, name='search-context'),
    path('conversations/<int:conversation_id>/fork/', fork_conversation, name='fork-conversation'),
    path('conversations/<int:conversation_id>/rename/',rename_conversation, name='rename-conversation'),
    path('api/fetch-models/', fetch_models, name='fetch_models'),

]