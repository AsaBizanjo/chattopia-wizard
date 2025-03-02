
import React from 'react';
import Layout from '@/components/Layout';
import ChatWindow from '@/components/ChatWindow';
import { useAuth } from '@/contexts/AuthContext';

const Index: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <div className="ml-[300px] transition-all duration-300 ease-in-out">
        <ChatWindow />
      </div>
    </Layout>
  );
};

export default Index;
