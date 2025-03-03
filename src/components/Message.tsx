
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import MessageActions from './MessageActions';
import { useChat } from '@/contexts/ChatContext';
import { FileText, Image } from 'lucide-react';

interface MessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isLast?: boolean;
  files?: {
    name: string;
    type: string;
    url: string;
  }[];
}

const Message: React.FC<MessageProps> = ({ 
  id, 
  role, 
  content, 
  isLast = false,
  files = [] 
}) => {
  const { deleteMessage, setEditingMessage, resendMessage } = useChat();

  return (
    <div 
      className={cn(
        "flex gap-4 px-4 py-6 group animate-fade-in",
        role === 'assistant' ? "bg-muted/50" : "",
        role === 'user' ? "flex-row-reverse" : "flex-row",
        isLast && role === 'assistant' && "animate-pulse-soft"
      )}
    >
      <Avatar className="h-8 w-8 mt-1">
        {role === 'user' ? (
          <>
            <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
          </>
        ) : (
          <>
            <AvatarFallback className="bg-secondary text-secondary-foreground">A</AvatarFallback>
          </>
        )}
      </Avatar>
      
      <div className={cn("flex-1 space-y-2", role === 'user' ? "text-right" : "text-left")}>
        <div className={cn("font-medium flex items-center", role === 'user' ? "justify-end" : "justify-between")}>
          <span>{role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}</span>
          
          {role === 'user' && (
            <MessageActions 
              messageId={id}
              messageContent={content}
              onEdit={setEditingMessage}
              onDelete={deleteMessage}
              onResend={resendMessage}
            />
          )}
        </div>
        
        <div className={cn("prose prose-sm max-w-none text-foreground text-[0.8em]", role === 'user' ? "ml-auto" : "mr-auto")}>
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className={index > 0 ? 'mt-2' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
        
        {files && files.length > 0 && (
          <div className={cn("flex flex-wrap gap-2 mt-3", role === 'user' ? "justify-end" : "justify-start")}>
            {files.map((file, index) => (
              <a 
                key={index} 
                href={file.url} 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs border border-border rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
              >
                {file.type.startsWith('image/') ? (
                  <Image size={14} />
                ) : (
                  <FileText size={14} />
                )}
                <span className="max-w-[150px] truncate">{file.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
