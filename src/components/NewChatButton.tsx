
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

interface NewChatButtonProps {
  isCollapsed?: boolean;
}

const NewChatButton: React.FC<NewChatButtonProps> = ({ isCollapsed = false }) => {
  const { createNewConversation } = useChat();
  
  return (
    <Button
      onClick={createNewConversation}
      className={`w-full transition-all-ease ${isCollapsed ? 'px-0' : ''}`}
    >
      <PlusCircle size={18} className={isCollapsed ? 'mx-auto' : 'mr-2'} />
      {!isCollapsed && <span>New Chat</span>}
    </Button>
  );
};

export default NewChatButton;
