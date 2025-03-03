
export type FileAttachment = {
  name: string;
  type: string;
  url: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: FileAttachment[];
};

export type SavedPrompt = {
  id: string;
  name: string;
  content: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

export type ChatContextType = {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  editingMessageId: string | null;
  savedPrompts: SavedPrompt[];
  createNewConversation: () => void;
  selectConversation: (id: string) => void;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  deleteConversation: (id: string) => void;
  deleteMessage: (id: string) => void;
  updateMessage: (id: string, content: string) => void;
  setEditingMessage: (id: string) => void;
  cancelEditingMessage: () => void;
  resendMessage: (id: string) => void;
  savePrompt: (name: string, content: string) => void;
  deletePrompt: (id: string) => void;
};
