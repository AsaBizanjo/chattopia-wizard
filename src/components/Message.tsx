import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import MessageActions from './MessageActions';
import { useChat } from '@/contexts/ChatContext';
import { FileText, Image, Copy, CheckCheck } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      description: "Code copied to clipboard",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderContent = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} className={lastIndex > 0 ? 'mt-2' : ''}>
            {text.slice(lastIndex, match.index)}
          </p>
        );
      }

      // Add code block
      const language = match[1] || 'plaintext';
      const code = match[2].trim();
      
      parts.push(
        <div key={`code-${match.index}`} className="relative my-4 rounded-md w-full md:w-3/4 lg:w-3/4">
          <div className="flex items-center justify-between px-4 py-1.5 bg-secondary/80 rounded-t-md">
            <span className="text-xs text-secondary-foreground">{language}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleCopyCode(code)}
            >
              {copiedCode === code ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              fontSize: '0.7em',
              padding: '0.75em',
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <p key={`text-${lastIndex}`} className={lastIndex > 0 ? 'mt-2' : ''}>
          {text.slice(lastIndex)}
        </p>
      );
    }

    return parts;
  };

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
          <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
        ) : (
          <AvatarFallback className="bg-secondary text-secondary-foreground">A</AvatarFallback>
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
        
        <div className={cn(
          "prose prose-sm max-w-none text-foreground text-[0.8em] text-left",
          role === 'user' ? "w-full" : "mr-auto"
        )}>
          {renderContent(content)}
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