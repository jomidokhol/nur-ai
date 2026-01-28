
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { ChatSession, Message } from './types';
import { generateTitle, getGeminiResponseStream, ChatMode, FilePart } from './services/geminiService';
import { Sparkles } from 'lucide-react';

const STORAGE_KEY = 'gemini_clone_sessions';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mode, setMode] = useState<ChatMode>('fast');
  const [isMultiLanguage, setIsMultiLanguage] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  const stopStreamingRef = useRef<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTheme = localStorage.getItem('gemini_theme') as 'light' | 'dark';
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0 && !currentSessionId) {
          setCurrentSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    
    if (savedTheme) {
      setTheme(savedTheme);
    }

    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('gemini_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [currentSessionId]);

  const handleUpdateMessage = useCallback(async (messageId: string, newText: string) => {
    if (!newText.trim() || isStreaming || !currentSessionId) return;

    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      const messageIndex = s.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return s;
      const truncatedMessages = s.messages.slice(0, messageIndex);
      return { ...s, messages: truncatedMessages };
    }));

    handleSendMessage(newText);
  }, [currentSessionId, isStreaming]);

  const handleStopStreaming = useCallback(() => {
    stopStreamingRef.current = true;
    setIsStreaming(false);
  }, []);

  const handleTogglePin = useCallback((messageId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      return {
        ...s,
        messages: s.messages.map(m => 
          m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
        )
      };
    }));
  }, [currentSessionId]);

  const handleSendMessage = useCallback(async (text: string, files: FilePart[] = []) => {
    if (!text.trim() && files.length === 0) return;
    if (isStreaming) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      const newId = crypto.randomUUID();
      const newSession: ChatSession = {
        id: newId,
        title: 'New Chat',
        messages: [],
        createdAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
      sessionId = newId;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      files: files.map(f => ({ ...f }))
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages: [...s.messages, userMessage] } : s
    ));

    setIsStreaming(true);
    stopStreamingRef.current = false;
    const modelMessageId = crypto.randomUUID();
    const modelMessage: Message = {
      id: modelMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      sourceInfo: "Guest Session: Optimized multi-lingual reasoning."
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, messages: [...s.messages, modelMessage] } : s
    ));

    try {
      const currentSess = sessions.find(s => s.id === sessionId);
      const history = (currentSess?.messages || []).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      let finalPrompt = text;
      if (isMultiLanguage) {
        const langs = selectedLanguages.length > 0 ? selectedLanguages.join(', ') : "Bengali, English, Hindi, Urdu, and Persian";
        finalPrompt = `REPLY IN THE FOLLOWING LANGUAGES: ${langs}. Structure the response clearly with headings for each language.\n\nUser Question: ${text}`;
      }

      const stream = await getGeminiResponseStream(finalPrompt, history, mode, files);
      let fullContent = '';

      for await (const chunk of stream) {
        if (stopStreamingRef.current) break;
        const textChunk = chunk.text || '';
        fullContent += textChunk;
        
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { 
                ...s, 
                messages: s.messages.map(m => 
                  m.id === modelMessageId ? { ...m, content: fullContent } : m
                ) 
              } 
            : s
        ));
      }

      if (currentSess?.title === 'New Chat' || !currentSess) {
        const newTitle = await generateTitle(text);
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, title: newTitle } : s
        ));
      }

    } catch (error: any) {
      console.error("Streaming error:", error);
      let errorMessage = "Sorry, I encountered an error. Please check your connection and try again.";
      
      // Handle Quota Exhausted (429) specifically
      if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
        errorMessage = "⚠️ Quota Exceeded: You have reached the Nur AI API rate limit. Please wait a moment or check your billing/quota plan at ai.google.dev.";
      }

      if (!stopStreamingRef.current) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { 
                ...s, 
                messages: s.messages.map(m => 
                  m.id === modelMessageId ? { ...m, content: errorMessage } : m
                ) 
              } 
            : s
        ));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [currentSessionId, isStreaming, sessions, mode, isMultiLanguage, selectedLanguages]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#131314] flex flex-col items-center justify-center z-[1000] overflow-hidden">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full gemini-gradient loader-pulse blur-2xl opacity-40 absolute inset-0"></div>
          <div className="w-24 h-24 rounded-full gemini-gradient flex items-center justify-center relative shadow-2xl">
            <Sparkles size={48} className="text-white animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-medium text-white gemini-text-gradient animate-pulse tracking-wide">Initializing Guest Access...</h2>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300`}>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          setCurrentSessionId(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={createNewChat}
        onDeleteSession={deleteSession}
        theme={theme}
        onOpenHelp={() => setShowHelpModal(true)}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <ChatInterface 
          session={currentSession}
          onSendMessage={handleSendMessage}
          onUpdateMessage={handleUpdateMessage}
          onStopStreaming={handleStopStreaming}
          onTogglePin={handleTogglePin}
          isStreaming={isStreaming}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          setMode={setMode}
          isMultiLanguage={isMultiLanguage}
          setIsMultiLanguage={setIsMultiLanguage}
          selectedLanguages={selectedLanguages}
          setSelectedLanguages={setSelectedLanguages}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          showHelpModal={showHelpModal}
          setShowHelpModal={setShowHelpModal}
        />
      </main>
    </div>
  );
};

export default App;
