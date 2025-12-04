"use client";

import { Sparkles, ChevronDown } from "lucide-react";
import { useState } from "react";

interface RoutingIndicatorProps {
  detectedSource?: string;
  confidence: number;
  queryType: "meta" | "specific" | "ambiguous";
  wasAutoDetected: boolean;
  reasoning?: string;
  onOverride?: (newSource: string) => void;
}

const sourceIcons: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  nextjs: { icon: "▲", label: "Next.js", color: "text-foreground" },
  react: { icon: "⚛️", label: "React", color: "text-blue-500" },
  typescript: { icon: "🔷", label: "TypeScript", color: "text-blue-600" },
  meta: { icon: "🏢", label: "DocsTalk Platform", color: "text-purple-500" },

  // Ecosystems
  frontend_web: { icon: "🎨", label: "Frontend Web", color: "text-blue-500" },
  js_backend: { icon: "🟢", label: "JS Backend", color: "text-green-500" },
  python: { icon: "🐍", label: "Python Ecosystem", color: "text-yellow-500" },
  systems: { icon: "⚙️", label: "Systems Programming", color: "text-red-500" },
  cloud_infra: { icon: "☁️", label: "Cloud & Infra", color: "text-purple-500" },
  ai_ml: { icon: "🤖", label: "AI & ML", color: "text-pink-500" },
  database: { icon: "🗄️", label: "Database", color: "text-cyan-500" },
  styling: { icon: "💅", label: "Styling", color: "text-teal-500" },
  general: { icon: "🧠", label: "General Knowledge", color: "text-gray-500" },
};

export function RoutingIndicator({
  detectedSource,
  confidence,
  queryType,
  wasAutoDetected,
  reasoning,
  onOverride,
}: RoutingIndicatorProps) {
  const [showOverride, setShowOverride] = useState(false);

  if (!detectedSource) return null;

  const source = sourceIcons[detectedSource] || {
    icon: "📚",
    label: detectedSource,
    color: "text-muted-foreground",
  };

  const confidenceColor =
    confidence >= 90
      ? "text-green-600 dark:text-green-400"
      : confidence >= 70
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-orange-600 dark:text-orange-400";

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50 text-xs">
      {/* Source Icon & Name */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">{source.icon}</span>
        <span className={`font-medium ${source.color}`}>{source.label}</span>
      </div>

      {/* Confidence Badge (if > 70%) */}
      {confidence > 70 && queryType === "specific" && (
        <div
          className={`px-2 py-0.5 rounded-full bg-background/50 ${confidenceColor} font-semibold`}
        >
          {confidence}%
        </div>
      )}

      {/* Detection Method */}
      <div className="flex items-center gap-1 text-muted-foreground">
        {wasAutoDetected ? (
          <>
            <Sparkles className="h-3 w-3" />
            <span>Auto-detected</span>
          </>
        ) : (
          <span>Manual selection</span>
        )}
      </div>

      {/* Override Dropdown */}
      {onOverride && (
        <div className="relative ml-auto">
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-background/80 transition-colors"
          >
            <span className="text-[10px] text-muted-foreground">Change</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {showOverride && (
            <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
              {Object.entries(sourceIcons)
                .filter(([key]) => key !== "meta")
                .map(([key, src]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onOverride(key);
                      setShowOverride(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 text-xs"
                  >
                    <span>{src.icon}</span>
                    <span>{src.label}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Reasoning Tooltip (optional) */}
      {reasoning && (
        <div className="group/tooltip relative ml-1">
          <span className="cursor-help text-muted-foreground/50 hover:text-muted-foreground">
            ℹ️
          </span>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block">
            <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-[10px] text-muted-foreground max-w-[200px] whitespace-normal">
              {reasoning}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
