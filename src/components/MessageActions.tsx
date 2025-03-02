
import React, { useState } from 'react';
import { MoreHorizontal, Pencil, RotateCcw, Copy, Trash2 } from 'lucide-react';
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
  
  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast({
      description: "Message copied to clipboard",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(messageId)}>
          <Pencil className="mr-2" size={16} />
          Edit message
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onResend(messageId)}>
          <RotateCcw className="mr-2" size={16} />
          Resend
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2" size={16} />
          Copy text
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-destructive" 
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
