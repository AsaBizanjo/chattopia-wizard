
import { FileAttachment } from '../types/chat';

// Process and store file attachments
export const processFiles = (files: File[]): Promise<FileAttachment[]> => {
  return Promise.all(
    files.map(file => {
      return new Promise<FileAttachment>((resolve) => {
        const reader = new FileReader();
        
        reader.onloadend = () => {
          resolve({
            name: file.name,
            type: file.type,
            url: reader.result as string
          });
        };
        
        if (file.type.startsWith('image/')) {
          reader.readAsDataURL(file);
        } else {
          // For PDFs and other files, just store the name for now
          // In a real app, you'd upload these to a server
          resolve({
            name: file.name,
            type: file.type,
            url: '#' // Placeholder URL
          });
        }
      });
    })
  );
};

// Helper function to generate mock responses
export const getMockResponse = (message: string, endpointName: string = 'Default'): string => {
  const responses = [
    `I understand you're asking about "${message.slice(0, 20)}...". This is a placeholder response from ${endpointName} since the backend is not yet connected.`,
    `Thanks for your message. Once the Django backend is implemented, you'll get meaningful responses here. Using ${endpointName} endpoint.`,
    `This is a frontend simulation. Your actual query about "${message.slice(0, 20)}..." will be processed by the OpenAI API when the backend is connected to ${endpointName}.`,
    `I've received your message. This is a placeholder response until the OpenAI integration is implemented on the backend. Selected endpoint: ${endpointName}`,
    `In the complete application, your query would be sent to the language model via ${endpointName}. For now, this is just a simulated response.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};
