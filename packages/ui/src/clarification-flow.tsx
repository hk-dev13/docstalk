"use client";

import { HelpCircle } from "lucide-react";

interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

interface ClarificationFlowProps {
  message?: string;
  options: ClarificationOption[];
  onSelect: (sourceId: string) => void;
}

const defaultIcons: Record<string, string> = {
  nextjs: "▲",
  react: "⚛️",
  typescript: "🔷",
};

export function ClarificationFlow({
  message = "Which framework are you asking about?",
  options,
  onSelect,
}: ClarificationFlowProps) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/20 border border-border/50 shadow-lg max-w-md mx-auto my-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{message}</h3>
      </div>

      {/* Options */}
      <div className="w-full space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className="w-full p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <span className="text-2xl mt-0.5">
                {option.icon || defaultIcons[option.id] || "📚"}
              </span>

              {/* Content */}
              <div className="flex-1">
                <div className="font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                  {option.label}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {option.description}
                </div>
              </div>

              {/* Arrow indicator on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-primary">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-muted-foreground text-center mt-4 opacity-60">
        Select a framework to get the most relevant answer
      </p>
    </div>
  );
}
