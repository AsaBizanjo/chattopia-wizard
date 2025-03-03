// contexts/ChatContext.tsx
import React, { createContext, useContext, useState } from 'react';
import OpenAI from 'openai';
import { useEndpoint } from './EndpointContext';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { processFiles } from '@/utils/chatUtils';
import { ChatContextType, Conversation, Message, SavedPrompt } from '@/types/chat';

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

  const createNewConversation = () => {
    const now = Date.now();
    const newConversation: Conversation = {
      id: `conv_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Conversation',
      messages: [],
      createdAt: now,
      updatedAt: now
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    setEditingMessageId(null);
  };

  const deleteConversation = (id: string) => {
    try {
      // Remove the conversation from the conversations array
      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      // If the deleted conversation was the current one, clear it
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
      }
      
      // Reset editing state if needed
      setEditingMessageId(null);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
      throw error; // Re-throw to handle in the component
    }
  };

  const sendMessage = async (content: string, files: File[] = []) => {
    if (!currentConversation) {
      createNewConversation();
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const processedFiles = files.length > 0 ? await processFiles(files) : undefined;
      
      const userMessage: Message = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content,
        timestamp: Date.now(),
        files: processedFiles
      };
      
      const updatedConversation = {
        ...currentConversation!,
        messages: [...currentConversation!.messages, userMessage],
        updatedAt: Date.now()
      };
      
      setCurrentConversation(updatedConversation);
      setConversations(prev => 
        prev.map(conv => conv.id === updatedConversation.id ? updatedConversation : conv)
      );
      
      if (!activeEndpoint) {
        toast({
          title: "No API endpoint selected",
          description: "Please add and select an API endpoint to send messages.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const client = new OpenAI({
        baseURL: activeEndpoint.baseUrl,
        apiKey: activeEndpoint.apiKey,
        dangerouslyAllowBrowser: true,
      });

      const apiMessages: OpenAI.Chat.ChatCompletionMessage[] = updatedConversation.messages.map(msg => ({
        role: msg.role as OpenAI.Chat.ChatCompletionMessage['role'],
        content: msg.content
      }));

      const response = await client.chat.completions.create({
        model: activeEndpoint.model || 'gpt-3.5-turbo',
        messages: apiMessages,
      });

      const assistantMessage: Message = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: response.choices[0].message.content || '',
        timestamp: Date.now()
      };
      
      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage],
        title: updatedConversation.messages.length === 0 ? 
          content.slice(0, 30) + (content.length > 30 ? '...' : '') : 
          updatedConversation.title,
        updatedAt: Date.now()
      };
      
      setCurrentConversation(finalConversation);
      setConversations(prev => 
        prev.map(conv => conv.id === finalConversation.id ? finalConversation : conv)
      );

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = (id: string) => {
    if (!currentConversation) return;
    
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

  const updateMessage = async (id: string, content: string) => {
    if (!currentConversation) return;
    
    const messageIndex = currentConversation.messages.findIndex(msg => msg.id === id);
    if (messageIndex === -1) return;

    const updatedMessages = [...currentConversation.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content
    };

    // Remove all messages after the edited message
    const truncatedMessages = updatedMessages.slice(0, messageIndex + 1);
    
    const updatedConversation = {
      ...currentConversation,
      messages: truncatedMessages,
      updatedAt: Date.now()
    };
    
    setCurrentConversation(updatedConversation);
    setConversations(prev => 
      prev.map(conv => conv.id === currentConversation.id ? updatedConversation : conv)
    );
    
    setEditingMessageId(null);

    // Regenerate response
    await sendMessage(content);
  };

  const resendMessage = async (id: string) => {
    if (!currentConversation) return;
    
    const messageIndex = currentConversation.messages.findIndex(msg => msg.id === id);
    if (messageIndex === -1) return;

    const messageToResend = currentConversation.messages[messageIndex];
    
    // Remove all messages after the selected message
    const truncatedMessages = currentConversation.messages.slice(0, messageIndex);
    
    const updatedConversation = {
      ...currentConversation,
      messages: truncatedMessages,
      updatedAt: Date.now()
    };
    
    setCurrentConversation(updatedConversation);
    setConversations(prev => 
      prev.map(conv => conv.id === currentConversation.id ? updatedConversation : conv)
    );

    // Resend the message
    await sendMessage(messageToResend.content);
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
        selectConversation: (id: string) => {
          const conversation = conversations.find(conv => conv.id === id);
          if (conversation) {
            setCurrentConversation(conversation);
            setEditingMessageId(null);
          }
        },
        deleteConversation,
        sendMessage,
        deleteMessage,
        updateMessage,
        setEditingMessage: setEditingMessageId,
        cancelEditingMessage: () => setEditingMessageId(null),
        resendMessage,
        savePrompt: (name: string, content: string) => {
          const newPrompt: SavedPrompt = {
            id: `prompt_${Math.random().toString(36).substr(2, 9)}`,
            name,
            content,
            createdAt: Date.now()
          };
          setSavedPrompts(prev => [newPrompt, ...prev]);
        },
        deletePrompt: (id: string) => {
          setSavedPrompts(prev => prev.filter(prompt => prompt.id !== id));
        }
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

export default ChatContext;