import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Download, Sparkles, ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useEndpoint } from '@/contexts/EndpointContext';
import EndpointSelector from './EndpointSelector';
import { toast } from '@/components/ui/use-toast';
import OpenAI from 'openai';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [activeTab, setActiveTab] = useState('prompt');

  useEffect(() => {
    if (activeEndpoint) {
      fetchModels();
    } else {
      setAvailableModels([]);
      setModel('');
    }
  }, [activeEndpoint]);

  useEffect(() => {
    if (availableModels.length > 0 && !model) {
      setModel(availableModels[0].id);
    }
  }, [availableModels]);

  const fetchModels = async () => {
    if (!activeEndpoint) return;
    
    setIsLoadingModels(true);
    try {
      const response = await fetch('https://172.187.232.176:5000/api/chats/api/fetch-models/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: activeEndpoint.baseUrl,
          apiKey: activeEndpoint.apiKey,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const modelIds = data.models;
        
        if (modelIds.length > 0) {
          // Transform the model IDs into the expected ModelData format
          const formattedModels = modelIds.map(id => ({
            id,
            object: 'model',
            owned_by: 'unknown',
            endpoint: activeEndpoint.baseUrl,
            is_free: false,
            is_early_access: false,
            pricing: {
              price: 0,
              multiplier: 1,
            },
            context_window: 0,
            max_output: 0,
          }));
          
          setAvailableModels(formattedModels);
          
          toast({
            title: "Models fetched",
            description: `Successfully fetched ${modelIds.length} models.`,
          });
        } else {
          setAvailableModels([]);
          toast({
            title: "Warning",
            description: "No image generation models found in the API response.",
          });
        }
      } else {
        setAvailableModels([]);
        toast({
          title: "Error fetching models",
          description: data.error || "Could not fetch models from the endpoint.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([]);
      toast({
        title: "Failed to load models",
        description: error instanceof Error ? error.message : "Could not connect to the server",
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
      const client = new OpenAI({
        apiKey: activeEndpoint.apiKey,
        baseURL: activeEndpoint.baseUrl,
        dangerouslyAllowBrowser: true
      });

      let fullPrompt = prompt;
      if (negativePrompt) {
        fullPrompt += `. Avoid: ${negativePrompt}`;
      }

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-8 px-4 max-w-4xl"
    >
      <Card className="border border-border/50 shadow-lg overflow-hidden backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border/30">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>AI Image Generator</span>
          </CardTitle>
          <EndpointSelector />
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="prompt" className="data-[state=active]:bg-primary/20">
                Prompt
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-secondary/20">
                Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="prompt" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Prompt
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe the image you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full resize-none border-primary/20 focus:border-primary/50 transition-all rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="negative-prompt" className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-secondary" />
                  Negative Prompt (what to avoid)
                </Label>
                <Textarea
                  id="negative-prompt"
                  placeholder="Elements you want to exclude from the image..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={3}
                  className="w-full resize-none border-secondary/20 focus:border-secondary/50 transition-all rounded-xl"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="model" className="text-sm font-medium">Model</Label>
                  <Select value={model} onValueChange={setModel} disabled={isLoadingModels || availableModels.length === 0}>
                    <SelectTrigger id="model" className="rounded-xl border-muted/50 focus:border-primary/50 transition-all">
                      <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select model"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {availableModels.map((modelData) => (
                        <SelectItem key={modelData.id} value={modelData.id}>
                          {modelData.id} {modelData.is_free ? "✓ Free" : ""}
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
                      <RefreshCw size={12} className="mr-1 animate-spin" />
                      Loading available models...
                    </p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="size" className="text-sm font-medium">Image Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger id="size" className="rounded-xl border-muted/50 focus:border-primary/50 transition-all">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="256x256">256 x 256 (Small)</SelectItem>
                      <SelectItem value="512x512">512 x 512 (Medium)</SelectItem>
                      <SelectItem value="1024x1024">1024 x 1024 (Large)</SelectItem>
                      <SelectItem value="1024x1792">1024 x 1792 (Portrait)</SelectItem>
                      <SelectItem value="1792x1024">1792 x 1024 (Landscape)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="steps" className="text-sm font-medium">Generation Steps</Label>
                  <span className="text-sm font-medium bg-muted/50 px-2 py-1 rounded-md">{steps}</span>
                </div>
                <Slider
                  id="steps"
                  min={10}
                  max={50}
                  step={1}
                  value={[steps]}
                  onValueChange={(value) => setSteps(value[0])}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground italic">
                  Higher steps may improve quality but take longer to generate
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <AnimatePresence>
            {generatedImage && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="mt-8"
              >
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Generated Image
                </h3>
                <div className="border border-border/30 rounded-xl overflow-hidden bg-muted/20 flex justify-center p-4 shadow-inner">
                  <img 
                    src={generatedImage} 
                    alt="Generated from prompt" 
                    className="max-h-[500px] object-contain rounded-lg shadow-md"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-3 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-t border-border/30">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={generateImage} 
              disabled={isGenerating || !prompt.trim() || !activeEndpoint || !model}
              className="w-full sm:w-auto py-6 px-8 rounded-xl font-medium text-base shadow-md hover:shadow-lg transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          </motion.div>
          
          {generatedImage && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                variant="outline" 
                onClick={downloadImage}
                className="w-full sm:w-auto py-6 px-8 rounded-xl font-medium text-base border-primary/20 hover:bg-primary/10 transition-all"
              >
                <Download size={18} className="mr-2" />
                Download Image
              </Button>
            </motion.div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ImageGenerator;