"use client";

import { ChevronRight, History } from "lucide-react";
import { useState } from "react";

interface ContextSwitch {
  id?: string;
  fromSource: string | null;
  toSource: string;
  query: string;
  timestamp?: string;
}

interface ContextBreadcrumbProps {
  switches: ContextSwitch[];
  currentSource: string | null;
  maxVisible?: number;
}

const sourceIcons: Record<string, { icon: string; label: string }> = {
  nextjs: { icon: "▲", label: "Next.js" },
  react: { icon: "⚛️", label: "React" },
  typescript: { icon: "🔷", label: "TypeScript" },
  meta: { icon: "🏢", label: "Platform" },
};

export function ContextBreadcrumb({
  switches,
  currentSource,
  maxVisible = 3,
}: ContextBreadcrumbProps) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Don't show if no switches or only 1 context
  if (switches.length === 0 || !currentSource) return null;

  // Get unique sources in order
  const sources = switches.map((s) => s.toSource);
  const uniqueSources = Array.from(new Set(sources));

  // Limit visible sources
  const shouldShowEllipsis = uniqueSources.length > maxVisible;
  const visibleSources = shouldShowEllipsis
    ? uniqueSources.slice(-maxVisible)
    : uniqueSources;

  return (
    <div className="relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/20 border border-border/40 text-xs">
        <History className="h-3 w-3 text-muted-foreground" />

        {/* Ellipsis if truncated */}
        {shouldShowEllipsis && (
          <>
            <button
              onClick={() => setShowFullHistory(!showFullHistory)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
              title="Show full history"
            >
              ...
            </button>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          </>
        )}

        {/* Visible sources */}
        {visibleSources.map((source, idx) => {
          const sourceInfo = sourceIcons[source] || {
            icon: "📚",
            label: source,
          };
          const isCurrent = idx === visibleSources.length - 1;

          return (
            <div key={`${source}-${idx}`} className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-1 ${
                  isCurrent
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <span>{sourceInfo.icon}</span>
                <span className="hidden sm:inline">{sourceInfo.label}</span>
              </div>
              {!isCurrent && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
          );
        })}

        {/* Current indicator */}
        <span className="text-[9px] text-muted-foreground ml-1 opacity-70">
          (current)
        </span>
      </div>

      {/* Full history tooltip */}
      {showFullHistory && switches.length > 0 && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[280px] max-w-[400px]">
            <div className="text-xs font-semibold text-foreground mb-2">
              Conversation Context History
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {switches.map((sw, idx) => {
                const fromInfo = sw.fromSource
                  ? sourceIcons[sw.fromSource] || {
                      icon: "📚",
                      label: sw.fromSource,
                    }
                  : { icon: "🚀", label: "Start" };
                const toInfo = sourceIcons[sw.toSource] || {
                  icon: "📚",
                  label: sw.toSource,
                };

                return (
                  <div
                    key={sw.id || idx}
                    className="text-[10px] text-muted-foreground py-1 border-l-2 border-border/30 pl-2 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>{fromInfo.icon}</span>
                      <span>{fromInfo.label}</span>
                      <span>→</span>
                      <span>{toInfo.icon}</span>
                      <span className="font-medium text-foreground">
                        {toInfo.label}
                      </span>
                    </div>
                    <div className="text-[9px] opacity-70 truncate max-w-[250px]">
                      "{sw.query}"
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowFullHistory(false)}
              className="text-[9px] text-primary hover:underline mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
