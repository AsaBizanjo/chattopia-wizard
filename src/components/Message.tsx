
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import MessageActions from './MessageActions';
import { useChat } from '@/contexts/ChatContext';
import { FileText, Image, Copy, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

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
  const { toast } = useToast();

  const copyFullText = () => {
    navigator.clipboard.writeText(content);
    toast({
      description: "Full message copied to clipboard",
    });
  };

  const copyMarkdown = () => {
    // For code blocks, copy just the code without the markdown syntax
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)\n```/g;
    let match;
    let textToCopy = content;
    
    // If there are code blocks, extract and copy just the first one
    if ((match = codeBlockRegex.exec(content)) !== null) {
      textToCopy = match[1];
    }
    
    navigator.clipboard.writeText(textToCopy);
    toast({
      description: "Code copied to clipboard",
    });
  };

  // Check if message contains code blocks
  const hasCodeBlock = content.includes('```');

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
      
      <div className={cn(
        "flex-1 space-y-2", 
        role === 'user' ? "text-left flex flex-col items-end" : "text-left"
      )}>
        <div className={cn(
          "font-medium flex items-center w-full", 
          role === 'user' ? "justify-between flex-row-reverse" : "justify-between"
        )}>
          <span>{role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}</span>
          
          <div className="flex items-center gap-1">
            {/* Copy buttons for system/assistant messages with code */}
            {(role === 'system' || role === 'assistant') && hasCodeBlock && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={copyMarkdown}
                title="Copy code"
              >
                <Code size={14} />
              </Button>
            )}
            
            {/* Copy full text button for all messages */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={copyFullText}
              title="Copy full text"
            >
              <Copy size={14} />
            </Button>
            
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
        </div>
        
        <div className={cn(
          "prose prose-sm max-w-none text-foreground text-[0.8em] text-left",
          role === 'user' ? "w-full" : "mr-auto"
        )}>
          {role === 'system' || role === 'assistant' ? (
            <ReactMarkdown className="break-words">
              {content}
            </ReactMarkdown>
          ) : (
            content.split('\n').map((paragraph, index) => (
              <p key={index} className={index > 0 ? 'mt-2' : ''}>
                {paragraph}
              </p>
            ))
          )}
        </div>
        
        {files && files.length > 0 && (
          <div className={cn(
            "flex flex-wrap gap-2 mt-3", 
            role === 'user' ? "justify-end" : "justify-start"
          )}>
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
