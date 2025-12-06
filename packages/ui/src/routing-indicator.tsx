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

  // Mappings from specific doc source to ecosystem (synced with database)
  // Based on: docs/database/ecosystem-mapping-guide.md
  const mappings: Record<string, string> = {
    // Frontend Web Ecosystem (frontend_web)
    react: "frontend_web",
    nextjs: "frontend_web",
    typescript: "frontend_web",
    vue: "frontend_web", // Planned

    // JS Backend Ecosystem (js_backend)
    nodejs: "js_backend",
    express: "js_backend",

    // Python Ecosystem (python)
    python: "python",
    fastapi: "python", // Planned

    // Systems Programming Ecosystem (systems)
    rust: "systems",
    go: "systems",

    // Database & ORM Ecosystem (database)
    prisma: "database",
    postgresql: "database", // Mapped but may not have chunks yet

    // Styling & UI Ecosystem (styling)
    tailwind: "styling",

    // Cloud & Infrastructure Ecosystem (cloud_infra)
    docker: "cloud_infra", // Planned

    // AI & ML Ecosystem (ai_ml)
    meta: "ai_ml", // DocsTalk platform queries

    // Special
    general: "general",
    docstalk: "meta",

    // Direct ecosystem ID matches (when ecosystem ID is passed directly)
    frontend_web: "frontend_web",
    js_backend: "js_backend",
    ai_ml: "ai_ml",
    cloud_infra: "cloud_infra",
    database: "database",
    styling: "styling",
    systems: "systems",
  };

  // Ecosystem category config (for fallback display)
  const categoryConfig: Record<
    string,
    { icon: string; label: string; color: string }
  > = {
    frontend_web: {
      icon: "/assets/support_docs/frontend.svg",
      label: "Frontend Web",
      color: "bg-blue-500",
    },
    js_backend: {
      icon: "/assets/support_docs/backend.svg",
      label: "JS Backend",
      color: "bg-green-500",
    },
    python: {
      icon: "/assets/support_docs/icons8-python.svg",
      label: "Python",
      color: "bg-yellow-500",
    },
    systems: {
      icon: "/assets/support_docs/systems.svg",
      label: "Systems",
      color: "bg-orange-500",
    },
    cloud_infra: {
      icon: "/assets/support_docs/cloud_infra.svg",
      label: "Cloud & Infra",
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

  // Specific doc source overrides (individual source icons for better UX)
  const specificConfig: Record<
    string,
    { icon: string; label: string; color: string }
  > = {
    // Frontend Web sources
    react: {
      icon: "/assets/support_docs/icons8-react.svg",
      label: "React",
      color: "bg-cyan-400",
    },
    nextjs: {
      icon: "/assets/support_docs/icons8-nextjs.svg",
      label: "Next.js",
      color: "bg-black dark:bg-white",
    },
    typescript: {
      icon: "/assets/support_docs/icons8-typescript.svg",
      label: "TypeScript",
      color: "bg-blue-600",
    },
    vue: {
      icon: "/assets/support_docs/icons8-vue-js.svg",
      label: "Vue.js",
      color: "bg-emerald-500",
    },

    // JS Backend sources
    nodejs: {
      icon: "/assets/support_docs/icons8-nodejs.svg",
      label: "Node.js",
      color: "bg-green-600",
    },
    express: {
      icon: "/assets/support_docs/icons8-express-js.svg",
      label: "Express",
      color: "bg-gray-600",
    },

    // Python sources
    python: {
      icon: "/assets/support_docs/icons8-python.svg",
      label: "Python",
      color: "bg-yellow-500",
    },
    fastapi: {
      icon: "/assets/support_docs/icons8-fastapi.svg",
      label: "FastAPI",
      color: "bg-teal-500",
    },

    // Systems sources
    rust: {
      icon: "/assets/support_docs/icons8-rust-programming-language.svg",
      label: "Rust",
      color: "bg-orange-600",
    },
    go: {
      icon: "/assets/support_docs/icons8-go.svg",
      label: "Go",
      color: "bg-cyan-500",
    },

    // Database sources
    prisma: {
      icon: "/assets/support_docs/icons8-prisma-orm.svg",
      label: "Prisma",
      color: "bg-indigo-500",
    },
    postgresql: {
      icon: "/assets/support_docs/icons8-postgresql.svg",
      label: "PostgreSQL",
      color: "bg-blue-700",
    },

    // Styling sources
    tailwind: {
      icon: "/assets/support_docs/icons8-tailwind-css.svg",
      label: "Tailwind CSS",
      color: "bg-sky-500",
    },

    // Cloud sources
    docker: {
      icon: "/assets/support_docs/icons8-docker.svg",
      label: "Docker",
      color: "bg-blue-500",
    },

    // Meta/DocsTalk
    meta: {
      icon: "/assets/logo/logo_docstalk.svg",
      label: "DocsTalk",
      color: "bg-primary",
    },
    docstalk: {
      icon: "/assets/logo/logo_docstalk.svg",
      label: "DocsTalk",
      color: "bg-primary",
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
