import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Settings, PlusCircle, Check, Trash2, Edit2 } from 'lucide-react';
import { useEndpoint } from '@/contexts/EndpointContext';
import EndpointModal from './EndpointModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const EndpointSelector: React.FC = () => {
  const { endpoints, activeEndpoint, setActiveEndpoint, removeEndpoint } = useEndpoint();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [endpointToDelete, setEndpointToDelete] = useState<string | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);

  const handleSelectEndpoint = (id: string) => {
    setActiveEndpoint(id);
    setOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, endpointId: string) => {
    e.stopPropagation();
    setEndpointToDelete(endpointId);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, endpointId: string) => {
    e.stopPropagation();
    setEditingEndpoint(endpointId);
    setIsModalOpen(true);
    setOpen(false);
  };

  const handleConfirmDelete = () => {
    if (endpointToDelete) {
      removeEndpoint(endpointToDelete);
      if (activeEndpoint?.id === endpointToDelete) {
        setActiveEndpoint(null);
      }
    }
    setDeleteDialogOpen(false);
    setEndpointToDelete(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEndpoint(null);
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
                      className="flex justify-between"
                    >
                      <div className="flex items-center">
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            activeEndpoint?.id === endpoint.id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {endpoint.name}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Edit2
                          className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer"
                          onClick={(e) => handleEditClick(e, endpoint.id)}
                        />
                        <Trash2
                          className="h-4 w-4 text-destructive hover:text-destructive/80 cursor-pointer"
                          onClick={(e) => handleDeleteClick(e, endpoint.id)}
                        />
                      </div>
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

      <EndpointModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        editEndpointId={editingEndpoint}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EndpointSelector;