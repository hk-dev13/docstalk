"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Button } from "./button";
import { Send, Sparkles, ChevronDown, Globe, Bot } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  responseMode: string;
  onResponseModeChange: (mode: string) => void;
  onlineSearchEnabled?: boolean;
  onOnlineSearchToggle?: (enabled: boolean) => void;
}

export function ChatInput({
  onSend,
  disabled,
  responseMode,
  onResponseModeChange,
  onlineSearchEnabled = false,
  onOnlineSearchToggle,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  return (
    <div className="p-4 bg-linear-to-t from-background via-background to-transparent">
      <div className="w-full max-w-4xl mx-auto px-4">
        <div className="relative group rounded-2xl bg-secondary/40 border border-border/50 shadow-lg shadow-black/5 ring-1 ring-white/5 focus-within:ring-primary/50 focus-within:shadow-[0_0_30px_-5px_rgba(var(--primary-rgb),0.3)] focus-within:border-primary/50 focus-within:bg-background transition-all duration-300 backdrop-blur-xl">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to know?"
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-[200px] min-h-[24px]"
          />

          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div className="flex items-center gap-2">
              {/* Response Mode Selector */}
              <div className="relative group/mode">
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <Bot className="h-3.5 w-3.5 text-foreground group-hover/mode:text-primary transition-colors" />
                </div>
                <select
                  value={responseMode}
                  onChange={(e) => onResponseModeChange(e.target.value)}
                  className="appearance-none pl-7 pr-6 py-1.5 rounded-lg bg-secondary/20 backdrop-blur-md border border-white/10 hover:bg-secondary/40 hover:border-white/20 text-xs font-medium text-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="auto" className="bg-zinc-950 text-white">
                    Auto
                  </option>
                  <option value="frontend" className="bg-zinc-950 text-white">
                    Frontend
                  </option>
                  <option value="backend" className="bg-zinc-950 text-white">
                    Backend
                  </option>
                  <option value="fullstack" className="bg-zinc-950 text-white">
                    Fullstack
                  </option>
                  <option value="debug" className="bg-zinc-950 text-white">
                    Debug
                  </option>
                  <option
                    value="architecture"
                    className="bg-zinc-950 text-white"
                  >
                    Architecture
                  </option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-foreground/50 pointer-events-none" />
              </div>

              {/* Online Search Toggle */}
              {onOnlineSearchToggle && (
                <button
                  type="button"
                  onClick={() => onOnlineSearchToggle(!onlineSearchEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    onlineSearchEnabled
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30"
                      : "bg-secondary/20 border-white/10 text-muted-foreground hover:bg-secondary/40 hover:border-white/20"
                  }`}
                  title={
                    onlineSearchEnabled
                      ? "Online search enabled"
                      : "Enable online search"
                  }
                >
                  <Globe
                    className={`h-3.5 w-3.5 ${
                      onlineSearchEnabled ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">Web</span>
                </button>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              size="icon"
              className={`h-8 w-8 rounded-lg transition-all duration-300 ${
                input.trim() && !disabled
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
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
          DocsTalk surfaces docs but might be out of date — check timestamp &
          source.
        </p>
      </div>
    </div>
  );
}
