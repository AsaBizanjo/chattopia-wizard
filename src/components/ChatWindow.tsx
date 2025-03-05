// ChatWindow.tsx
import React, { useRef, useEffect } from 'react';
import Message from './Message';
import ChatInput from './ChatInput';
import { useChat } from '@/contexts/ChatContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import NewChatButton from './NewChatButton';
import { useSidebar } from '@/contexts/SideBarContext';
import { AnimatePresence, motion } from 'framer-motion';

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
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [
    currentConversation?.messages, 
    isLoading,
    currentConversation?.id
  ]);

  if (!currentConversation) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`flex flex-col h-screen items-center justify-center p-4 sm:p-8 text-center transition-all duration-300 ease-in-out ${
          isCollapsed 
            ? 'ml-0 md:ml-[60px]' 
            : 'ml-0 md:ml-[300px]'
        }`}
      >
        <div className="w-full max-w-md mx-auto px-4 backdrop-blur-sm bg-background/50 p-8 rounded-2xl shadow-lg border border-border/30">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Welcome to ChatLLM</h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            Start a new conversation to begin chatting with the AI assistant.
          </p>
          <NewChatButton className="w-full py-3 rounded-xl text-base font-medium transition-all hover:shadow-md" />
        </div>
      </motion.div>
    );
  }

  return (
    <div 
      className={`flex flex-col h-screen transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'ml-0 md:ml-[60px]' 
          : 'ml-0 md:ml-[300px]'
      }`}
    >
      <div className="flex-grow relative">
        <ScrollArea className="h-full pb-4">
          <AnimatePresence>
            <div className="px-2 sm:px-6 md:px-8 lg:px-12 max-w-5xl mx-auto">
              {currentConversation.messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Message
                    id={message.id}
                    role={message.role}
                    content={message.content}
                    isLast={index === currentConversation.messages.length - 1 && isLoading}
                    files={message.files}
                  />
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </AnimatePresence>
        </ScrollArea>
      </div>
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border/30 pt-4 pb-6 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full">
        <ChatInput 
          editingMessageId={editingMessageId} 
          initialContent={editingMessageContent}
          onCancelEdit={cancelEditingMessage}
        />
      </div>
    </div>
  );
};

export default ChatWindow;