
import React from 'react';
import { Plus, MessageSquare, MoreVertical, Trash2, Menu, X, Pin, User, Sparkles, HelpCircle } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  theme: 'light' | 'dark';
  onOpenHelp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  theme,
  onOpenHelp
}) => {
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const pinnedMessages = currentSession?.messages.filter(m => m.isPinned) || [];

  return (
    <>
      <div 
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="gemini-text-gradient" />
            <span className="font-bold text-base tracking-tight">Nur AI</span>
          </div>
          <button 
             onClick={() => setIsOpen(false)}
             className="p-1.5 hover:bg-[var(--hover-bg)] rounded-full text-[var(--secondary-text)] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-4">
          <button 
            onClick={onNewChat}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-full bg-[var(--hover-bg)] hover:bg-[var(--border-color)] transition-all border border-[var(--border-color)] w-full active:scale-95
            `}
          >
            <Plus size={18} className="text-[var(--text-color)]" />
            <span className="text-sm font-medium text-[var(--text-color)]">New Chat</span>
          </button>
        </div>

        {/* Sections Container */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4">
          {/* Pinned Messages */}
          {pinnedMessages.length > 0 && (
            <div className="animate-reveal">
              <h3 className="px-3 py-1.5 text-[10px] font-bold text-[var(--secondary-text)] uppercase tracking-widest flex items-center gap-2 opacity-50">
                <Pin size={10} /> Pinned
              </h3>
              <div className="space-y-1">
                {pinnedMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className="px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-[var(--text-color)] truncate cursor-default hover:bg-blue-500/10 transition-colors"
                  >
                    {msg.content.substring(0, 40)}...
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Chats */}
          <div>
            <h3 className="px-3 py-1.5 text-[10px] font-bold text-[var(--secondary-text)] uppercase tracking-widest opacity-50">Recent</h3>
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className={`
                    group flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer transition-all relative
                    ${currentSessionId === session.id ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'hover:bg-[var(--hover-bg)]'}
                  `}
                  onClick={() => onSelectSession(session.id)}
                >
                  <MessageSquare size={16} className={`${currentSessionId === session.id ? 'text-blue-500' : 'text-[var(--secondary-text)]'} flex-shrink-0`} />
                  <span className={`text-sm truncate pr-6 ${currentSessionId === session.id ? 'text-[var(--text-color)] font-medium' : 'text-[var(--secondary-text)]'}`}>{session.title}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded-full text-red-500/50 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="px-4 py-2 text-[11px] text-[var(--secondary-text)] opacity-40 italic">No recent chats</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-2">
          <button 
            onClick={onOpenHelp}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-color)] transition-all text-sm font-medium group"
          >
            <HelpCircle size={18} className="group-hover:scale-110 transition-transform" />
            <span>Help & Guidelines</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--hover-bg)] text-[var(--secondary-text)]">
            <div className="w-7 h-7 rounded-full bg-zinc-600 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
              GU
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-color)] leading-tight">Guest User</span>
              <span className="text-[9px] opacity-50 font-medium">Session localized</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
