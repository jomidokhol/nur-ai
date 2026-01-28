
export interface MessageFile {
  mimeType: string;
  data: string;
  name?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isPinned?: boolean;
  sourceInfo?: string;
  files?: MessageFile[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface AppState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isSidebarOpen: boolean;
  isLoading: boolean;
}
