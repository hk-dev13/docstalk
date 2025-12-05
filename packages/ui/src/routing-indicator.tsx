"use client";

import { Sparkles, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "./lib/utils";

interface RoutingIndicatorProps {
  detectedSource?: string;
  confidence: number;
  queryType: "meta" | "specific" | "ambiguous";
  wasAutoDetected: boolean;
  reasoning?: string;
  onOverride?: (newSource: string) => void;
}

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

  // Normalisasi source
  const s = detectedSource.toLowerCase();

  // Mappings from specific source to Category
  const mappings: Record<string, string> = {
    // Frontend
    react: "frontend",
    nextjs: "frontend",
    vue: "frontend",
    typescript: "frontend",
    javascript: "frontend",

    // Backend
    nodejs: "backend",
    express: "backend",
    fastapi: "backend",
    go: "backend",
    rust: "backend",

    // Database
    postgresql: "database",
    mysql: "database",
    mongodb: "database",
    prisma: "database",
    supabase: "database",

    // Cloud
    docker: "cloud_infra",
    kubernetes: "cloud_infra",
    aws: "cloud_infra",

    // Styling
    tailwind: "styling",
    css: "styling",

    // AI/ML
    gemini: "ai_ml",
    openai: "ai_ml",

    // Direct matches
    frontend: "frontend",
    backend: "backend",
    fullstack: "fullstack",
    systems: "systems",
    cloud_infra: "cloud_infra",
    ai_ml: "ai_ml",
    database: "database",
    styling: "styling",
    general: "general",
    meta: "meta",
  };

  // Icon definitions (Path + Display Label + Color)
  const categoryConfig: Record<
    string,
    { icon: string; label: string; color: string }
  > = {
    frontend: {
      icon: "/assets/support_docs/frontend.svg",
      label: "Frontend",
      color: "bg-blue-500",
    },
    backend: {
      icon: "/assets/support_docs/backend.svg",
      label: "Backend",
      color: "bg-green-500",
    },
    fullstack: {
      icon: "/assets/support_docs/fullstack.svg",
      label: "Fullstack",
      color: "bg-indigo-500",
    },
    systems: {
      icon: "/assets/support_docs/systems.svg",
      label: "Systems",
      color: "bg-red-500",
    },
    cloud_infra: {
      icon: "/assets/support_docs/cloud_infra.svg",
      label: "Cloud Infra",
      color: "bg-purple-500",
    },
    ai_ml: {
      icon: "/assets/support_docs/ai_ml.svg",
      label: "AI & ML",
      color: "bg-pink-500",
    },
    database: {
      icon: "/assets/support_docs/database.svg",
      label: "Database",
      color: "bg-cyan-500",
    },
    styling: {
      icon: "/assets/support_docs/styling.svg",
      label: "Styling",
      color: "bg-teal-500",
    },
    general: {
      icon: "/assets/support_docs/general.svg",
      label: "General",
      color: "bg-gray-500",
    },
    meta: {
      icon: "/assets/logo/logo_docstalk.svg",
      label: "DocsTalk",
      color: "bg-primary",
    },
  };

  // Specific overrides if needed (e.g. Python has its own icon)
  const specificConfig: Record<
    string,
    { icon: string; label: string; color: string }
  > = {
    python: {
      icon: "/assets/support_docs/icons8-python.svg",
      label: "Python",
      color: "bg-yellow-500",
    },
  };

  // Resolve Config
  let config = specificConfig[s];
  if (!config) {
    const category = mappings[s] || "general";
    config = categoryConfig[category] || categoryConfig["general"];
  }

  // If specific source name is better than category label?
  // Maybe keep category label for consistency, OR capitalize detectedSource.
  // Let's use Capitalized detectedSource if it's specific, but using the category icon.
  const displayLabel = config.label;
  // Actually, user probably wants to see "React" not "Frontend" if React was detected,
  // but we are sharing icons.
  // Let's stick to the Category Label for now as it matches the icon.

  const confidenceColor =
    confidence >= 90
      ? "text-green-600 dark:text-green-400"
      : confidence >= 70
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-orange-600 dark:text-orange-400";

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50 text-xs">
      {/* Source Icon & Name */}
      <div className="flex items-center gap-2">
        <div
          className={cn("w-4 h-4 transition-colors", config.color)}
          style={{
            maskImage: `url(${config.icon})`,
            WebkitMaskImage: `url(${config.icon})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
        <span
          className={cn(
            "font-medium bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70"
          )}
        >
          {displayLabel}
        </span>
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
      <div className="flex items-center gap-1 text-muted-foreground ml-2 border-l border-border/50 pl-2">
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
            <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[140px] max-h-[300px] overflow-y-auto">
              {Object.entries(categoryConfig).map(([key, src]) => (
                <button
                  key={key}
                  onClick={() => {
                    onOverride(key);
                    setShowOverride(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 text-xs"
                >
                  <div
                    className={cn("w-3.5 h-3.5 shrink-0", src.color)}
                    style={{
                      maskImage: `url(${src.icon})`,
                      WebkitMaskImage: `url(${src.icon})`,
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskPosition: "center",
                    }}
                  />
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
            <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-[10px] text-muted-foreground max-w-[200px] whitespace-normal z-50">
              {reasoning}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
