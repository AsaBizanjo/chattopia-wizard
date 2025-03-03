// ChatContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useEndpoint } from './EndpointContext';

// Define the type for your context
interface ChatContextType {
  conversations: any[];
  currentConversation: any | null;
  isLoading: boolean;
  editingMessageId: string | null;
  savedPrompts: any[];
  createNewConversation: () => Promise<any>;
  sendMessage: (content: string, files?: any[]) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setEditingMessage: (messageId: string, content: string) => void;
  cancelEditingMessage: () => void;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  resendMessage: (messageId: string) => Promise<void>;
  savePrompt: (name: string, content: string) => void;
  deletePrompt: (id: string) => void;
}

// Create the context with a default value
const ChatContext = createContext<ChatContextType>({
  conversations: [],
  currentConversation: null,
  isLoading: false,
  editingMessageId: null,
  savedPrompts: [],
  createNewConversation: async () => ({}),
  sendMessage: async () => {},
  selectConversation: async () => {},
  deleteConversation: async () => {},
  setEditingMessage: () => {},
  cancelEditingMessage: () => {},
  updateMessage: async () => {},
  deleteMessage: async () => {},
  resendMessage: async () => {},
  savePrompt: () => {},
  deletePrompt: () => {},
});

// Set the base URL for axios and configure authentication
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true; // This allows cookies to be sent with requests

// Add an interceptor to include auth tokens with every request
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log("Token exists:", !!localStorage.getItem('token'));
    console.log("Full request config:", config);
    if (token) {
      // Changed from Bearer to Token to match Django's expected format
      config.headers.Authorization = `Token ${token}`;
    }
    // Add these headers
    config.headers['Content-Type'] = 'application/json';
    config.headers['Accept'] = 'application/json';
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for more error details
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("Full error response:", error.response);
    return Promise.reject(error);
  }
);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  
  // Get endpoint information
  const endpointContext = useEndpoint();

  // Load saved prompts from localStorage on component mount
  useEffect(() => {
    const storedPrompts = localStorage.getItem('savedPrompts');
    if (storedPrompts) {
      try {
        setSavedPrompts(JSON.parse(storedPrompts));
      } catch (e) {
        console.error('Error parsing saved prompts:', e);
        setSavedPrompts([]);
      }
    }
  }, []);

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/chats/conversations/');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Initialize with empty array on error
      setConversations([]);
    }
  };

  const createNewConversation = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/chats/conversations/', {
        title: 'New Conversation'
      });
      const newConversation = response.data;
      setConversations([newConversation, ...conversations]);
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error.response?.status, error.response?.data);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, files: any[] = []) => {
    let currentConv = currentConversation;
    if (!currentConv) {
      currentConv = await createNewConversation();
      if (!currentConv) return; // Handle case where conversation creation fails
    }
    
    setIsLoading(true);
    
    try {
      // Add user message
      const userMessageResponse = await axios.post(
        `/api/chats/conversations/${currentConv.id}/add_message/`,
        { role: 'user', content }
      );
      
      // Handle file uploads if needed
      if (files.length > 0) {
        // Implement file upload logic
      }
      
      // Fetch updated conversation to get the new message
      const updatedConversation = await axios.get(`/api/chats/conversations/${currentConv.id}/`);
      setCurrentConversation(updatedConversation.data);
      
      // Send to AI and get response using the active endpoint
      const aiResponse = await axios.post('/api/chats/chat-completion/', { 
        message: content,
        conversation_id: currentConv.id,
        endpoint_id: endpointContext.activeEndpoint?.id,
        endpoint_base_url: endpointContext.activeEndpoint?.baseUrl,
        endpoint_api_key: endpointContext.activeEndpoint?.apiKey,
        endpoint_model: endpointContext.activeEndpoint?.model
      });
      
      // Add AI response to conversation
      await axios.post(
        `/api/chats/conversations/${currentConv.id}/add_message/`,
        { role: 'assistant', content: aiResponse.data.response }
      );
      
      // Fetch final updated conversation
      const finalConversation = await axios.get(`/api/chats/conversations/${currentConv.id}/`);
      setCurrentConversation(finalConversation.data);
      
      // Update conversations list
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = async (conversationId: string) => {
    try {
      const response = await axios.get(`/api/chats/conversations/${conversationId}/`);
      setCurrentConversation(response.data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await axios.delete(`/api/chats/conversations/${conversationId}/`);
      setConversations(conversations.filter(conv => conv.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Added for Message component
  const setEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
  };

  const updateMessage = async (messageId: string, content: string) => {
    if (!messageId || !content.trim()) return;
    
    try {
      // Update the message in the backend
      const response = await axios.patch(`/api/chats/messages/${messageId}/`, {
        content: content
      });
      
      // Update the local state
      if (currentConversation) {
        const updatedMessages = currentConversation.messages.map((msg: any) => 
          msg.id === messageId ? { ...msg, content } : msg
        );
        
        setCurrentConversation({
          ...currentConversation,
          messages: updatedMessages
        });
        
        // If this was an edit of a user message, we might need to regenerate the AI response
        const editedMessage = currentConversation.messages.find((msg: any) => msg.id === messageId);
        if (editedMessage && editedMessage.role === 'user') {
          // Find the next message - if it's an assistant message, regenerate it
          const messageIndex = currentConversation.messages.findIndex((msg: any) => msg.id === messageId);
          const nextMessage = currentConversation.messages[messageIndex + 1];
          
          if (nextMessage && nextMessage.role === 'assistant') {
            // Regenerate AI response
            setIsLoading(true);
            
            try {
              // Get AI response for the edited message with endpoint information
              const aiResponse = await axios.post('/api/chats/chat-completion/', { 
                message: content,
                conversation_id: currentConversation.id,
                is_edit: true,
                previous_message_id: messageId,
                endpoint_id: endpointContext.activeEndpoint?.id,
                endpoint_base_url: endpointContext.activeEndpoint?.baseUrl,
                endpoint_api_key: endpointContext.activeEndpoint?.apiKey,
                endpoint_model: endpointContext.activeEndpoint?.model
              });
              
              // Update the AI response
              await axios.patch(`/api/chats/messages/${nextMessage.id}/`, {
                content: aiResponse.data.response
              });
              
              // Fetch the updated conversation
              const updatedConversation = await axios.get(`/api/chats/conversations/${currentConversation.id}/`);
              setCurrentConversation(updatedConversation.data);
            } catch (error) {
              console.error('Error regenerating AI response:', error);
            } finally {
              setIsLoading(false);
            }
          }
        }
      }
      
      // Reset editing state
      setEditingMessageId(null);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  // Added for Message component
 // Modified deleteMessage function
const deleteMessage = async (messageId: string) => {
  if (!currentConversation) return;
  
  try {
    // Find the index of the message to be deleted
    const messageIndex = currentConversation.messages.findIndex((msg: any) => msg.id === messageId);
    if (messageIndex === -1) return;
    
    // Get the message to check if it's a user message
    const message = currentConversation.messages[messageIndex];
    
    // Delete the current message
    await axios.delete(`/api/chats/messages/${messageId}/`);
    
    // If it's a user message and there's a next message from assistant, delete that too
    if (message.role === 'user' && 
        messageIndex + 1 < currentConversation.messages.length && 
        currentConversation.messages[messageIndex + 1].role === 'assistant') {
      
      const assistantMessageId = currentConversation.messages[messageIndex + 1].id;
      await axios.delete(`/api/chats/messages/${assistantMessageId}/`);
      
      // Update local state - remove both messages
      setCurrentConversation({
        ...currentConversation,
        messages: currentConversation.messages.filter((msg: any) => 
          msg.id !== messageId && msg.id !== assistantMessageId
        )
      });
    } else {
      // Just remove the single message
      setCurrentConversation({
        ...currentConversation,
        messages: currentConversation.messages.filter((msg: any) => msg.id !== messageId)
      });
    }
    
    // Update conversations list
    fetchConversations();
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

  // Added for Message component
  const resendMessage = async (messageId: string) => {
    if (!currentConversation) return;
    
    // Find the message to resend
    const message = currentConversation.messages.find((msg: any) => msg.id === messageId);
    if (!message || message.role !== 'user') return;
    
    // Resend the message content
    await sendMessage(message.content);
  };

  // Added for PromptLibrary component
  const savePrompt = (name: string, content: string) => {
    const newPrompt = {
      id: Date.now().toString(),
      name,
      content
    };
    const updatedPrompts = [newPrompt, ...savedPrompts];
    setSavedPrompts(updatedPrompts);
    
    // Save to localStorage
    localStorage.setItem('savedPrompts', JSON.stringify(updatedPrompts));
  };

  // Added for PromptLibrary component
  const deletePrompt = (id: string) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
    setSavedPrompts(updatedPrompts);
    
    // Update localStorage
    localStorage.setItem('savedPrompts', JSON.stringify(updatedPrompts));
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        isLoading,
        editingMessageId,
        savedPrompts,
        createNewConversation,
        sendMessage,
        selectConversation,
        deleteConversation,
        setEditingMessage,
        cancelEditingMessage,
        updateMessage,
        deleteMessage,
        resendMessage,
        savePrompt,
        deletePrompt
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);