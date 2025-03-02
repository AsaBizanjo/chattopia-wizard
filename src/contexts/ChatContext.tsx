
import React, { createContext, useContext, useState, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

type ChatContextType = {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  createNewConversation: () => void;
  selectConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations from localStorage on component mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    const currentId = localStorage.getItem('currentConversationId');
    
    if (savedConversations) {
      const parsedConversations = JSON.parse(savedConversations);
      setConversations(parsedConversations);
      
      if (currentId) {
        const current = parsedConversations.find((conv: Conversation) => conv.id === currentId);
        if (current) {
          setCurrentConversation(current);
        } else if (parsedConversations.length > 0) {
          setCurrentConversation(parsedConversations[0]);
        }
      } else if (parsedConversations.length > 0) {
        setCurrentConversation(parsedConversations[0]);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
    
    if (currentConversation) {
      localStorage.setItem('currentConversationId', currentConversation.id);
    }
  }, [conversations, currentConversation]);

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
  };

  const selectConversation = (id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setCurrentConversation(conversation);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentConversation) {
      createNewConversation();
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      // Create user message
      const userMessage: Message = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content,
        timestamp: Date.now()
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
      
      // In a real implementation, this would be an API call to your backend
      // For now, simulate a response after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create assistant message (mock response)
      const assistantMessage: Message = {
        id: `msg_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: getMockResponse(content),
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
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    if (currentConversation?.id === id) {
      const remaining = conversations.filter(conv => conv.id !== id);
      setCurrentConversation(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Helper function to generate mock responses
  const getMockResponse = (message: string): string => {
    const responses = [
      `I understand you're asking about "${message.slice(0, 20)}...". This is a placeholder response since the backend is not yet connected.`,
      `Thanks for your message. Once the Django backend is implemented, you'll get meaningful responses here.`,
      `This is a frontend simulation. Your actual query about "${message.slice(0, 20)}..." will be processed by the OpenAI API when the backend is connected.`,
      `I've received your message. This is a placeholder response until the OpenAI integration is implemented on the backend.`,
      `In the complete application, your query would be sent to the language model. For now, this is just a simulated response.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        isLoading,
        error,
        createNewConversation,
        selectConversation,
        sendMessage,
        deleteConversation
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
