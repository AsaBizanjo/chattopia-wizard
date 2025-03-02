
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isLast?: boolean;
}

const Message: React.FC<MessageProps> = ({ role, content, isLast = false }) => {
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
        <div className="font-medium">
          {role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}
        </div>
        
        <div className="prose prose-sm max-w-none text-foreground">
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className={index > 0 ? 'mt-2' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Message;
