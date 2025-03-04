import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // Add this import
import { useEndpoint } from '@/contexts/EndpointContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  editEndpointId: string | null;
}

interface Model {
  id: string;
  [key: string]: any;
}

const EndpointModal: React.FC<EndpointModalProps> = ({ isOpen, onClose, editEndpointId }) => {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [enableRagie, setEnableRagie] = useState(false); // Add this state
  const [ragieApiKey, setRagieApiKey] = useState(''); // Add this state
  const [ragieBaseUrl, setRagieBaseUrl] = useState('https://api.ragie.io'); // Add this state with default value
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
        
        // Load Ragie settings if they exist
        setEnableRagie(!!endpointToEdit.ragieEnabled);
        setRagieApiKey(endpointToEdit.ragieApiKey || '');
        setRagieBaseUrl(endpointToEdit.ragieBaseUrl || 'https://api.ragie.io');
        
        // Fetch models for this endpoint
        if (endpointToEdit.baseUrl) {
          fetchModels(endpointToEdit.baseUrl);
        }
      }
    } else if (isOpen) {
      // Reset form when opening for a new endpoint
      setName('');
      setBaseUrl('');
      setApiKey('');
      setModel('');
      setEnableRagie(false);
      setRagieApiKey('');
      setRagieBaseUrl('https://api.ragie.io');
      setAvailableModels(defaultModels);
    }
  }, [isOpen, editEndpointId, endpoints]);

  // Fetch models when baseUrl is provided
  useEffect(() => {
    if (baseUrl) {
      fetchModels(baseUrl);
    }
  }, [baseUrl]);

  const fetchModels = async (url: string) => {
    // Existing fetchModels implementation...
    setIsLoadingModels(true);
    try {
      const modelsUrl = `${url.endsWith('/') ? url.slice(0, -1) : url}/models`;
      const response = await axios.get(modelsUrl, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: false // Explicitly set to false to avoid CORS issues
      });
      
      let modelIds: string[] = [];
      
      // Handle different API response formats
      if (response.data && Array.isArray(response.data.data)) {
        // Standard OpenAI-like format
        modelIds = response.data.data.map((model: Model) => model.id);
      } else if (response.data && Array.isArray(response.data)) {
        // Direct array of models
        modelIds = response.data.map((model: Model) => model.id);
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract models from a nested structure
        const possibleModelArrays = Object.values(response.data).filter(
          value => Array.isArray(value) && value.length > 0 && value[0]?.id
        );
        
        if (possibleModelArrays.length > 0) {
          modelIds = possibleModelArrays[0].map((model: Model) => model.id);
        }
      }
      
      if (modelIds.length > 0) {
        setAvailableModels(modelIds);
        
        // If no model is selected yet and we have models, select the first one
        if (!model && modelIds.length > 0) {
          setModel(modelIds[0]);
        }
      } else {
        // Fallback to default models if no models were found
        setAvailableModels(defaultModels);
        toast({
          title: "Warning",
          description: "No models found in the API response. Using default models list.",
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
      // Validate Ragie API key if enabled
      if (enableRagie && !ragieApiKey.trim()) {
        toast({
          title: "Invalid input",
          description: "Ragie API Key is required when Ragie integration is enabled.",
          variant: "destructive"
        });
        return;
      }
      
      const endpointData = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model,
        ragieEnabled: enableRagie,
        ragieApiKey: ragieApiKey.trim(),
        ragieBaseUrl: ragieBaseUrl.trim()
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
          model, 
          enableRagie, 
          ragieApiKey.trim(), 
          ragieBaseUrl.trim()
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
      setEnableRagie(false);
      setRagieApiKey('');
      setRagieBaseUrl('https://api.ragie.io');
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
            <Label htmlFor="model">Model</Label>
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
            {baseUrl && availableModels.length === 0 && !isLoadingModels && (
              <p className="text-sm text-muted-foreground mt-1">
                No models found. Check your API endpoint.
              </p>
            )}
          </div>
          
          {/* Ragie API Integration Section */}
          <div className="pt-2 border-t">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="enableRagie" 
                checked={enableRagie}
                onCheckedChange={(checked) => setEnableRagie(checked as boolean)}
              />
              <Label htmlFor="enableRagie" className="cursor-pointer">
                Enable Ragie API for file upload and processing
              </Label>
            </div>
            
            {enableRagie && (
              <>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="ragieBaseUrl">Ragie API Base URL</Label>
                  <Input
                    id="ragieBaseUrl"
                    value={ragieBaseUrl}
                    onChange={(e) => setRagieBaseUrl(e.target.value)}
                    placeholder="e.g., https://api.ragie.io"
                  />
                </div>
                
                <div className="space-y-2 mt-4">
                  <Label htmlFor="ragieApiKey">Ragie API Key</Label>
                  <Input
                    id="ragieApiKey"
                    type="password"
                    value={ragieApiKey}
                    onChange={(e) => setRagieApiKey(e.target.value)}
                    placeholder="Your Ragie API key"
                  />
                </div>
              </>
            )}
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