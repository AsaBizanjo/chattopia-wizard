import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup';
};

const AuthModals: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose,
  initialView = 'login'
}) => {
  const [view, setView] = useState<'login' | 'signup'>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, signup } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (view === 'login') {
        await login(email, password);
        toast({
          title: "Success",
          description: "You've been logged in successfully.",
        });
      } else {
        await signup(username, email, password);
        toast({
          title: "Account created",
          description: "Your account has been created successfully.",
        });
      }
      onClose();
    } catch (error) {
      let message = "An unexpected error occurred";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleView = () => {
    setView(view === 'login' ? 'signup' : 'login');
    
    setEmail('');
    setPassword('');
    setUsername('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] glass border-thin">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {view === 'login' ? 'Welcome back' : 'Create an account'}
          </DialogTitle>
          <DialogDescription>
            {view === 'login' 
              ? 'Enter your credentials to sign in to your account' 
              : 'Fill in your details to create a new account'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {view === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="focus-visible-ring"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus-visible-ring"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="focus-visible-ring"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full transition-all-ease"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? 'Processing...' 
              : view === 'login' 
                ? 'Sign in' 
                : 'Create account'}
          </Button>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {view === 'login' 
                ? "Don't have an account? " 
                : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={toggleView}
              className="text-primary hover:underline focus:outline-none"
            >
              {view === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModals;