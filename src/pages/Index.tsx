
import React from 'react';
import Layout from '@/components/Layout';
import ChatWindow from '@/components/ChatWindow';
import { useAuth } from '@/contexts/AuthContext';

const Index: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
        <ChatWindow />
      
    </Layout>
  );
};

export default Index;
