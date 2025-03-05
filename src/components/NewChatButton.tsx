import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { motion } from 'framer-motion';

interface NewChatButtonProps {
  isCollapsed?: boolean;
  className?: string;
}

const NewChatButton: React.FC<NewChatButtonProps> = ({ 
  isCollapsed = false,
  className = ''
}) => {
  const { createNewConversation } = useChat();
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={createNewConversation}
        variant="default"
        size={isCollapsed ? "icon" : "default"}
        className={`transition-all duration-300 ease-in-out font-medium ${
          isCollapsed ? 'w-10 h-10 rounded-full p-0' : 'py-3 px-4 rounded-xl'
        } ${className} hover:shadow-md`}
      >
        <PlusCircle 
          size={isCollapsed ? 20 : 18} 
          className={isCollapsed ? 'mx-auto' : 'mr-2'} 
        />
        {!isCollapsed && (
          <span className="font-medium">New Chat</span>
        )}
      </Button>
    </motion.div>
  );
};

export default NewChatButton;