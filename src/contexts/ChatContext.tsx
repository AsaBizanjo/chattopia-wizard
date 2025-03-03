
import React, { createContext, useContext, useState } from 'react';
import { useEndpoint } from './EndpointContext';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { processFiles, getMockResponse } from '@/utils/chatUtils';
import { 
  ChatContextType, 
  Conversation, 
  Message, 
  SavedPrompt 
} from '@/types/chat';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    conversations, setConversations,
    currentConversation, setCurrentConversation,
    savedPrompts, setSavedPrompts
  } = useLocalStorage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const { activeEndpoint } = useEndpoint();
  const { toast } = useToast();

  // Create a new conversation
  const createNewConversation = () => {
    const now = Date.now();
    const newConversation: Conversation = {
      id: `conv_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Conversation',
      messages: [
        {
          id: `msg_${Math.random().toString(36).substr(2, 9)}`,
          role: 'system',
          content: 'How can I help you today?',
          timestamp: now
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    setEditingMessageId(null);
  };

  // Select an existing conversation
  const selectConversation = (id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setCurrentConversation(conversation);
      setEditingMessageId(null);
    }
  };

  // Send a message
  const sendMessage = async (content: string, files: File[] = []) => {
    if (!currentConversation) {
      createNewConversation();
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      // Process any file attachments
      const processedFiles = files.length > 0 ? await processFiles(files) : undefined;
      
      // Create user message
      const userMessage: Message = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content,
        timestamp: Date.now(),
        files: processedFiles
      };
      
      // Update the conversation with the user message
      const updatedConversation = {
        ...currentConversation!,
        messages: [...currentConversation!.messages, userMessage],
        updatedAt: Date.now()
      };
      
      // Update state to show user message immediately
      setCurrentConversation(updatedConversation);
      setConversations(prev => 
        prev.map(conv => conv.id === updatedConversation.id ? updatedConversation : conv)
      );
      
      // If no active endpoint is selected, show a warning
      if (!activeEndpoint) {
        toast({
          title: "No API endpoint selected",
          description: "Please add and select an API endpoint to send messages.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // In a real implementation, this would be an API call to your backend
      // For now, simulate a response after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create assistant message (mock response)
      const assistantMessage: Message = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: getMockResponse(content, activeEndpoint.name),
        timestamp: Date.now()
      };
      
      // Update the conversation with the assistant message
      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage],
        title: updatedConversation.messages.length <= 2 ? 
          content.slice(0, 30) + (content.length > 30 ? '...' : '') : 
          updatedConversation.title,
        updatedAt: Date.now()
      };
      
      // Update state to show assistant message
      setCurrentConversation(finalConversation);
      setConversations(prev => 
        prev.map(conv => conv.id === finalConversation.id ? finalConversation : conv)
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a conversation
  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    if (currentConversation?.id === id) {
      const remaining = conversations.filter(conv => conv.id !== id);
      setCurrentConversation(remaining.length > 0 ? remaining[0] : null);
      setEditingMessageId(null);
    }
  };
  
  // Delete a specific message
  const deleteMessage = (id: string) => {
    if (!currentConversation) return;
    
    // Don't delete the system message
    const isSystemMessage = currentConversation.messages.find(msg => msg.id === id)?.role === 'system';
    if (isSystemMessage) {
      toast({
        description: "System messages cannot be deleted.",
      });
      return;
    }
    
    const updatedMessages = currentConversation.messages.filter(msg => msg.id !== id);
    const updatedConversation = {
      ...currentConversation,
      messages: updatedMessages,
      updatedAt: Date.now()
    };
    
    setCurrentConversation(updatedConversation);
    setConversations(prev => 
      prev.map(conv => conv.id === currentConversation.id ? updatedConversation : conv)
    );
    
    if (editingMessageId === id) {
      setEditingMessageId(null);
    }
  };
  
  // Update a message's content
  const updateMessage = (id: string, content: string) => {
    if (!currentConversation) return;
    
    const updatedMessages = currentConversation.messages.map(msg => 
      msg.id === id ? { ...msg, content } : msg
    );
    
    const updatedConversation = {
      ...currentConversation,
      messages: updatedMessages,
      updatedAt: Date.now()
    };
    
    setCurrentConversation(updatedConversation);
    setConversations(prev => 
      prev.map(conv => conv.id === currentConversation.id ? updatedConversation : conv)
    );
    
    setEditingMessageId(null);
  };
  
  // Set a message for editing
  const setEditingMessage = (id: string) => {
    setEditingMessageId(id);
  };
  
  // Cancel editing
  const cancelEditingMessage = () => {
    setEditingMessageId(null);
  };
  
  // Resend a message
  const resendMessage = (id: string) => {
    if (!currentConversation) return;
    
    const messageToResend = currentConversation.messages.find(msg => msg.id === id);
    if (!messageToResend) return;
    
    // If we're resending the last user message, just send it again
    if (messageToResend.role === 'user') {
      sendMessage(messageToResend.content);
    }
  };

  // Save a new prompt
  const savePrompt = (name: string, content: string) => {
    const newPrompt: SavedPrompt = {
      id: `prompt_${Math.random().toString(36).substr(2, 9)}`,
      name,
      content,
      createdAt: Date.now()
    };
    
    setSavedPrompts(prev => [newPrompt, ...prev]);
    
    toast({
      title: "Prompt saved",
      description: `"${name}" has been saved to your prompts.`
    });
  };

  // Delete a prompt
  const deletePrompt = (id: string) => {
    setSavedPrompts(prev => prev.filter(prompt => prompt.id !== id));
    
    toast({
      title: "Prompt deleted",
      description: "The prompt has been removed from your list."
    });
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        isLoading,
        error,
        editingMessageId,
        savedPrompts,
        createNewConversation,
        selectConversation,
        sendMessage,
        deleteConversation,
        deleteMessage,
        updateMessage,
        setEditingMessage,
        cancelEditingMessage,
        resendMessage,
        savePrompt,
        deletePrompt
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
