
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
      
      <div className="flex-1 space-y-2">
        <div className="font-medium flex justify-between items-center">
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
        
        <div className="prose prose-sm max-w-none text-foreground">
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className={index > 0 ? 'mt-2' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
        
        {files && files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
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
