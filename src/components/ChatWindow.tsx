import React, { useRef, useEffect } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import NewChatButton from './NewChatButton';
import { useSidebar } from '@/contexts/SideBarContext';

const ChatWindow: React.FC = () => {
  const { 
    currentConversation, 
    isLoading, 
    editingMessageId, 
    cancelEditingMessage 
  } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isCollapsed } = useSidebar();
  
  const editingMessageContent = editingMessageId && currentConversation
    ? currentConversation.messages.find(msg => msg.id === editingMessageId)?.content || ''
    : '';
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Scroll when messages change or loading state changes
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [
    currentConversation?.messages, 
    isLoading,
    currentConversation?.id
  ]);

  if (!currentConversation) {
    return (
      <div 
        className={`flex flex-col h-screen items-center justify-center p-8 text-center transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-[60px]' : 'ml-[300px]'
        }`}
      >
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
    <div 
      className={`flex flex-col h-screen transition-all duration-300 ease-in-out ${
        isCollapsed ? 'ml-[60px]' : 'ml-[300px]'
      }`}
    >
      <div className="flex-grow relative">
        <ScrollArea className="h-full pb-4">
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
            <div ref={messagesEndRef} /> {/* Add this invisible div at the end */}
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