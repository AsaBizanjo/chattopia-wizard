// Message.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import MessageActions from './MessageActions';
import { useChat } from '@/contexts/ChatContext';
import { FileText, Image, Copy, CheckCheck, Volume2, VolumeX, History, GitFork, Bot, User as UserIcon, Camera } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEndpoint } from '@/contexts/EndpointContext';
import OpenAI from 'openai';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';

// Add a new hook to manage the profile photo
const useProfilePhoto = () => {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  useEffect(() => {
    // Load profile photo from localStorage on component mount
    const savedPhoto = localStorage.getItem('userProfilePhoto');
    if (savedPhoto) {
      setProfilePhoto(savedPhoto);
    }
  }, []);
  
  const updateProfilePhoto = (photoDataUrl: string) => {
    // Save to localStorage and update state
    localStorage.setItem('userProfilePhoto', photoDataUrl);
    setProfilePhoto(photoDataUrl);
  };
  
  const removeProfilePhoto = () => {
    localStorage.removeItem('userProfilePhoto');
    setProfilePhoto(null);
  };
  
  return { profilePhoto, updateProfilePhoto, removeProfilePhoto };
};

// Profile Photo Upload Dialog component
const ProfilePhotoUploader = ({ onPhotoUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { profilePhoto, updateProfilePhoto, removeProfilePhoto } = useProfilePhoto();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSave = () => {
    if (previewUrl) {
      updateProfilePhoto(previewUrl);
      onPhotoUpdated(previewUrl);
      setIsOpen(false);
      toast({
        description: "Profile photo updated successfully",
      });
    }
  };
  
  const handleRemove = () => {
    removeProfilePhoto();
    onPhotoUpdated(null);
    setPreviewUrl(null);
    setIsOpen(false);
    toast({
      description: "Profile photo removed",
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          onClick={() => setIsOpen(true)}
        >
          <Camera className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <Avatar className="h-24 w-24 ring-2 ring-offset-2 ring-primary/20 ring-offset-background">
              <AvatarImage src={previewUrl || profilePhoto || ''} />
              <AvatarFallback>
                <UserIcon className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col gap-2 w-full">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <div className="text-xs text-muted-foreground">
                Recommended: Square image, max 2MB
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleRemove}>
              Remove Photo
            </Button>
            <Button onClick={handleSave} disabled={!previewUrl}>
              Save Photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  versions?: {
    id: string;
    content: string;
    created_at: string;
  }[];
}

const Message: React.FC<MessageProps> = ({ id, role, content, isLast = false, files = [] }) => {
  const {
    deleteMessage,
    setEditingMessage,
    resendMessage,
    viewMessageVersions,
    messageVersions,
    restoreMessageVersion,
    forkConversationFromVersion
  } = useChat();
  const [copiedCode, setCopiedCode] = useState(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const audioRef = useRef(null);
  const { toast } = useToast();
  const { activeEndpoint } = useEndpoint();
  const { profilePhoto, updateProfilePhoto } = useProfilePhoto();
  
  const handleProfilePhotoUpdate = (photoUrl: string | null) => {
    // This will be passed to the ProfilePhotoUploader
    if (photoUrl) {
      updateProfilePhoto(photoUrl);
    }
  };

  const handleEdit = (messageId: string) => {
    setEditingMessage(messageId, content);
  };

  const handleViewVersions = async () => {
    await viewMessageVersions(id);
    setShowVersions(true);
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

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'plaintext';
    const code = String(children).replace(/\n$/, '');
    
    return !inline ? (
      <div className="relative my-6 rounded-lg overflow-hidden shadow-md border border-border/50">
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/20 text-xs font-medium">
          <span className="text-secondary-foreground">{language}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs hover:bg-secondary/30"
            onClick={() => handleCopyCode(code)}
          >
            {copiedCode === code ? (
              <CheckCheck className="h-4 w-4 mr-1" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            {copiedCode === code ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, borderRadius: '0' }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  };

  return (
    <motion.div 
      className={cn(
        "py-6 my-2",
        role === 'assistant' ? "bg-muted/30 rounded-xl backdrop-blur-sm" : ""
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex gap-4 mx-auto w-full max-w-4xl px-6">
        <div className="relative group">
          <Avatar className={cn(
            "h-10 w-10 ring-2 ring-offset-2",
            role === 'assistant' 
              ? "bg-primary/10 text-primary ring-primary/20 ring-offset-background" 
              : "bg-secondary/10 text-secondary ring-secondary/20 ring-offset-background" 
          )}>
            {role === 'user' && profilePhoto ? (
              <AvatarImage src={profilePhoto} alt="user profile" />
            ) : null}
            <AvatarFallback>
              {role === 'user' ? <UserIcon className="h-5 w-5" /> : role === 'assistant' ? <Bot className="h-5 w-5" /> : 'S'}
            </AvatarFallback>
          </Avatar>
          
          {/* Only show photo uploader for user messages and only on hover */}
          {role === 'user' && (
            <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ProfilePhotoUploader onPhotoUpdated={handleProfilePhotoUpdate} />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold",
              role === 'assistant' ? "text-primary" : "text-primary"
            )}>
              {role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}
            </span>
            
            {role === 'user' ? (
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-secondary/10"
                  onClick={handleViewVersions}
                  title="View message history"
                >
                  <History className="h-4 w-4" />
                </Button>
                <MessageActions
                  onEdit={() => handleEdit(id)}
                  onDelete={() => deleteMessage(id)}
                  onResend={() => resendMessage(id)} 
                  messageId={''} 
                  messageContent={''}
                />
                <Dialog open={showVersions} onOpenChange={setShowVersions}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-center">
                        Message History
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                      {messageVersions[id]?.length > 0 ? (
                        messageVersions[id]?.map((version) => (
                          <motion.div 
                            key={version.id} 
                            className="border rounded-lg p-4 hover:border-primary/30 transition-all"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <div className="text-xs text-muted-foreground mb-2 flex items-center">
                              <span className="inline-block w-3 h-3 rounded-full bg-secondary/40 mr-2"></span>
                              {new Date(version.created_at).toLocaleString()}
                            </div>

                            <div className="text-sm whitespace-pre-wrap mb-3 bg-muted/30 p-3 rounded-md">
                              {version.content}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-primary/10 hover:text-primary"
                                onClick={() => restoreMessageVersion(id, version.id)}
                              >
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-secondary/10 hover:text-secondary"
                                onClick={() => {
                                  forkConversationFromVersion(id, version.id);
                                  setShowVersions(false);
                                }}
                              >
                                <GitFork className="h-4 w-4 mr-1" /> Fork
                              </Button>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-12 bg-muted/20 rounded-lg">
                          No previous versions found
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : role === 'assistant' && (
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={handlePlayAudio}
                  disabled={isLoading}
                  title={isPlaying ? "Stop audio" : "Play as audio"}
                >
                  {isLoading ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  ) : isPlaying ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={handleCopyFullMessage}
                  title="Copy message"
                >
                  {copiedMessage ? (
                    <CheckCheck className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className={cn(
            "prose prose-slate dark:prose-invert max-w-none",
            role === 'assistant' ? "prose-headings:text-primary" : "prose-headings:text-secondary",
            "prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0",
            "prose-code:text-primary-foreground prose-code:bg-primary/10",
            "prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: CodeBlock,
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 border-b pb-2 border-muted" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 border-b pb-1 border-muted/50" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="my-3 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 my-3 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="my-1" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 pl-4 my-3 italic" {...props} />,
                a: ({node, ...props}) => <a className="text-primary underline decoration-primary/30 hover:decoration-primary transition-all" {...props} />,
                em: ({node, ...props}) => <em className="italic" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                hr: ({node, ...props}) => <hr className="my-6 border-muted" {...props} />,
                table: ({node, ...props}) => <div className="overflow-x-auto my-6 rounded-lg border border-border/50"><table className="min-w-full divide-y divide-border" {...props} /></div>,
                thead: ({node, ...props}) => <thead className="bg-muted/30" {...props} />,
                th: ({node, ...props}) => <th className="px-4 py-3 text-left text-sm font-semibold" {...props} />,
                td: ({node, ...props}) => <td className="px-4 py-3 text-sm border-t border-border/30" {...props} />,
                img: ({node, ...props}) => <img className="max-w-full h-auto rounded-lg shadow-md my-6" {...props} />
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {files && files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {files.map((file, index) => (
                <a 
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm bg-muted/60 hover:bg-muted px-3 py-2 rounded-full transition-colors shadow-sm border border-border/30"
                >
                  {file.type.startsWith('image/') ? (
                    <Image className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-secondary" />
                  )}
                  <span className="truncate max-w-[150px]">{file.name}</span>
                </a>
              ))}
            </div>
          )}
          
          {isLast && (
            <div className="mt-2 pl-1">
              <span className="inline-block animate-pulse text-sm text-muted-foreground">
                Assistant is thinking...
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Export the hook so it can be used in other components if needed
export { useProfilePhoto };
export default Message;