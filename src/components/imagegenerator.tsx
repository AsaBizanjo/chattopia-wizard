import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useEndpoint } from '@/contexts/EndpointContext';
import EndpointSelector from './EndpointSelector';
import { toast } from '@/components/ui/use-toast';
import OpenAI from 'openai';

interface ModelData {
  id: string;
  object: string;
  owned_by: string;
  endpoint: string | string[];
  is_free: boolean;
  is_early_access: boolean;
  pricing: {
    price: number;
    multiplier: number;
  };
  context_window: number;
  max_output: number;
}

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [steps, setSteps] = useState(30);
  const { activeEndpoint } = useEndpoint();
  const [availableModels, setAvailableModels] = useState<ModelData[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (activeEndpoint) {
      fetchModels();
    } else {
      // Clear models if no endpoint is selected
      setAvailableModels([]);
      setModel('');
    }
  }, [activeEndpoint]);

  useEffect(() => {
    // Set default model when available models change
    if (availableModels.length > 0 && !model) {
      setModel(availableModels[0].id);
    }
  }, [availableModels]);

  const fetchModels = async () => {
    if (!activeEndpoint) return;
    
    setIsLoadingModels(true);
    try {
      // Direct API call to get models instead of using the client's models.list()
      const response = await fetch(`${activeEndpoint.baseUrl}/models`, {
        headers: {
          'Content-Type': 'application/json'
         
        }
        
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter models that support image generation
      const imageModels = data.data.filter((model: any) => {
        if (typeof model.endpoint === 'string') {
          return model.endpoint === '/v1/images/generations';
        } else if (Array.isArray(model.endpoint)) {
          return model.endpoint.includes('/v1/images/generations');
        }
        return false;
      });
      
      setAvailableModels(imageModels);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast({
        title: "Failed to load models",
        description: error instanceof Error ? error.message : "Could not retrieve available models",
        variant: "destructive"
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    if (!activeEndpoint) {
      toast({
        title: "No API endpoint selected",
        description: "Please select or add an API endpoint first",
        variant: "destructive"
      });
      return;
    }
    if (!model) {
      toast({
        title: "No model selected",
        description: "Please select a model first",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      // Create OpenAI client with the active endpoint configuration
      const client = new OpenAI({
        apiKey: activeEndpoint.apiKey,
        baseURL: activeEndpoint.baseUrl,
        dangerouslyAllowBrowser: true
      });

      // Combine prompt and negative prompt
      let fullPrompt = prompt;
      if (negativePrompt) {
        fullPrompt += `. Avoid: ${negativePrompt}`;
      }

      // Generate image using the client
      const response = await client.images.generate({
        model: model,
        prompt: fullPrompt,
        n: 1,
        size: size as "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024",
        quality: "standard",
        response_format: "url",
      });

      if (response.data && response.data.length > 0) {
        setGeneratedImage(response.data[0].url as string);
      } else {
        throw new Error('No image was generated');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Image Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AI Image Generator</CardTitle>
          <EndpointSelector />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full resize-none"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="negative-prompt">Negative Prompt (what to avoid)</Label>
            <Textarea
              id="negative-prompt"
              placeholder="Elements you want to exclude from the image..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
              className="w-full resize-none"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={setModel} disabled={isLoadingModels || availableModels.length === 0}>
                <SelectTrigger id="model">
                  <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select model"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((modelData) => (
                    <SelectItem key={modelData.id} value={modelData.id}>
                      {modelData.id} {modelData.is_free ? "(Free)" : ""}
                    </SelectItem>
                  ))}
                  {availableModels.length === 0 && !isLoadingModels && (
                    <SelectItem value="no-models" disabled>
                      No image models available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {isLoadingModels && (
                <p className="text-xs text-muted-foreground flex items-center">
                  <Loader2 size={12} className="mr-1 animate-spin" />
                  Loading available models...
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size">Image Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="256x256">256 x 256</SelectItem>
                  <SelectItem value="512x512">512 x 512</SelectItem>
                  <SelectItem value="1024x1024">1024 x 1024</SelectItem>
                  <SelectItem value="1024x1792">1024 x 1792 (Portrait)</SelectItem>
                  <SelectItem value="1792x1024">1792 x 1024 (Landscape)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="steps">Generation Steps: {steps}</Label>
              <Slider
                id="steps"
                min={10}
                max={50}
                step={1}
                value={[steps]}
                onValueChange={(value) => setSteps(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                Note: Steps parameter only applies to some models
              </p>
            </div>
          </div>
          
          {generatedImage && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Generated Image</h3>
              <div className="border rounded-md overflow-hidden bg-muted/30 flex justify-center p-2">
                <img 
                  src={generatedImage} 
                  alt="Generated from prompt" 
                  className="max-h-[500px] object-contain rounded-md"
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={generateImage} 
            disabled={isGenerating || !prompt.trim() || !activeEndpoint || !model}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : 'Generate Image'}
          </Button>
          
          {generatedImage && (
            <Button 
              variant="outline" 
              onClick={downloadImage}
              className="w-full sm:w-auto"
            >
              <Download size={16} className="mr-2" />
              Download Image
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ImageGenerator;