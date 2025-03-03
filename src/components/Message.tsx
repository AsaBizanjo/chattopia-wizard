import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import MessageActions from './MessageActions';
import { useChat } from '@/contexts/ChatContext';
import { FileText, Image, Copy, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEndpoint } from '@/contexts/EndpointContext';
import OpenAI from 'openai';

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
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const { activeEndpoint } = useEndpoint();

  const handleEdit = (messageId: string) => {
    setEditingMessage(messageId, content);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      description: "Code copied to clipboard",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyFullMessage = () => {
    navigator.clipboard.writeText(content);
    setCopiedMessage(true);
    toast({
      description: "Full message copied to clipboard",
    });
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handlePlayAudio = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
  
    if (!activeEndpoint) {
      toast({
        title: "No API endpoint configured",
        description: "Please set up an API endpoint in settings first.",
        variant: "destructive"
      });
      return;
    }
  
    setIsLoading(true);
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
  
      const cleanText = content.replace(/```[\s\S]*?```/g, "Code block omitted for speech.");
  
      const client = new OpenAI({
        baseURL: activeEndpoint.baseUrl,
        apiKey: activeEndpoint.apiKey,
        dangerouslyAllowBrowser: true
      });
  
      const response = await client.audio.speech.create({
        model: "tts-1",
        input: cleanText,
        voice: "alloy",
      });
  
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error generating speech:", error);
      toast({
        title: "Speech generation failed",
        description: "Could not generate audio from the message.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <p 
            key={`text-${lastIndex}`} 
            className={lastIndex > 0 ? 'mt-3 leading-relaxed' : 'leading-relaxed'}
          >
            {text.slice(lastIndex, match.index)}
          </p>
        );
      }

      const language = match[1] || 'plaintext';
      const code = match[2].trim();
      
      parts.push(
        <div 
          key={`code-${match.index}`} 
          className="relative my-5 rounded-lg overflow-hidden shadow-md w-full md:w-3/4 lg:w-3/4 border border-border/50"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-secondary/80 backdrop-blur-sm">
            <span className="text-xs font-medium text-secondary-foreground">{language}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-secondary-foreground/10 transition-colors"
              onClick={() => handleCopyCode(code)}
            >
              {copiedCode === code ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
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
              fontSize: '0.8em',
              padding: '1em',
              lineHeight: '1.5',
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(
        <p 
          key={`text-${lastIndex}`} 
          className={lastIndex > 0 ? 'mt-3 leading-relaxed' : 'leading-relaxed'}
        >
          {text.slice(lastIndex)}
        </p>
      );
    }

    return parts;
  };

  return (
    <div 
      className={cn(
        "flex gap-5 px-6 py-7 group animate-fade-in transition-colors",
        role === 'assistant' ? "bg-muted/50" : "",
        "flex-row",
        isLast && role === 'assistant' && "animate-pulse-soft"
      )}
    >
      <Avatar 
        className={cn(
          "h-9 w-9 mt-1 ring-2 shadow-sm transition-all",
          role === 'user' ? "ring-primary/20" : "ring-secondary/20"
        )}
      >
        {role === 'user' ? (
          <AvatarFallback className="bg-primary text-primary-foreground font-medium">U</AvatarFallback>
        ) : (
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">A</AvatarFallback>
        )}
      </Avatar>
      
      <div className="flex-1 space-y-3 text-left">
        <div className="font-medium flex items-center w-full justify-between">
          <span 
            className={cn(
              "text-sm font-semibold",
              role === 'user' ? "text-primary-foreground/90" : "text-secondary-foreground/90"
            )}
          >
            {role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}
          </span>
          
          {role === 'user' ? (
            <MessageActions 
              messageId={id}
              messageContent={content}
              onEdit={handleEdit}
              onDelete={deleteMessage}
              onResend={resendMessage}
            />
          ) : role === 'assistant' && (
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs rounded-full hover:bg-secondary/80 transition-all"
                onClick={handlePlayAudio}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-1.5">⏳</span> Loading...
                  </span>
                ) : isPlaying ? (
                  <><VolumeX className="h-3.5 w-3.5 mr-1.5" /> Stop</> 
                ) : (
                  <><Volume2 className="h-3.5 w-3.5 mr-1.5" /> Listen</>
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs rounded-full hover:bg-secondary/80 transition-all"
                onClick={handleCopyFullMessage}
              >
                {copiedMessage ? (
                  <><CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Copied</>
                ) : (
                  <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy message</>
                )}
              </Button>
            </div>
          )}
        </div>
        
        <div className="prose prose-sm max-w-none text-foreground text-[0.85em] text-left mr-auto leading-relaxed">
          {renderContent(content)}
        </div>
        
        {files && files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 justify-start">
            {files.map((file, index) => (
              <a 
                key={index} 
                href={file.url} 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs border border-border rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors shadow-sm"
              >
                {file.type.startsWith('image/') ? (
                  <Image size={14} className="text-blue-400" />
                ) : (
                  <FileText size={14} className="text-orange-400" />
                )}
                <span className="max-w-[150px] truncate font-medium">{file.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;