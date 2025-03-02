import React, { useRef, useEffect } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import NewChatButton from './NewChatButton';

const ChatWindow: React.FC = () => {
  const { 
    currentConversation, 
    isLoading, 
    editingMessageId, 
    cancelEditingMessage 
  } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Find the message content if we're editing
  const editingMessageContent = editingMessageId && currentConversation
    ? currentConversation.messages.find(msg => msg.id === editingMessageId)?.content || ''
    : '';
  
  // Improved scroll to bottom functionality
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    
    // Scroll immediately when messages change
    scrollToBottom();
    
    // Also set a small timeout to ensure content is fully rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [
    currentConversation?.messages, 
    editingMessageId, 
    isLoading,
    currentConversation?.id // Also scroll when changing conversations
  ]);

  if (!currentConversation) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-8 text-center">
        <div className="max-w-md mx-auto animate-fade-in">
          <h2 className="text-2xl font-semibold mb-3">Welcome to ChatLLM</h2>
          <p className="text-muted-foreground mb-6">
            Start a new conversation to begin chatting with the AI assistant.
          </p>
          <NewChatButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-grow relative">
        <ScrollArea className="h-full pb-4" ref={scrollRef}>
          <div className="divide-y divide-border/50">
            {currentConversation.messages.map((message, index) => (
              <Message
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
                isLast={index === currentConversation.messages.length - 1 && isLoading}
                files={message.files}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
      <ChatInput 
        editingMessageId={editingMessageId} 
        initialContent={editingMessageContent}
        onCancelEdit={cancelEditingMessage}
      />
    </div>
  );
};

export default ChatWindow;
