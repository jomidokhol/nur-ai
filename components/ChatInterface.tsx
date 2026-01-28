
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Image, Mic, Plus, ChevronDown, Sparkles, User, Copy, ThumbsUp, ThumbsDown, Share2, Check, Loader2, HelpCircle, Settings, LayoutGrid, MicOff, ArrowDown, Sun, Moon, Zap, GraduationCap, Brain, Pencil, X as CloseIcon, FileIcon, Trash2, Play, Maximize2, AlertCircle, Info, Square, Pin, PinOff, FileText, Video, ExternalLink, Globe, ShieldCheck, Languages, BookOpen, AlertTriangle, UserCheck, MoreHorizontal, CheckCircle2, Paperclip, PanelLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatSession, Message, MessageFile } from '../types';
import { ChatMode, FilePart } from '../services/geminiService';

interface FileWithProgress {
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ChatInterfaceProps {
  session: ChatSession | null;
  onSendMessage: (text: string, files?: FilePart[]) => void;
  onUpdateMessage?: (messageId: string, text: string) => void;
  onStopStreaming?: () => void;
  onTogglePin?: (messageId: string) => void;
  isStreaming: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  isMultiLanguage: boolean;
  setIsMultiLanguage: (val: boolean) => void;
  selectedLanguages: string[];
  setSelectedLanguages: (langs: string[]) => void;
  onToggleSidebar: () => void;
  showHelpModal: boolean;
  setShowHelpModal: (show: boolean) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const FreeTag: React.FC<{ className?: string }> = ({ className = "" }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter bg-green-500/10 text-green-500 border border-green-500/20 ${className}`}>
    Free
  </span>
);

const SophisticatedMarkdown: React.FC<{ 
  content: string; 
  isStreaming: boolean; 
  theme: 'light' | 'dark';
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  onPreviewCode: (code: string, lang: string) => void;
  canRunCode: (lang: string) => boolean;
}> = ({ content, isStreaming, theme, onCopy, copiedId, onPreviewCode, canRunCode }) => {
  const [displayedContent, setDisplayedContent] = useState(content);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    const dripCharacters = () => {
      setDisplayedContent((prev) => {
        if (prev.length >= content.length) return content;
        const gap = content.length - prev.length;
        const increment = Math.max(1, Math.min(gap, Math.ceil(gap * 0.18)));
        const nextContent = content.substring(0, prev.length + increment);
        animationFrameRef.current = requestAnimationFrame(dripCharacters);
        return nextContent;
      });
    };

    if (content.length > displayedContent.length) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(dripCharacters);
    } else if (content !== displayedContent && content.length < displayedContent.length) {
      setDisplayedContent(content);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [content, isStreaming]);

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]} 
      components={{
        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match ? match[1] : '';
          const codeContent = String(children).replace(/\n$/, '');
          const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
          return !inline ? (
            <div className="relative group/code my-4 rounded-xl overflow-hidden border border-[var(--border-color)] shadow-lg transition-all duration-300">
              <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] backdrop-blur-md">
                <span className="text-[10px] font-mono text-[var(--secondary-text)] uppercase tracking-wider">{lang || 'code'}</span>
                <div className="flex items-center gap-2">
                  {canRunCode(lang) && (
                    <button 
                      onClick={() => onPreviewCode(codeContent, lang)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-green-500/10 text-green-500 transition-colors text-[10px] font-medium"
                    >
                      <Play size={12} /> Run
                    </button>
                  )}
                  <button onClick={() => onCopy(codeContent, codeId)} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--hover-bg)] transition-colors text-[10px] text-[var(--secondary-text)]">
                    {copiedId === codeId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}{copiedId === codeId ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <SyntaxHighlighter 
                style={theme === 'dark' ? vscDarkPlus : prism} 
                language={match ? match[1] : 'text'} 
                PreTag="div" 
                customStyle={{ margin: 0, borderRadius: 0, padding: '1rem', fontSize: '0.8rem', background: theme === 'dark' ? '#0a0a0a' : '#fcfcfc' }} 
                {...props}
              >
                {codeContent}
              </SyntaxHighlighter>
            </div>
          ) : <code className="bg-[var(--hover-bg)] px-1 py-0.5 rounded text-[0.8rem] font-mono text-blue-500 dark:text-blue-300" {...props}>{children}</code>;
        }
      }}
    >
      {displayedContent}
    </ReactMarkdown>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  session, 
  onSendMessage, 
  onUpdateMessage,
  onStopStreaming,
  onTogglePin,
  isStreaming, 
  theme, 
  setTheme,
  mode,
  setMode,
  isMultiLanguage,
  setIsMultiLanguage,
  selectedLanguages,
  setSelectedLanguages,
  onToggleSidebar,
  showHelpModal,
  setShowHelpModal
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithProgress[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [previewCode, setPreviewCode] = useState<{ code: string; lang: string } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hoveredInfoId, setHoveredInfoId] = useState<string | null>(null);
  
  const typingTimeoutRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const availableLangs = ['Bengali', 'English', 'Hindi', 'Urdu', 'Persian'];

  const modeConfig = {
    fast: { label: 'Fast', icon: <Zap size={14} />, description: 'Standard latency' },
    study: { label: 'Study', icon: <GraduationCap size={14} />, description: 'Tutor mode' },
    deep_think: { label: 'Deep Think', icon: <Brain size={14} />, description: 'Chain-of-thought' },
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [ { id, message, type }, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isAtBottom);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const lastMessageContent = useMemo(() => {
    if (!session?.messages.length) return '';
    return session.messages[session.messages.length - 1].content;
  }, [session?.messages]);

  useEffect(() => {
    if (!isStreaming) return;
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      if (isNearBottom) {
        scrollToBottom('auto');
      }
    }
  }, [lastMessageContent, isStreaming]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [session?.id]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results).map(result => result[0]).map(result => result.transcript).join('');
        setInputText(transcript);
        adjustTextareaHeight();
      };
      recognition.onerror = () => {
        setIsListening(false);
        addToast("Microphone error", 'error');
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    adjustTextareaHeight();
    
    setIsTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 1500);
  };

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newFiles: FileWithProgress[] = files.map((file: File) => ({
      file,
      preview: (file.type.startsWith('image/') || file.type.startsWith('video/')) ? URL.createObjectURL(file) : '',
      progress: 0,
      status: 'uploading'
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach((fileObj) => {
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 30 + 10;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          setSelectedFiles(current => 
            current.map(f => f.file === fileObj.file ? { ...f, progress: 100, status: 'done' } : f)
          );
        } else {
          setSelectedFiles(current => 
            current.map(f => f.file === fileObj.file ? { ...f, progress: prog } : f)
          );
        }
      }, 300);
    });

    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
    addToast("Asset removed", "info");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setInputText(message.content);
    setTimeout(() => {
      textareaRef.current?.focus();
      adjustTextareaHeight();
    }, 10);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (isStreaming) {
      onStopStreaming?.();
      return;
    }

    if ((inputText.trim() || selectedFiles.length > 0) && !isStreaming) {
      if (selectedFiles.some(f => f.status === 'uploading')) {
        addToast("Please wait for assets to sync", "info");
        return;
      }

      if (isListening) recognitionRef.current?.stop();
      
      const fileParts: FilePart[] = [];
      for (const item of selectedFiles) {
        try {
          const base64 = await fileToBase64(item.file);
          fileParts.push({ mimeType: item.file.type, data: base64 });
        } catch (err) {
          console.error("File error", err);
          addToast(`Error processing ${item.file.name}`, "error");
        }
      }

      if (editingMessageId && onUpdateMessage) {
        onUpdateMessage(editingMessageId, inputText);
        setEditingMessageId(null);
        addToast("Message updated");
      } else {
        onSendMessage(inputText, fileParts);
      }
      
      setInputText('');
      setSelectedFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const canRunCode = (lang: string) => {
    return ['html', 'javascript', 'js'].includes(lang.toLowerCase());
  };

  const handleCopy = (text: string, id: string = 'global') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const renderMessageFiles = (files?: MessageFile[]) => {
    if (!files || files.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mb-3">
        {files.map((file, i) => {
          if (file.mimeType.startsWith('image/')) {
            return (
              <div key={i} className="relative overflow-hidden rounded-xl border border-[var(--border-color)]">
                <img src={`data:${file.mimeType};base64,${file.data}`} alt="Asset" className="max-w-[180px] max-h-[180px] object-cover" />
              </div>
            );
          } else if (file.mimeType.startsWith('video/')) {
            return (
              <video key={i} controls className="max-w-[240px] rounded-xl border border-[var(--border-color)]">
                <source src={`data:${file.mimeType};base64,${file.data}`} type={file.mimeType} />
              </video>
            );
          } else {
            return (
              <div key={i} className="flex items-center gap-2 p-2 bg-[var(--hover-bg)] rounded-xl border border-[var(--border-color)] text-xs font-medium">
                <FileText size={14} className="text-blue-500" />
                <span className="truncate max-w-[100px]">{file.name || 'File'}</span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-color)] relative transition-colors duration-300">
      <header className="glass-header sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="p-2 hover:bg-[var(--hover-bg)] rounded-full text-[var(--secondary-text)] transition-transform active:scale-90" title="Toggle Sidebar">
            <PanelLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2 pr-2">
            <span className="text-sm font-bold text-[var(--text-color)] tracking-tight flex items-center gap-1.5">
              Nur AI <FreeTag />
            </span>
          </div>

          <div className="relative" ref={modeDropdownRef}>
            <button 
              onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
              className="flex items-center gap-1.5 text-[var(--secondary-text)] text-[10px] font-bold uppercase tracking-widest bg-[var(--input-bg)] border border-[var(--border-color)] px-3 py-1.5 rounded-full hover:border-[var(--secondary-text)] transition-all shadow-sm active:scale-95"
            >
              {modeConfig[mode].icon}
              <span className="ml-1">{modeConfig[mode].label}</span>
              <ChevronDown size={12} className={`ml-1 transition-transform ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isModeDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-xl py-2 z-50 animate-reveal backdrop-blur-xl">
                {(Object.entries(modeConfig) as [ChatMode, typeof modeConfig.fast][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { setMode(key); setIsModeDropdownOpen(false); }}
                    className={`w-full flex items-start gap-3 px-4 py-2 hover:bg-[var(--hover-bg)] text-left transition-colors ${mode === key ? 'bg-blue-500/5' : ''}`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${mode === key ? 'text-blue-500 bg-blue-500/10' : 'text-[var(--secondary-text)]'}`}>{cfg.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className={`text-xs font-bold ${mode === key ? 'text-blue-500' : 'text-[var(--text-color)]'}`}>{cfg.label}</div>
                      </div>
                      <div className="text-[9px] text-[var(--secondary-text)] font-medium leading-tight">{cfg.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center" ref={langDropdownRef}>
            <button 
              onClick={() => setIsMultiLanguage(!isMultiLanguage)} 
              className={`p-2 rounded-full transition-all flex items-center justify-center ${isMultiLanguage ? 'bg-blue-500 text-white' : 'text-[var(--secondary-text)] hover:bg-[var(--hover-bg)]'}`}
              title="Multi-language Mode"
            >
              <Languages size={18} />
            </button>
            
            {isMultiLanguage && (
              <button onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)} className="p-0.5 hover:bg-[var(--hover-bg)] rounded-full text-[var(--secondary-text)]">
                <ChevronDown size={14} className={isLangDropdownOpen ? 'rotate-180' : ''} />
              </button>
            )}

            {isLangDropdownOpen && isMultiLanguage && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-xl py-2 z-50 animate-reveal backdrop-blur-xl">
                {availableLangs.map((lang) => (
                  <button key={lang} onClick={() => toggleLanguage(lang)} className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--hover-bg)] text-xs transition-colors">
                    <span className={selectedLanguages.includes(lang) ? 'text-blue-400 font-bold' : 'text-[var(--text-color)]'}>{lang}</span>
                    {selectedLanguages.includes(lang) && <Check size={14} className="text-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-[var(--border-color)] mx-1"></div>

          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] rounded-full transition-all active:scale-90">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="ml-2 w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-white cursor-pointer hover:border-blue-500/50 transition-all shadow-md">GU</div>
        </div>
      </header>

      {isStreaming && (
        <div className="absolute top-[53px] left-0 right-0 h-[2px] z-20 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 animate-shimmer" style={{ backgroundSize: '200% 100%', width: '100%' }}></div>
        </div>
      )}

      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pt-6 pb-48 scroll-smooth">
        <div className="max-w-2xl mx-auto px-6 w-full">
          {!session || session.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-reveal">
              <div className="relative">
                <div className="w-16 h-16 rounded-full gemini-gradient animate-pulse blur-2xl opacity-30 absolute inset-0"></div>
                <h1 className="text-3xl md:text-5xl font-bold gemini-text-gradient py-1 tracking-tight">Hello, Nur AI Guest</h1>
              </div>
              <p className="text-lg md:text-xl text-[var(--secondary-text)] font-medium max-w-md leading-relaxed">Ready to assist with your creative or technical thoughts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl w-full">
                <PromptSuggestion text="Analyze video gallery assets" icon={<Video size={16} className="text-blue-400" />} />
                <PromptSuggestion text="Compare multiple logic docs" icon={<FileText size={16} className="text-red-400" />} />
                <PromptSuggestion text="Help me debug complex state" icon={<Brain size={16} className="text-purple-400" />} />
                <PromptSuggestion text="Synthesize a multi-lingual report" icon={<Languages size={16} className="text-green-400" />} />
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {session.messages.map((message, index) => {
                const isLastMessage = index === session.messages.length - 1;
                const showStreamingIndicator = isStreaming && isLastMessage && message.role === 'model';
                return (
                  <div key={message.id} className={`flex gap-4 md:gap-6 animate-reveal transition-all duration-300 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'model' && (
                      <div className="flex-shrink-0 mt-1 relative">
                        <div className={`w-8 h-8 rounded-xl gemini-gradient flex items-center justify-center relative overflow-hidden group/icon shadow-[0_0_10px_rgba(66,133,244,0.15)] ${showStreamingIndicator ? 'animate-pulse' : ''}`}>
                          <Sparkles size={16} className="text-white z-10" />
                          <div className={`absolute inset-0 bg-blue-500/20 transition-opacity duration-1000 ${showStreamingIndicator ? 'opacity-100 animate-ripple' : 'opacity-0'}`}></div>
                        </div>
                      </div>
                    )}
                    <div className={`flex flex-col max-w-full relative group transition-all duration-300 ${message.role === 'user' ? 'bg-[var(--input-bg)] px-5 py-3.5 rounded-[24px] max-w-[85%] shadow-md border border-[var(--border-color)]' : 'flex-1 rounded-2xl p-1'}`}>
                      <div className="absolute -top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                        {message.isPinned && <Pin size={10} className="text-blue-500" />}
                        {message.role === 'model' && (
                          <button onMouseEnter={() => setHoveredInfoId(message.id)} onMouseLeave={() => setHoveredInfoId(null)} className="p-1.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--secondary-text)] rounded-full hover:text-blue-500 transition-all">
                            <Info size={12} />
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        {renderMessageFiles(message.files)}
                        {message.role === 'user' ? (
                          <div className="relative">
                            <p className="text-[var(--text-color)] whitespace-pre-wrap leading-relaxed text-[0.95rem] font-medium">{message.content}</p>
                            <button onClick={() => handleEditMessage(message)} className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 hover:bg-[var(--hover-bg)] rounded-full text-[var(--secondary-text)] opacity-0 group-hover:opacity-100 transition-all"><Pencil size={14} /></button>
                          </div>
                        ) : (
                          <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : ''} text-[var(--text-color)] text-[0.95rem]`}>
                            <SophisticatedMarkdown content={message.content} isStreaming={showStreamingIndicator} theme={theme} onCopy={handleCopy} copiedId={copiedId} onPreviewCode={(code, lang) => setPreviewCode({ code, lang })} canRunCode={canRunCode} />
                            {showStreamingIndicator && (
                              <div className="mt-6 flex items-center gap-3 bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10 animate-reveal">
                                <div className="flex gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]"></div>
                                  <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 opacity-60">Thinking...</span>
                              </div>
                            )}
                            {message.content && !isStreaming && (
                              <div className="flex items-center gap-1.5 mt-6 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                <ActionButton icon={<ThumbsUp size={14} />} label="Up" />
                                <ActionButton icon={<ThumbsDown size={14} />} label="Down" />
                                <ActionButton icon={<Copy size={14} />} label="Copy" onClick={() => handleCopy(message.content, message.id)} />
                                <ActionButton icon={message.isPinned ? <PinOff size={14} className="text-blue-500" /> : <Pin size={14} />} label="Pin" onClick={() => onTogglePin?.(message.id)} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)] to-transparent pt-16 pb-6 px-4 z-10 transition-colors duration-300">
        <div className="max-w-2xl mx-auto">
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6 animate-reveal">
              {selectedFiles.map((item, idx) => (
                <div key={idx} className="relative group/file">
                  <div className="relative rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] w-16 h-16 flex items-center justify-center overflow-hidden shadow-md">
                    {item.preview ? (
                      item.file.type.startsWith('video/') ? (
                        <video src={item.preview} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.preview} className="w-full h-full object-cover" alt="Preview" />
                      )
                    ) : (
                      <FileIcon size={20} className="text-[var(--secondary-text)]" />
                    )}
                    {item.status === 'uploading' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                    )}
                  </div>
                  <button 
                    onClick={() => removeFile(idx)} 
                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all"
                    title="Remove asset"
                  >
                    <CloseIcon size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`relative transition-all duration-500 ${isFocused && isTyping ? 'shadow-[0_0_20px_rgba(66,133,244,0.1)]' : ''}`}>
            <form onSubmit={handleSubmit} className={`relative bg-[var(--input-bg)] border rounded-[28px] transition-all shadow-lg overflow-hidden ${isFocused ? 'border-blue-500/40' : 'border-[var(--border-color)]'}`}>
              <textarea 
                ref={textareaRef} 
                rows={1} 
                value={inputText} 
                onChange={handleInputChange} 
                onKeyDown={handleKeyDown} 
                onFocus={() => setIsFocused(true)}
                onBlur={() => { setIsFocused(false); setIsTyping(false); }}
                disabled={isStreaming} 
                placeholder={isStreaming ? "Thinking..." : "Ask Nur AI guest anything..."} 
                className="w-full bg-transparent px-6 py-4.5 pr-36 resize-none outline-none text-[var(--text-color)] text-[0.95rem] min-h-[60px] max-h-[180px] font-medium" 
              />
              <div className="absolute right-4 bottom-3 flex items-center gap-1">
                {!isStreaming && (
                  <>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,video/*,.pdf,.txt" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 hover:bg-white/5 rounded-full text-[var(--secondary-text)] transition-all active:scale-90" title="Add assets"><Plus size={20} /></button>
                    <button type="button" onClick={toggleListening} disabled={isStreaming} className={`p-2.5 rounded-full transition-all ${isListening ? 'bg-red-500 text-white' : 'hover:bg-white/5 text-[var(--secondary-text)]'}`} title="Voice search">{isListening ? <MicOff size={20} /> : <Mic size={20} />}</button>
                  </>
                )}
                <button type="submit" className={`ml-1 p-2.5 rounded-full transition-all transform active:scale-90 ${isStreaming ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                  {isStreaming ? <Square size={18} fill="currentColor" /> : <Send size={20} strokeWidth={2.5} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showHelpModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-reveal">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowHelpModal(false)}></div>
          <div className="relative w-full max-w-2xl bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-reveal duration-500">
            <header className="flex items-center justify-between px-8 py-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                <BookOpen size={20} className="text-blue-500" />
                <h3 className="text-xl font-bold text-white tracking-tight">System Protocol</h3>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-all"><CloseIcon size={24} /></button>
            </header>
            <div className="p-8 overflow-y-auto max-h-[50vh] space-y-6 text-sm text-zinc-300 leading-relaxed">
              <section className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[10px] tracking-widest text-blue-400">1. Private Guest Mode</h4>
                <p>All data and assets remain localized. We prioritize non-persistent state to ensure complete privacy during exploration.</p>
              </section>
              <section className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[10px] tracking-widest text-yellow-500">2. Accuracy & Hallucinations</h4>
                <p>Nur AI utilizes probabilistic logic. Always verify critical information. Technical hallucinations can occur during high-entropy reasoning tasks.</p>
              </section>
            </div>
            <footer className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
              <button onClick={() => setShowHelpModal(false)} className="px-8 py-2.5 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">Acknowledge</button>
            </footer>
          </div>
        </div>
      )}

      {previewCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-reveal">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" onClick={() => setPreviewCode(null)}></div>
          <div className="relative w-full max-w-5xl h-full max-h-[80vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-reveal">
            <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <Play size={18} className="text-green-600" />
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">Runtime Sandbox</h3>
              </div>
              <button onClick={() => setPreviewCode(null)} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400 transition-all"><CloseIcon size={24} /></button>
            </header>
            <div className="flex-1 bg-white relative">
              <iframe title="Sandbox" className="w-full h-full border-none" srcDoc={previewCode.lang === 'html' ? previewCode.code : `<html><head><style>body{font-family:system-ui;padding:32px;background:#fff;}</style></head><body><div id="out"></div><script>try{${previewCode.code}}catch(e){document.getElementById("out").innerHTML=e.message}</script></body></html>`} sandbox="allow-scripts" />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-3 pointer-events-none w-full max-w-sm px-4">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-reveal pointer-events-auto backdrop-blur-xl transition-all duration-300 ${
            toast.type === 'error' ? 'bg-red-500/90 text-white' : 
            toast.type === 'info' ? 'bg-blue-600/90 text-white' : 
            'bg-zinc-900/95 text-white'
          }`}>
            <div className={`p-1.5 rounded-lg ${toast.type === 'error' ? 'bg-white/20' : toast.type === 'info' ? 'bg-white/20' : 'bg-green-500/20 text-green-400'}`}>
              {toast.type === 'error' ? <AlertCircle size={18} /> : 
               toast.type === 'info' ? <Info size={18} /> : 
               <Check size={18} />}
            </div>
            <span className="text-[13px] font-bold whitespace-nowrap">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-3 hover:bg-white/10 rounded-full p-1.5 transition-all opacity-50 hover:opacity-100 active:scale-90">
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
  <button title={label} onClick={onClick} className="p-2.5 text-[var(--secondary-text)] hover:bg-white/5 hover:text-white rounded-xl transition-all flex items-center justify-center border border-transparent active:scale-90">
    <span className="group-hover/btn:scale-110 transition-transform">{icon}</span>
  </button>
);

const PromptSuggestion = ({ text, icon }: { text: string, icon: React.ReactNode }) => (
  <button className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-left hover:bg-white/5 hover:border-blue-500/20 transition-all group/sugg active:scale-95">
    <div className="mb-2">{icon}</div>
    <p className="text-sm text-[var(--text-color)] font-bold leading-tight line-clamp-2">{text}</p>
  </button>
);
