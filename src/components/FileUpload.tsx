import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, File, FileText, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEndpoint } from '@/contexts/EndpointContext';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesSelected, 
  selectedFiles, 
  onRemoveFile 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const endpointContext = useEndpoint();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      // Check if Raggie is enabled in the active endpoint
      if (!endpointContext.activeEndpoint?.ragieEnabled) {
        toast({
          title: "File upload not available",
          description: "Please enable Raggie AI in your endpoint settings to use file uploads.",
          variant: "destructive"
        });
        return;
      }
      
      // Check file types and sizes
      const validFiles = files.filter(file => {
        const validTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'text/plain'
        ];
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!validTypes.includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type.`,
            variant: "destructive"
          });
          return false;
        }
        
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 10MB size limit.`,
            variant: "destructive"
          });
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length > 0) {
        // Just pass the files to the parent component
        // The actual upload to Raggie AI will happen in the ChatContext
        onFilesSelected(validFiles);
        
        toast({
          title: "Files ready",
          description: `${validFiles.length} file(s) ready to be sent.`,
          variant: "default"
        });
      }
    }
    
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    // Check if Raggie is enabled before allowing file selection
    if (!endpointContext.activeEndpoint?.ragieEnabled) {
      toast({
        title: "File upload not available",
        description: "Please enable Raggie AI in your endpoint settings to use file uploads.",
        variant: "destructive"
      });
      return;
    }
    
    fileInputRef.current?.click();
  };
  
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image size={16} />;
    } else if (file.type === 'application/pdf') {
      return <FileText size={16} />;
    } else {
      return <File size={16} />;
    }
  };

  return (
    <div className="flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt"
        multiple
      />
      
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        onClick={handleButtonClick}
        title="Attach files"
        disabled={!endpointContext.activeEndpoint?.ragieEnabled}
      >
        <Paperclip size={18} className={!endpointContext.activeEndpoint?.ragieEnabled ? "opacity-50" : ""} />
      </Button>
      
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedFiles.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1 text-xs"
            >
              {getFileIcon(file)}
              <span className="max-w-[120px] truncate">{file.name}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1"
                onClick={() => onRemoveFile(index)}
              >
                <X size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;