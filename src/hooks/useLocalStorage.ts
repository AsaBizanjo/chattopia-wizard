
import { useState, useEffect } from 'react';
import { Conversation, SavedPrompt } from '../types/chat';

export const useLocalStorage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    const currentId = localStorage.getItem('currentConversationId');
    const savedPromptsData = localStorage.getItem('savedPrompts');
    
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

    if (savedPromptsData) {
      setSavedPrompts(JSON.parse(savedPromptsData));
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
    
    if (currentConversation) {
      localStorage.setItem('currentConversationId', currentConversation.id);
    }
  }, [conversations, currentConversation]);

  // Save prompts to localStorage
  useEffect(() => {
    if (savedPrompts.length > 0) {
      localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
    }
  }, [savedPrompts]);

  return {
    conversations,
    setConversations,
    currentConversation,
    setCurrentConversation,
    savedPrompts,
    setSavedPrompts
  };
};
