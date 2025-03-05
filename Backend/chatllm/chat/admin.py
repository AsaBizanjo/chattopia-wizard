from django.contrib import admin
from .models import Message, MessageFile, MessageVersion, Conversation, DocumentChunk

admin.site.register(MessageVersion)
admin.site.register(Message)
admin.site.register(MessageFile)
admin.site.register(Conversation)
admin.site.register(DocumentChunk)
