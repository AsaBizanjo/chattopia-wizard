import React from 'react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import NewChatButton from './NewChatButton';
import EndpointSelector from './EndpointSelector';
import { formatDistanceToNow, isValid } from 'date-fns';
import { LogOut, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/contexts/SideBarContext';


const Sidebar: React.FC = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { conversations = [], currentConversation, selectConversation, deleteConversation } = useChat();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
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

  // Check if conversations is actually an array
  const conversationsArray = Array.isArray(conversations) ? conversations : [];

  return (
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
      
      <div className="p-4">
        <NewChatButton isCollapsed={isCollapsed} />
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
  );
};

export default Sidebar;