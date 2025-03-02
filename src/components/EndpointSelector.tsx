
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Settings, PlusCircle, Check } from 'lucide-react';
import { useEndpoint } from '@/contexts/EndpointContext';
import EndpointModal from './EndpointModal';

const EndpointSelector: React.FC = () => {
  const { endpoints, activeEndpoint, setActiveEndpoint } = useEndpoint();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSelectEndpoint = (id: string) => {
    setActiveEndpoint(id);
    setOpen(false);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {activeEndpoint ? activeEndpoint.name : "Select API"}
              <Settings className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search APIs..." />
              <CommandList>
                <CommandEmpty>No endpoints found.</CommandEmpty>
                <CommandGroup heading="Your Endpoints">
                  {endpoints.map((endpoint) => (
                    <CommandItem
                      key={endpoint.id}
                      value={endpoint.id}
                      onSelect={() => handleSelectEndpoint(endpoint.id)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          activeEndpoint?.id === endpoint.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {endpoint.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem onSelect={() => {
                    setOpen(false);
                    setIsModalOpen(true);
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Endpoint
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <EndpointModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default EndpointSelector;
