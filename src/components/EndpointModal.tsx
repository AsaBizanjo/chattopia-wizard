import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEndpoint } from '@/contexts/EndpointContext';
import { useToast } from '@/hooks/use-toast';
import OpenAI from 'openai';

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  editEndpointId: string | null;
}

const EndpointModal: React.FC<EndpointModalProps> = ({ isOpen, onClose, editEndpointId }) => {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const { addEndpoint, endpoints, updateEndpoint } = useEndpoint();
  const { toast } = useToast();
  const isEditing = Boolean(editEndpointId);

  // Default models as fallback
  const defaultModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-turbo',
    'claude-2',
    'claude-instant-1',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'gemini-pro',
    'gemini-ultra',
    'llama-3-70b',
  ];

  // Load endpoint data when editing
  useEffect(() => {
    if (isOpen && editEndpointId) {
      const endpointToEdit = endpoints.find(ep => ep.id === editEndpointId);
      if (endpointToEdit) {
        setName(endpointToEdit.name);
        setBaseUrl(endpointToEdit.baseUrl);
        setApiKey(endpointToEdit.apiKey);
        setModel(endpointToEdit.model);
        
        // Set available models to default initially
        setAvailableModels(defaultModels);
      }
    } else if (isOpen) {
      // Reset form when opening for a new endpoint
      setName('');
      setBaseUrl('');
      setApiKey('');
      setModel('');
      setAvailableModels(defaultModels);
    }
  }, [isOpen, editEndpointId, endpoints]);

 const fetchModels = async () => {
  if (!baseUrl.trim()) {
    toast({
      title: "Missing URL",
      description: "Please enter a base URL before fetching models.",
      variant: "destructive"
    });
    return;
  }
  
  if (!apiKey.trim()) {
    toast({
      title: "Missing API Key",
      description: "Please enter an API key before fetching models.",
      variant: "destructive"
    });
    return;
  }
  
  setIsLoadingModels(true);
  try {
    // Create an OpenAI client with the provided baseURL and apiKey
    const client = new OpenAI({
      baseURL: baseUrl.trim(),
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true, 
    });

    // Fetch models using the OpenAI client
    const response = await client.models.list();
    
    if (response && response.data) {
      // Extract model IDs from the response
      const modelIds = response.data.map(model => model.id);
      
      if (modelIds.length > 0) {
        setAvailableModels(modelIds);
        
        // If no model is selected yet and we have models, select the first one
        if (!model && modelIds.length > 0) {
          setModel(modelIds[0]);
        }
        
        toast({
          title: "Models fetched",
          description: `Successfully fetched ${modelIds.length} models.`,
        });
      } else {
        // Fallback to default models if no models were found
        setAvailableModels(defaultModels);
        toast({
          title: "Warning",
          description: "No models found in the API response. Using default models list.",
        });
      }
    } else {
      setAvailableModels(defaultModels);
      toast({
        title: "Unexpected response",
        description: "The API returned an unexpected format. Using default models list.",
        variant: "destructive"
      });
    }
  } catch (error) {
    console.error("Error fetching models:", error);
    setAvailableModels(defaultModels);
    toast({
      title: "Error fetching models",
      description: "Could not fetch models from the endpoint. Using default models list.",
      variant: "destructive"
    });
  } finally {
    setIsLoadingModels(false);
  }
};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim() && baseUrl.trim() && apiKey.trim() && model) {
      const endpointData = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model,
      };

      if (isEditing && editEndpointId) {
        // Update existing endpoint
        updateEndpoint(editEndpointId, endpointData);

        toast({
          title: "Endpoint updated",
          description: `${name} has been updated successfully.`,
        });
      } else {
        // Add new endpoint
        addEndpoint(
          name.trim(),
          baseUrl.trim(),
          apiKey.trim(),
          model
        );

        toast({
          title: "Endpoint added",
          description: `${name} has been added to your endpoints.`,
        });
      }

      // Reset form
      setName('');
      setBaseUrl('');
      setApiKey('');
      setModel('');
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
          <DialogTitle>{isEditing ? 'Edit API endpoint' : 'Add a new API endpoint'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the details of your API endpoint.' 
              : 'Enter the details of the API endpoint you want to use.'}
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
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="model">Model</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={fetchModels} 
                disabled={isLoadingModels || !baseUrl.trim() || !apiKey.trim()}
              >
                {isLoadingModels ? "Fetching..." : "Fetch Models"}
              </Button>
            </div>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingModels ? (
                  <SelectItem value="loading" disabled>Loading models...</SelectItem>
                ) : (
                  availableModels.map((modelOption) => (
                    <SelectItem key={modelOption} value={modelOption}>
                      {modelOption}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {availableModels === defaultModels ? 
                "Using default models list. Click 'Fetch Models' to get models from your API." : 
                `${availableModels.length} models available.`}
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoadingModels}>
              {isEditing ? 'Update Endpoint' : 'Add Endpoint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EndpointModal;
