
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useEndpoint } from './EndpointContext';
import { useToast } from '@/hooks/use-toast';

type FileAttachment = {
  name: string;
  type: string;
  url: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: FileAttachment[];
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
  editingMessageId: string | null;
  createNewConversation: () => void;
  selectConversation: (id: string) => void;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  deleteConversation: (id: string) => void;
  deleteMessage: (id: string) => void;
  updateMessage: (id: string, content: string) => void;
  setEditingMessage: (id: string) => void;
  cancelEditingMessage: () => void;
  resendMessage: (id: string) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const { activeEndpoint } = useEndpoint();
  const { toast } = useToast();

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
    setEditingMessageId(null);
  };

  const selectConversation = (id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setCurrentConversation(conversation);
      setEditingMessageId(null);
    }
  };

  // Process and store file attachments
  const processFiles = (files: File[]): Promise<FileAttachment[]> => {
    return Promise.all(
      files.map(file => {
        return new Promise<FileAttachment>((resolve) => {
          const reader = new FileReader();
          
          reader.onloadend = () => {
            resolve({
              name: file.name,
              type: file.type,
              url: reader.result as string
            });
          };
          
          if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
          } else {
            // For PDFs and other files, just store the name for now
            // In a real app, you'd upload these to a server
            resolve({
              name: file.name,
              type: file.type,
              url: '#' // Placeholder URL
            });
          }
        });
      })
    );
  };

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

  // Helper function to generate mock responses
  const getMockResponse = (message: string, endpointName: string = 'Default'): string => {
    const responses = [
      `I understand you're asking about "${message.slice(0, 20)}...". This is a placeholder response from ${endpointName} since the backend is not yet connected.`,
      `Thanks for your message. Once the Django backend is implemented, you'll get meaningful responses here. Using ${endpointName} endpoint.`,
      `This is a frontend simulation. Your actual query about "${message.slice(0, 20)}..." will be processed by the OpenAI API when the backend is connected to ${endpointName}.`,
      `I've received your message. This is a placeholder response until the OpenAI integration is implemented on the backend. Selected endpoint: ${endpointName}`,
      `In the complete application, your query would be sent to the language model via ${endpointName}. For now, this is just a simulated response.`
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
        editingMessageId,
        createNewConversation,
        selectConversation,
        sendMessage,
        deleteConversation,
        deleteMessage,
        updateMessage,
        setEditingMessage,
        cancelEditingMessage,
        resendMessage
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
