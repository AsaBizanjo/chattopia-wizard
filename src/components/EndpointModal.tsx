// components/EndpointModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEndpoint } from '@/contexts/EndpointContext';
import { useToast } from '@/hooks/use-toast';

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EndpointModal: React.FC<EndpointModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const { addEndpoint } = useEndpoint();
  const { toast } = useToast();

  const models = [
    'gpt-3.5-turbo',
    'gpt-4',
    'claude-2',
    'claude-instant-1',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name.trim() && baseUrl.trim() && apiKey.trim()) {
      addEndpoint(name.trim(), baseUrl.trim(), apiKey.trim(), model);
      toast({
        title: "Endpoint added",
        description: `${name} has been added to your endpoints.`,
      });
      
      // Reset form
      setName('');
      setBaseUrl('');
      setApiKey('');
      setModel('gpt-3.5-turbo');
      onClose();
    } else {
      toast({
        title: "Invalid input",
        description: "All fields are required.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new API endpoint</DialogTitle>
          <DialogDescription>
            Enter the details of the API endpoint you want to use.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., OpenAI GPT-4"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="e.g., https://api.openai.com/v1"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((modelOption) => (
                  <SelectItem key={modelOption} value={modelOption}>
                    {modelOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Endpoint</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EndpointModal;