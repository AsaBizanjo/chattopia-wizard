// contexts/EndpointContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Endpoint = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  isActive: boolean;
  model: string; // Added model field
};

type EndpointContextType = {
  endpoints: Endpoint[];
  activeEndpoint: Endpoint | null;
  addEndpoint: (name: string, baseUrl: string, apiKey: string, model: string) => void;
  removeEndpoint: (id: string) => void;
  setActiveEndpoint: (id: string | null) => void;
  updateEndpoint: (id: string, data: Partial<Omit<Endpoint, 'id'>>) => void;
};

const EndpointContext = createContext<EndpointContextType | undefined>(undefined);

export const EndpointProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [activeEndpoint, setActiveEndpointState] = useState<Endpoint | null>(null);

  // Load endpoints from localStorage on component mount
  useEffect(() => {
    const savedEndpoints = localStorage.getItem('chat_endpoints');
    const currentEndpointId = localStorage.getItem('active_endpoint_id');
    
    if (savedEndpoints) {
      const parsedEndpoints = JSON.parse(savedEndpoints);
      setEndpoints(parsedEndpoints);
      
      if (currentEndpointId) {
        const current = parsedEndpoints.find((ep: Endpoint) => ep.id === currentEndpointId);
        if (current) {
          setActiveEndpointState(current);
        } else if (parsedEndpoints.length > 0) {
          setActiveEndpointState(parsedEndpoints[0]);
        }
      } else if (parsedEndpoints.length > 0) {
        setActiveEndpointState(parsedEndpoints[0]);
      }
    }
  }, []);

  // Save endpoints to localStorage whenever they change
  useEffect(() => {
    if (endpoints.length > 0) {
      localStorage.setItem('chat_endpoints', JSON.stringify(endpoints));
    }
    
    if (activeEndpoint) {
      localStorage.setItem('active_endpoint_id', activeEndpoint.id);
    }
  }, [endpoints, activeEndpoint]);

  const addEndpoint = (name: string, baseUrl: string, apiKey: string, model: string) => {
    const newEndpoint: Endpoint = {
      id: `endpoint_${Math.random().toString(36).substr(2, 9)}`,
      name,
      baseUrl,
      apiKey,
      model, // Added model field
      isActive: false
    };
    
    setEndpoints(prev => [...prev, newEndpoint]);
    
    // If this is the first endpoint, set it as active
    if (endpoints.length === 0) {
      setActiveEndpointState(newEndpoint);
    }
  };

  const removeEndpoint = (id: string) => {
    setEndpoints(prev => prev.filter(endpoint => endpoint.id !== id));
    
    // If removing the active endpoint, set a new active endpoint
    if (activeEndpoint && activeEndpoint.id === id) {
      const remaining = endpoints.filter(endpoint => endpoint.id !== id);
      setActiveEndpointState(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const updateEndpoint = (id: string, data: Partial<Omit<Endpoint, 'id'>>) => {
    setEndpoints(prev => 
      prev.map(endpoint => 
        endpoint.id === id ? { ...endpoint, ...data } : endpoint
      )
    );
    
    // Update active endpoint if it was the one that changed
    if (activeEndpoint && activeEndpoint.id === id) {
      setActiveEndpointState(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const setActiveEndpoint = (id: string | null) => {
    if (id === null) {
      setActiveEndpointState(null);
      return;
    }
    
    const endpoint = endpoints.find(e => e.id === id);
    if (endpoint) {
      setActiveEndpointState(endpoint);
    }
  };

  return (
    <EndpointContext.Provider
      value={{
        endpoints,
        activeEndpoint,
        addEndpoint,
        removeEndpoint,
        setActiveEndpoint,
        updateEndpoint
      }}
    >
      {children}
    </EndpointContext.Provider>
  );
};

export const useEndpoint = (): EndpointContextType => {
  const context = useContext(EndpointContext);
  if (context === undefined) {
    throw new Error('useEndpoint must be used within an EndpointProvider');
  }
  return context;
};

export default EndpointContext;