// components/Layout.tsx
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import AuthModals from './AuthModals';
import { Button } from '@/components/ui/button';
import { LogIn, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const { theme, toggleTheme } = useTheme();
  
  const openLoginModal = () => {
    setAuthView('login');
    setIsAuthModalOpen(true);
  };
  
  const openSignupModal = () => {
    setAuthView('signup');
    setIsAuthModalOpen(true);
  };
  
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse-soft text-xl font-medium">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex flex-col animate-fade-in bg-background text-foreground">
          <header className="sticky top-0 border-b border-border z-10 bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold">ChatLLM</h1>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={openLoginModal}>
                  Log in
                </Button>
                <Button onClick={openSignupModal}>
                  Sign up
                </Button>
              </div>
            </div>
          </header>
          
          <main className="flex-grow flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full mx-auto text-center space-y-6">
              <h2 className="text-3xl font-semibold">Welcome to ChatLLM</h2>
              <p className="text-muted-foreground">
                A beautifully designed interface for interacting with AI language models.
                Sign in to start a conversation.
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center mt-6">
                <Button size="lg" onClick={openSignupModal} className="animate-pulse-soft">
                  Get started
                </Button>
                <Button size="lg" variant="outline" onClick={openLoginModal}>
                  Log in
                </Button>
              </div>
            </div>
          </main>
        </div>
      
        <AuthModals
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialView={authView}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        {/* Mobile sidebar */}
        <div 
          className={`fixed inset-0 z-40 transform ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } transition-transform duration-300 ease-in-out md:hidden`}
        >
          <div className="relative z-50 h-full">
            <Sidebar />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-2" 
              onClick={toggleMobileSidebar}
            >
              <X size={20} />
            </Button>
          </div>
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" 
            onClick={toggleMobileSidebar}
          />
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-12 md:hidden border-b border-border flex items-center px-4 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMobileSidebar}
            >
              <Menu size={20} />
            </Button>
            <h1 className="ml-3 font-semibold">ChatLLM</h1>
          </header>
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto will-change-scroll">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;