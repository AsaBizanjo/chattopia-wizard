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
}

// Create the context with a default value
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

// Helper function to convert File to base64 for Raggie AI
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  const [messageVersions, setMessageVersions] = useState<Record<string, any[]>>({});
  const [raggieFileIds, setRaggieFileIds] = useState<string[]>([]);
  
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

  // Upload files to Raggie AI
  const uploadFilesToRaggieAI = async (files: File[]): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    
    try {
      // Get Raggie API key from active endpoint
      const ragieApiKey = endpointContext.activeEndpoint?.ragieApiKey;
      
      if (!ragieApiKey) {
        throw new Error('No Raggie API key found in active endpoint');
      }
      
      // Create form data for each file
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("metadata", JSON.stringify({ 
          title: file.name, 
          scope: "chat" // You can customize this scope
        }));
        
        const response = await fetch("https://api.raggieai.com/documents", {
          method: "POST",
          headers: {
            authorization: `Bearer ${ragieApiKey}`,
            accept: "application/json",
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed {response.statusText}`);
        }
        
        const data = await response.json();
        return data.document_id; // Return the document ID
      });
      
      // Wait for all uploads to complete
      const documentIds = await Promise.all(uploadPromises);
      return documentIds;
    } catch (error) {
      console.error('Error uploading files to Raggie AI:', error);
      return [];
    }
  };
  const sendMessage = async (content: string, files: File[] = []) => {
    let currentConv = currentConversation;
    if (!currentConv) {
      currentConv = await createNewConversation();
      if (!currentConv) return; // Handle case where conversation creation fails
    }
    
    setIsLoading(true);
    
    try {
      // Upload files to Raggie AI if any
      let documentIds: string[] = [];
      let fileReferences = '';
      
      if (files && files.length > 0) {
        // Check if Raggie is enabled in the active endpoint
        if (!endpointContext.activeEndpoint?.ragieEnabled) {
          throw new Error('Raggie AI is not enabled in the active endpoint');
        }
        
        documentIds = await uploadFilesToRaggieAI(files);
        
        // Create file references for the message content
        fileReferences = files.length > 0 
          ? `\n\n[Attached 
  𝑓
  𝑖
  𝑙
  𝑒
  𝑠
  .
  𝑙
  𝑒
  𝑛
  𝑔
  𝑡
  ℎ
  <
  /
  𝑠
  𝑝
  𝑎
  𝑛
  >
  𝑓
  𝑖
  𝑙
  𝑒
  (
  𝑠
  )
  :
  <
  𝑠
  𝑝
  𝑎
  𝑛
  𝑐
  𝑙
  𝑎
  𝑠
  𝑠
  =
  "
  ℎ
  𝑙
  𝑗
  𝑠
  −
  𝑠
  𝑢
  𝑏
  𝑠
  𝑡
  "
  >
  files.length</span>file(s):<spanclass="hljs−subst">{files.map(f => f.name).join(', ')}]` 
          : '';
        
        // Store document IDs for future reference
        setRaggieFileIds(prev => [...prev, ...documentIds]);
      }
      
      // Add user message with file references
      const userMessageResponse = await axios.post(
        `/api/chats/conversations/${currentConv.id}/add_message/`,
        { role: 'user', content: content + fileReferences }
      );
      
      // Fetch updated conversation to get the new message
      const updatedConversation = await axios.get(`/api/chats/conversations/${currentConv.id}/`);
      setCurrentConversation(updatedConversation.data);
      
      // Prepare for AI response - use Raggie AI if files are present
      let aiResponseText = '';
      
      if (documentIds.length > 0) {
        // Use Raggie AI for RAG capabilities
        try {
          const ragieApiKey = endpointContext.activeEndpoint?.ragieApiKey;
          
          if (!ragieApiKey) {
            throw new Error('No Raggie API key found in active endpoint');
          }
          
          // First retrieve relevant chunks from the uploaded documents
          const retrievalResponse = await fetch("https://api.raggieai.com/retrievals", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + ragieApiKey,
            },
            body: JSON.stringify({
              query: content,
              filter: {
                scope: "chat" // Match the scope you used when uploading
              }
            }),
          });
          
          if (!retrievalResponse.ok) {
            throw new Error(`Retrieval failed: ${retrievalResponse.statusText}`);
          }
          
          const retrievalData = await retrievalResponse.json();
          const chunkText = retrievalData.scored_chunks.map((chunk) => chunk.text);
          
          // Create a system prompt with the retrieved chunks
          const systemPrompt = `These are very important to follow:
  
  You are an AI assistant helping the user with their documents.
  
  Your current task is to help the user based on all of the information available to you shown below.
  Answer informally, directly, and concisely without a heading or greeting but include everything relevant.
  Use richtext Markdown when appropriate including bold, italic, paragraphs, and lists when helpful.
  
  Here is all of the information available to answer the user:
  ===
  ${chunkText.join('\n\n')}
  ===
  
  If there are no results, make sure to let the user know that you couldn't find anything relevant.`;
          
          // Use your existing endpoint for generation with the enhanced prompt
          const aiResponse = await axios.post('/api/chats/chat-completion/', { 
            message: content,
            conversation_id: currentConv.id,
            system_prompt: systemPrompt, // You'll need to modify your backend to accept this
            endpoint_id: endpointContext.activeEndpoint?.id,
            endpoint_base_url: endpointContext.activeEndpoint?.baseUrl,
            endpoint_api_key: endpointContext.activeEndpoint?.apiKey,
            endpoint_model: endpointContext.activeEndpoint?.model
          });
          
          aiResponseText = aiResponse.data.response;
        } catch (error) {
          console.error('Error getting response from Raggie AI:', error);
          aiResponseText = "Sorry, I encountered an error processing your files. Please try again.";
        }
      } else {
        // Use regular endpoint for text-only messages
        const aiResponse = await axios.post('/api/chats/chat-completion/', { 
          message: content,
          conversation_id: currentConv.id,
          endpoint_id: endpointContext.activeEndpoint?.id,
          endpoint_base_url: endpointContext.activeEndpoint?.baseUrl,
          endpoint_api_key: endpointContext.activeEndpoint?.apiKey,
          endpoint_model: endpointContext.activeEndpoint?.model
        });
        
        aiResponseText = aiResponse.data.response;
      }
      
      // Add AI response to conversation
      await axios.post(
        `/api/chats/conversations/${currentConv.id}/add_message/`,
        { role: 'assistant', content: aiResponseText }
      );
      
      // Fetch final updated conversation
      const finalConversation = await axios.get(`/api/chats/conversations/${currentConv.id}/`);
      setCurrentConversation(finalConversation.data);
      
      // Update conversations list
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to conversation if possible
      if (currentConv) {
        try {
          await axios.post(
            `/api/chats/conversations/${currentConv.id}/add_message/`,
            { 
              role: 'assistant', 
              content: "I'm sorry, I encountered an error processing your message. Please try again." 
            }
          );
          
          // Fetch updated conversation
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
              // Check if the original message had files attached
              const hasFiles = editedMessage.content.includes('[Attached');
              let aiResponseText = '';
              
              if (hasFiles && raggieFileIds.length > 0) {
                // Use Raggie AI for regenerating response with files
                try {
                  const ragieApiKey = endpointContext.activeEndpoint?.ragieApiKey;
                  const ragieBaseUrl = endpointContext.activeEndpoint?.ragieBaseUrl || 'https://api.raggieai.com';
                  
                  if (!ragieApiKey) {
                    throw new Error('No Raggie API key found in active endpoint');
                  }
                  
                  const raggieResponse = await fetch(`${ragieBaseUrl}/chat`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      api_key: ragieApiKey,
                      message: content,
                      file_ids: raggieFileIds,
                      model: endpointContext.activeEndpoint?.model || "gpt-4-vision-preview",
                    }),
                  });
                  
                  if (!raggieResponse.ok) {
                    throw new Error('Failed to get response from Raggie AI');
                  }
                  
                  const raggieData = await raggieResponse.json();
                  aiResponseText = raggieData.response;
                } catch (error) {
                  console.error('Error getting response from Raggie AI:', error);
                  aiResponseText = "Sorry, I encountered an error processing your files. Please try again.";
                }
              } else {
                // Use regular endpoint for text-only messages
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
                
                aiResponseText = aiResponse.data.response;
              }
              
              // Update the AI response
              await axios.patch(`/api/chats/messages/${nextMessage.id}/`, {
                content: aiResponseText
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
    
    // Check if the message had files attached
    const hasFiles = message.content.includes('[Attached');
    
    if (hasFiles) {
      // If it had files, we need to inform the user that files can't be resent
      console.warn('Files cannot be automatically resent. Please attach them again.');
      
      // Extract just the message content without the file references
      const contentWithoutFiles = message.content.split('[Attached')[0].trim();
      
      // Resend just the text content
      await sendMessage(contentWithoutFiles);
    } else {
      // Resend the message content
      await sendMessage(message.content);
    }
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

  // New functions for message versioning
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
      // Get the version content
      const version = messageVersions[messageId]?.find(v => v.id === versionId);
      if (!version) return;
      
      // Update the message with the version content
      await updateMessage(messageId, version.content);
    } catch (error) {
      console.error('Error restoring message version:', error);
    }
  };

  const forkConversationFromVersion = async (messageId: string, versionId: string) => {
    if (!currentConversation) return;
    
    try {
      // Create a new conversation
      const newConversation = await createNewConversation();
      if (!newConversation) return;
      
      // Get all messages up to the edited message
      const messageIndex = currentConversation.messages.findIndex((msg: any) => msg.id === messageId);
      if (messageIndex === -1) return;
      // Get the version content
      const version = messageVersions[messageId]?.find(v => v.id === versionId);
      if (!version) return;
      
      // Copy all messages up to the edited message to the new conversation
      for (let i = 0; i < messageIndex; i++) {
        const msg = currentConversation.messages[i];
        await axios.post(
          `/api/chats/conversations/${newConversation.id}/add_message/`,
          { role: msg.role, content: msg.content }
        );
      }
      
      // Add the version content as a message
      await axios.post(
        `/api/chats/conversations/${newConversation.id}/add_message/`,
        { role: 'user', content: version.content }
      );
      
      // Check if the version content had files attached
      const hasFiles = version.content.includes('[Attached');
      let aiResponseText = '';
      
      if (hasFiles && raggieFileIds.length > 0) {
        // Use Raggie AI for response with files
        try {
          const ragieApiKey = endpointContext.activeEndpoint?.ragieApiKey;
          const ragieBaseUrl = endpointContext.activeEndpoint?.ragieBaseUrl || 'https://api.raggieai.com';
          
          if (!ragieApiKey) {
            throw new Error('No Raggie API key found in active endpoint');
          }
          
          const raggieResponse = await fetch(`${ragieBaseUrl}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: ragieApiKey,
              message: version.content,
              file_ids: raggieFileIds,
              model: endpointContext.activeEndpoint?.model || "gpt-4-vision-preview",
            }),
          });
          
          if (!raggieResponse.ok) {
            throw new Error('Failed to get response from Raggie AI');
          }
          
          const raggieData = await raggieResponse.json();
          aiResponseText = raggieData.response;
        } catch (error) {
          console.error('Error getting response from Raggie AI:', error);
          aiResponseText = "Sorry, I encountered an error processing your files. Please try again.";
        }
      } else {
        // Get AI response for the version content using regular endpoint
        const aiResponse = await axios.post('/api/chats/chat-completion/', { 
          message: version.content,
          conversation_id: newConversation.id,
          endpoint_id: endpointContext.activeEndpoint?.id,
          endpoint_base_url: endpointContext.activeEndpoint?.baseUrl,
          endpoint_api_key: endpointContext.activeEndpoint?.apiKey,
          endpoint_model: endpointContext.activeEndpoint?.model
        });
        
        aiResponseText = aiResponse.data.response;
      }
      
      // Add AI response to the new conversation
      await axios.post(
        `/api/chats/conversations/${newConversation.id}/add_message/`,
        { role: 'assistant', content: aiResponseText }
      );
      
      // Switch to the new conversation
      await selectConversation(newConversation.id);
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
        forkConversationFromVersion
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);