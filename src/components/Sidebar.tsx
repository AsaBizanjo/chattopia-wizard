import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import NewChatButton from './NewChatButton';
import EndpointSelector from './EndpointSelector';
import { formatDistanceToNow, isValid } from 'date-fns';
import { LogOut, ChevronLeft, ChevronRight, Trash2, Image, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/contexts/SideBarContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';

// Create a reusable component for the Image Generation button
const ImageGenerationButton = ({ isCollapsed = false, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={onClick}
        variant="outline"
        size={isCollapsed ? "icon" : "default"}
        className={`transition-all duration-300 ease-in-out font-medium ${
          isCollapsed ? 'w-10 h-10 rounded-full p-0' : 'py-3 px-4 rounded-xl'
        } hover:shadow-md border-secondary/20 hover:bg-secondary/10`}
      >
        <Sparkles 
          size={isCollapsed ? 20 : 18} 
          className={isCollapsed ? 'mx-auto' : 'mr-2'} 
        />
        {!isCollapsed && (
          <span className="font-medium">Image Generation</span>
        )}
      </Button>
    </motion.div>
  );
};

const Sidebar: React.FC = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { conversations = [], currentConversation, selectConversation, deleteConversation } = useChat();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    toast({
      description: "Conversation deleted.",
    });
  };

  const openImageGenerator = () => {
    setIsImageGeneratorOpen(true);
    toast({
      title: "Image Generator",
      description: "Opening image generation tool...",
    });
  };

  const conversationsArray = Array.isArray(conversations) ? conversations : [];

  return (
    <>
      <div 
        className={`bg-background border-r border-border h-screen flex flex-col transition-all duration-300 ease-in-out fixed ${
          isCollapsed ? 'w-[60px]' : 'w-[300px]'
        }`}
      >
        <div className="flex items-center p-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg">Chat LLM</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="ml-auto"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
        
        {!isCollapsed && (
          <div className="px-4 py-2">
            <EndpointSelector />
          </div>
        )}
        
        <Separator />
        
        <div className="p-4 space-y-3">
          <NewChatButton isCollapsed={isCollapsed} />
          <ImageGenerationButton isCollapsed={isCollapsed} onClick={openImageGenerator} />
        </div>
        
        <ScrollArea className="flex-grow px-2 py-2">
          {!isCollapsed ? (
            conversationsArray.length > 0 ? (
              <div className="space-y-2">
                {conversationsArray.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={`p-2 rounded-md cursor-pointer group flex justify-between items-center transition-all-ease ${
                      currentConversation?.id === conversation.id
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="font-medium truncate">{conversation.title}</div>
                      <div className="text-xs text-muted-foreground">
                      {conversation.updated_at && 
                      isValid(new Date(conversation.updated_at)) ? 
                      formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true }) : 
                      'Unknown date'}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No conversations yet
              </div>
            )
          ) : null}
        </ScrollArea>
        
        <Separator />
        
        <div className="p-4">
          <div className={`flex items-center space-x-2 ${isCollapsed ? 'justify-center' : ''}`}>
            {!isCollapsed && (
              <div className="flex-1">
                <div className="font-medium truncate">{user?.username || 'Guest'}</div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Image Generator Dialog with iframe */}
      <Dialog open={isImageGeneratorOpen} onOpenChange={setIsImageGeneratorOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Image Generator
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] rounded-xl overflow-hidden">
            <iframe 
              src="/image-generator" 
              className="w-full h-full border-none"
              title="Image Generator"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;