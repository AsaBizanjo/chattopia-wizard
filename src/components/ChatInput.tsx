
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import FileUpload from './FileUpload';

interface ChatInputProps {
  editingMessageId?: string;
  initialContent?: string;
  onCancelEdit?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  editingMessageId, 
  initialContent = '', 
  onCancelEdit 
}) => {
  const [message, setMessage] = useState(initialContent);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, updateMessage } = useChat();
  
  // Set initial content when editing
  useEffect(() => {
    setMessage(initialContent);
  }, [initialContent]);

  // Focus textarea when component mounts or when editing starts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingMessageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isLoading) {
      if (editingMessageId) {
        // Handle edit mode
        updateMessage(editingMessageId, message.trim());
        onCancelEdit?.();
      } else {
        // Handle send mode
        await sendMessage(message.trim(), selectedFiles);
        setSelectedFiles([]);
      }
      setMessage('');
      
      // Focus the textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape' && editingMessageId) {
      onCancelEdit?.();
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-thin glass">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
          className="pr-12 min-h-[60px] max-h-[200px] resize-none focus-visible:ring-1 focus-visible:ring-offset-0"
          disabled={isLoading}
        />
        <div className="absolute right-2 bottom-2 flex gap-1">
          <FileUpload 
            onFilesSelected={handleFilesSelected}
            selectedFiles={selectedFiles}
            onRemoveFile={handleRemoveFile}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isLoading}
            className="h-8 w-8 transition-all-ease"
          >
            <Send size={18} className={isLoading ? 'opacity-50' : ''} />
          </Button>
        </div>
      </div>
      
      {editingMessageId && (
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-muted-foreground">
            Editing message
          </div>
          <Button 
            type="button" 
            size="sm" 
            variant="ghost" 
            onClick={onCancelEdit}
          >
            Cancel
          </Button>
        </div>
      )}
      
      {!editingMessageId && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          <span>Press Enter to send, Shift+Enter for a new line</span>
        </div>
      )}
    </form>
  );
};

export default ChatInput;
