"use client";

import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Pin,
  PinOff,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { Button } from "./button";
import { cn } from "./lib/utils";
import { Skeleton } from "./skeleton";

interface Conversation {
  id: string;
  title: string;
  doc_source: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
}

interface ConversationSidebarProps {
  userId: string;
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  conversations: Conversation[];
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isLoading?: boolean;
}

export function ConversationSidebar({
  userId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onTogglePin,
  conversations,
  isCollapsed,
  toggleSidebar,
  isLoading,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to group conversations by date
  const groupConversations = (convs: Conversation[]) => {
    const groups: Record<string, Conversation[]> = {
      Pinned: [],
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    };

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfLastWeek = new Date(startOfToday);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    convs.forEach((conv) => {
      if (conv.is_pinned) {
        groups["Pinned"].push(conv);
        return;
      }

      const date = new Date(conv.updated_at);
      if (date >= startOfToday) {
        groups["Today"].push(conv);
      } else if (date >= startOfYesterday) {
        groups["Yesterday"].push(conv);
      } else if (date >= startOfLastWeek) {
        groups["Previous 7 Days"].push(conv);
      } else {
        groups["Older"].push(conv);
      }
    });

    return groups;
  };

  const groups = groupConversations(filteredConversations);

  const getIconPath = (source: string) => {
    // Normalisasi source ke lowercase
    const s = source.toLowerCase();

    // Map specific sources to categories/icons
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

      // Cloud & Infra
      docker: "cloud_infra",
      kubernetes: "cloud_infra",
      aws: "cloud_infra",

      // Styling
      tailwind: "styling",
      css: "styling",

      // AI/ML
      gemini: "ai_ml",
      openai: "ai_ml",

      // Direct category matches
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

    // Dictionary for icon paths
    const iconPaths: Record<string, string> = {
      python: "/assets/support_docs/icons8-python.svg", // Keep specific if exists and desired
      cloud_infra: "/assets/support_docs/cloud_infra.svg",
      frontend: "/assets/support_docs/frontend.svg",
      backend: "/assets/support_docs/backend.svg",
      fullstack: "/assets/support_docs/fullstack.svg",
      systems: "/assets/support_docs/systems.svg",
      ai_ml: "/assets/support_docs/ai_ml.svg",
      database: "/assets/support_docs/database.svg",
      styling: "/assets/support_docs/styling.svg",
      general: "/assets/support_docs/general.svg",
      meta: "/assets/logo/logo_docstalk.svg",
    };

    // 1. Check if source is directly in iconPaths (e.g. 'python')
    if (iconPaths[s]) return iconPaths[s];

    // 2. Check if source maps to a category
    const category = mappings[s];
    if (category && iconPaths[category]) return iconPaths[category];

    // 3. Fallback to general
    return iconPaths["general"];
  };

  const ConversationItem = ({
    conv,
    isCollapsed,
  }: {
    conv: Conversation;
    isCollapsed: boolean;
  }) => {
    const iconPath = getIconPath(conv.doc_source);

    return (
      <div
        onClick={() => onSelectConversation(conv.id)}
        title={isCollapsed ? conv.title : undefined}
        className={cn(
          "group w-full rounded-md transition-all duration-200 relative overflow-hidden flex items-center border border-transparent cursor-pointer mb-1",
          currentConversationId === conv.id
            ? "bg-secondary text-foreground font-medium"
            : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
          isCollapsed ? "justify-center p-2" : "text-left px-3 py-2"
        )}
      >
        {isCollapsed ? (
          iconPath ? (
            <div
              className={cn(
                "h-5 w-5 shrink-0 bg-current transition-opacity",
                currentConversationId === conv.id
                  ? "opacity-100"
                  : "opacity-70 group-hover:opacity-100"
              )}
              style={{
                maskImage: `url(${iconPath})`,
                WebkitMaskImage: `url(${iconPath})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
          ) : (
            <MessageSquare
              className={cn(
                "h-5 w-5 shrink-0",
                currentConversationId === conv.id ? "text-primary" : ""
              )}
            />
          )
        ) : (
          <>
            <div className="mr-3 shrink-0">
              {iconPath ? (
                <div
                  className={cn(
                    "h-4 w-4 bg-current transition-opacity",
                    currentConversationId === conv.id
                      ? "opacity-100"
                      : "opacity-70 group-hover:opacity-100"
                  )}
                  style={{
                    maskImage: `url(${iconPath})`,
                    WebkitMaskImage: `url(${iconPath})`,
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
            </div>
            <span className="truncate text-sm flex-1">{conv.title}</span>

            {/* Pin Action (Only visible on hover or if pinned) */}
            {onTogglePin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(conv.id, !conv.is_pinned);
                }}
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-background/50 rounded",
                  conv.is_pinned && "opacity-100 text-primary"
                )}
              >
                {conv.is_pinned ? (
                  <PinOff className="h-3 w-3" />
                ) : (
                  <Pin className="h-3 w-3" />
                )}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-90 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={cn(
          "flex flex-col h-full glass-panel border-r-0 transition-all duration-300 ease-in-out group/sidebar",
          "fixed inset-y-0 left-0 z-100 bg-background/95 backdrop-blur-xl shadow-2xl",
          isCollapsed ? "-translate-x-full" : "translate-x-0",
          "w-[85vw] max-w-[320px]",
          "md:relative md:translate-x-0 md:shadow-none md:bg-transparent",
          isCollapsed ? "md:w-[72px]" : "md:w-[280px]" // Reduced desktop width slightly for cleaner look
        )}
      >
        {/* Header & New Chat */}
        <div className={cn("p-4 pb-2", isCollapsed && "px-2")}>
          {!isCollapsed ? (
            <Button
              onClick={onNewConversation}
              variant="outline"
              className="w-full justify-start gap-3 h-11 rounded-xl bg-background hover:bg-secondary/50 border-dashed border-border hover:border-primary/30 transition-all group"
            >
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Plus className="h-4 w-4" />
              </div>
              <span className="font-medium text-muted-foreground group-hover:text-foreground">
                New Chat
              </span>
            </Button>
          ) : (
            <Button
              onClick={onNewConversation}
              size="icon"
              variant="ghost"
              className="w-10 h-10 rounded-xl hover:bg-secondary mx-auto flex"
            >
              <Plus className="h-5 w-5 text-primary" />
            </Button>
          )}
        </div>

        {/* Search & Collapse Toggle Row */}
        <div
          className={cn(
            "flex items-center px-4 mb-2 gap-2",
            isCollapsed && "flex-col px-2"
          )}
        >
          {!isCollapsed && (
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-secondary/30 border border-transparent focus:border-border rounded-md text-xs transition-all focus:outline-none focus:bg-secondary/50"
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  {!isCollapsed && (
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-50">
              <History
                className={cn("mb-2", isCollapsed ? "h-5 w-5" : "h-8 w-8")}
              />
              {!isCollapsed && (
                <span className="text-xs">No history found</span>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Render Groups */}
              {(Object.keys(groups) as Array<keyof typeof groups>).map(
                (groupName) => {
                  const groupItems = groups[groupName];
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={groupName}>
                      {!isCollapsed && (
                        <h4 className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 px-3">
                          {groupName}
                        </h4>
                      )}
                      <div className="space-y-0.5">
                        {groupItems.map((conv) => (
                          <ConversationItem
                            key={conv.id}
                            conv={conv}
                            isCollapsed={isCollapsed}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "p-2 border-t border-border/50",
            isCollapsed && "flex justify-center"
          )}
        >
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
              isCollapsed && "px-2 justify-center"
            )}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </div>
      </div>
    </>
  );
}
