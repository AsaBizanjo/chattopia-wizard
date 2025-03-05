
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useEndpoint } from './EndpointContext';


interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunk_index: number;
  };
}

interface ChatContextType {
  conversations: any[];
  currentConversation: any | null;
  isLoading: boolean;
  editingMessageId: string | null;
  savedPrompts: any[];
  messageVersions: Record<string, any[]>;
  createNewConversation: () => Promise<any>;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setEditingMessage: (messageId: string, content: string) => void;
  cancelEditingMessage: () => void;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  resendMessage: (messageId: string) => Promise<void>;
  savePrompt: (name: string, content: string) => void;
  deletePrompt: (id: string) => void;
  viewMessageVersions: (messageId: string) => Promise<void>;
  restoreMessageVersion: (messageId: string, versionId: string) => Promise<void>;
  forkConversationFromVersion: (messageId: string, versionId: string) => Promise<void>;
  renameConversation: (conversationId: string, newTitle: string) => Promise<void>;
  forkConversation: (conversationId: string) => Promise<void>;
}


const ChatContext = createContext<ChatContextType>({
  conversations: [],
  currentConversation: null,
  isLoading: false,
  editingMessageId: null,
  savedPrompts: [],
  messageVersions: {},
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
  viewMessageVersions: async () => {},
  restoreMessageVersion: async () => {},
  forkConversationFromVersion: async () => {},
  renameConversation: async () => {},
  forkConversation: async () => {},
});


axios.defaults.baseURL = 'https://172.187.232.176:5000'
axios.defaults.withCredentials = true;

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    config.headers['Accept'] = 'application/json';
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("Full error response:", error.response);
    return Promise.reject(error);
  }
);


const processFiles = async (files: File[], messageId: string, endpointBaseUrl: string, endpointApiKey: string): Promise<void> => {
  if (!files || files.length === 0) return;
  
  try {
    const formData = new FormData();
    formData.append('message_id', messageId);
    formData.append('endpoint_base_url', endpointBaseUrl);
    formData.append('endpoint_api_key', endpointApiKey);
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    await axios.post('/api/chats/message-files/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  } catch (error) {
    console.error('Error processing files:', error);
  }
};


export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  const [messageVersions, setMessageVersions] = useState<Record<string, any[]>>({});
  
  const endpointContext = useEndpoint();

  
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

  
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/chats/conversations/');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
      console.error('Error creating conversation:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, files: File[] = []) => {
    let currentConv = currentConversation;
    if (!currentConv) {
      currentConv = await createNewConversation();
      if (!currentConv) return;
    }
    
    setIsLoading(true);
    
    try {
      
      const userMessageResponse = await axios.post(
        `/api/chats/conversations/${currentConv.id}/add_message/`,
        { role: 'user', content }
      );
      
      
      if (files.length > 0) {
        await processFiles(
          files,
          userMessageResponse.data.id,
          endpointContext.activeEndpoint?.baseUrl || '',
          endpointContext.activeEndpoint?.apiKey || ''
        );
      }
      
      
      const aiResponse = await axios.post('/api/chats/chat-completion/', { 
        message: content,
        conversation_id: currentConv.id,
        use_context: files.length > 0,
        endpoint_id: endpointContext.activeEndpoint?.id,
        endpoint_base_url: endpointContext.activeEndpoint?.baseUrl,
        endpoint_api_key: endpointContext.activeEndpoint?.apiKey,
        endpoint_model: endpointContext.activeEndpoint?.model
      });
      
      
      await axios.post(
        `/api/chats/conversations/${currentConv.id}/add_message/`,
        { role: 'assistant', content: aiResponse.data.response }
      );
      
      
      const finalConversation = await axios.get(`/api/chats/conversations/${currentConv.id}/`);
      setCurrentConversation(finalConversation.data);
      
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (currentConv) {
        try {
          await axios.post(
            `/api/chats/conversations/${currentConv.id}/add_message/`,
            { 
              role: 'assistant', 
              content: "I'm sorry, I encountered an error processing your message. Please try again." 
            }
          );
          
          const updatedConversation = await axios.get(`/api/chats/conversations/${currentConv.id}/`);
          setCurrentConversation(updatedConversation.data);
        } catch (innerError) {
          console.error('Error adding error message:', innerError);
        }
      }
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

  const setEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
  };

  const updateMessage = async (messageId: string, content: string) => {
    if (!messageId || !content.trim()) return;
    
    try {
      await axios.patch(`/api/chats/messages/${messageId}/`, {
        content: content
      });
      
      if (currentConversation) {
        const updatedMessages = currentConversation.messages.map((msg: any) => 
          msg.id === messageId ? { ...msg, content } : msg
        );
        
        setCurrentConversation({
          ...currentConversation,
          messages: updatedMessages
        });
      }
      
      setEditingMessageId(null);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentConversation) return;
    
    try {
      await axios.delete(`/api/chats/messages/${messageId}/`);
      
      setCurrentConversation({
        ...currentConversation,
        messages: currentConversation.messages.filter((msg: any) => msg.id !== messageId)
      });
      
      fetchConversations();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const resendMessage = async (messageId: string) => {
    if (!currentConversation) return;
    
    const message = currentConversation.messages.find((msg: any) => msg.id === messageId);
    if (!message || message.role !== 'user') return;
    
    await sendMessage(message.content);
  };

  const savePrompt = (name: string, content: string) => {
    const newPrompt = {
      id: Date.now().toString(),
      name,
      content
    };
    const updatedPrompts = [newPrompt, ...savedPrompts];
    setSavedPrompts(updatedPrompts);
    localStorage.setItem('savedPrompts', JSON.stringify(updatedPrompts));
  };

  const deletePrompt = (id: string) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
    setSavedPrompts(updatedPrompts);
    localStorage.setItem('savedPrompts', JSON.stringify(updatedPrompts));
  };

  const viewMessageVersions = async (messageId: string) => {
    try {
      const response = await axios.get(`/api/chats/messages/${messageId}/versions/`);
      setMessageVersions({
        ...messageVersions,
        [messageId]: response.data
      });
    } catch (error) {
      console.error('Error fetching message versions:', error);
    }
  };

  const restoreMessageVersion = async (messageId: string, versionId: string) => {
    try {
      const version = messageVersions[messageId]?.find(v => v.id === versionId);
      if (!version) return;
      await updateMessage(messageId, version.content);
    } catch (error) {
      console.error('Error restoring message version:', error);
    }
  };

  const forkConversationFromVersion = async (messageId: string, versionId: string) => {
    if (!currentConversation) return;
    
    try {
      const newConversation = await createNewConversation();
      if (!newConversation) return;
      
      const version = messageVersions[messageId]?.find(v => v.id === versionId);
      if (!version) return;
      
      await axios.post(
        `/api/chats/conversations/${newConversation.id}/add_message/`,
        { role: 'user', content: version.content }
      );
      
      const aiResponse = await axios.post('/api/chats/chat-completion/', { 
        message: version.content,
        conversation_id: newConversation.id,
        endpoint_id: endpointContext.activeEndpoint?.id,
        endpoint_base_url: endpointContext.activeEndpoint?.baseUrl,
        endpoint_api_key: endpointContext.activeEndpoint?.apiKey,
        endpoint_model: endpointContext.activeEndpoint?.model
      });
      
      await axios.post(
        `/api/chats/conversations/${newConversation.id}/add_message/`,
        { role: 'assistant', content: aiResponse.data.response }
      );
      
      await selectConversation(newConversation.id);
    } catch (error) {
      console.error('Error forking conversation:', error);
    }
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const response = await axios.post(`/api/chats/conversations/${conversationId}/rename/`, {
        title: newTitle
      });
      
      setConversations(conversations.map(conv => 
        conv.id === conversationId ? response.data : conv
      ));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(response.data);
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  const forkConversation = async (conversationId: string) => {
    try {
      const response = await axios.post(`/api/chats/conversations/${conversationId}/fork/`);
      setConversations([response.data, ...conversations]);
      setCurrentConversation(response.data);
    } catch (error) {
      console.error('Error forking conversation:', error);
    }
  };

  

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        isLoading,
        editingMessageId,
        savedPrompts,
        messageVersions,
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
        deletePrompt,
        viewMessageVersions,
        restoreMessageVersion,
        forkConversationFromVersion,
        renameConversation,
        forkConversation
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};


export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;