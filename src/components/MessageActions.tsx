import React, { useState } from 'react';
import { MoreHorizontal, Pencil, RotateCcw, Copy, Trash2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onResend: (id: string) => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({ 
  messageId, 
  messageContent, 
  onEdit, 
  onDelete, 
  onResend 
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    setCopied(true);
    toast({
      description: "Message copied to clipboard",
    });
    
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-70 hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={() => onEdit(messageId)}
          className="flex items-center cursor-pointer"
        >
          <Pencil className="mr-2" size={16} />
          Edit message
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onResend(messageId)}
          className="flex items-center cursor-pointer"
        >
          <RotateCcw className="mr-2" size={16} />
          Resend
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleCopy}
          className="flex items-center cursor-pointer"
        >
          {copied ? (
            <CheckCheck className="mr-2" size={16} />
          ) : (
            <Copy className="mr-2" size={16} />
          )}
          {copied ? "Copied!" : "Copy text"}
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-destructive flex items-center cursor-pointer" 
          onClick={() => onDelete(messageId)}
        >
          <Trash2 className="mr-2" size={16} />
          Delete message
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MessageActions;