'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from './button';
import { Send, Sparkles, ChevronDown, Globe, Bot } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedSource: string;
  onSelectedSourceChange: (source: string) => void;
  responseMode: string;
  onResponseModeChange: (mode: string) => void;
}

export function ChatInput({ 
  onSend, 
  disabled,
  selectedSource,
  onSelectedSourceChange,
  responseMode,
  onResponseModeChange
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  return (
    <div className="p-6 bg-linear-to-t from-background via-background to-transparent">
      <div className="max-w-3xl mx-auto">
        <div className="relative group rounded-3xl bg-secondary/40 border border-border/50 shadow-lg shadow-black/5 focus-within:shadow-primary/10 focus-within:border-primary/30 focus-within:bg-background transition-all duration-300 backdrop-blur-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-6 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-[200px] min-h-[60px]"
          />
          
          <div className="flex items-center justify-between px-4 pb-3 pt-2">
            <div className="flex items-center gap-2">
              {/* Source Selector */}
              <div className="relative group/source">
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground group-hover/source:text-primary transition-colors" />
                </div>
                <select
                  value={selectedSource}
                  onChange={(e) => onSelectedSourceChange(e.target.value)}
                  className="appearance-none pl-7 pr-6 py-1.5 rounded-full bg-background/50 border border-border/50 hover:bg-background hover:border-primary/30 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="nextjs">Next.js</option>
                  <option value="react">React</option>
                  <option value="typescript">TypeScript</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none opacity-70" />
              </div>

              {/* Response Mode Selector */}
              <div className="relative group/mode">
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground group-hover/mode:text-primary transition-colors" />
                </div>
                <select
                  value={responseMode}
                  onChange={(e) => onResponseModeChange(e.target.value)}
                  className="appearance-none pl-7 pr-6 py-1.5 rounded-full bg-background/50 border border-border/50 hover:bg-background hover:border-primary/30 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="bimbingan-belajar">Tutor</option>
                  <option value="simple">Simple</option>
                  <option value="technical-deep-dive">Deep Dive</option>
                  <option value="example-heavy">Examples</option>
                  <option value="summary-only">Summary</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none opacity-70" />
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              size="icon"
              className={`h-9 w-9 rounded-full transition-all duration-300 ${
                input.trim() && !disabled
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {disabled ? (
                <Sparkles className="h-4 w-4 animate-pulse" />
              ) : (
                <Send className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground text-center mt-3 opacity-60">
          Smart Documentation Assistant • Powered by DocsTalk
        </p>
      </div>
    </div>
  );
}
