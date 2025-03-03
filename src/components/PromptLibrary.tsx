
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { BookOpen, Plus, Trash2 } from 'lucide-react';

interface PromptLibraryProps {
  onSelectPrompt: (content: string) => void;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({ onSelectPrompt }) => {
  const { savedPrompts, savePrompt, deletePrompt } = useChat();
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [promptName, setPromptName] = useState('');
  const [promptContent, setPromptContent] = useState('');

  const handleSavePrompt = () => {
    if (promptName.trim() && promptContent.trim()) {
      savePrompt(promptName.trim(), promptContent.trim());
      // Reset form
      setPromptName('');
      setPromptContent('');
      setIsAddingPrompt(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8"
          title="Prompt Library"
        >
          <BookOpen size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        side="top"
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Prompt Library</h3>
            {!isAddingPrompt && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsAddingPrompt(true)}
                className="h-8 w-8 p-0"
                title="Add New Prompt"
              >
                <Plus size={16} />
              </Button>
            )}
          </div>
        </div>

        {isAddingPrompt ? (
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="prompt-name">Prompt Name</Label>
              <Input 
                id="prompt-name" 
                value={promptName} 
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="Name your prompt..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prompt-content">Prompt Content</Label>
              <Textarea 
                id="prompt-content"
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                placeholder="Write your prompt here..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingPrompt(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSavePrompt}
                disabled={!promptName.trim() || !promptContent.trim()}
              >
                Save Prompt
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {savedPrompts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <p>You don't have any saved prompts yet.</p>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setIsAddingPrompt(true)}
                  className="mt-1"
                >
                  Add your first prompt
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {savedPrompts.map((prompt) => (
                  <li key={prompt.id} className="p-3 hover:bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm">{prompt.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {prompt.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => deletePrompt(prompt.id)}
                          title="Delete Prompt"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2 h-7 text-xs" 
                      onClick={() => onSelectPrompt(prompt.content)}
                    >
                      Use Prompt
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default PromptLibrary;
