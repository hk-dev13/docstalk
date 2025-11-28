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
} from "lucide-react";
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

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      {/* 1. BACKDROP (Layar gelap di belakang sidebar saat mode HP) */}
      {/* Hanya muncul jika di layar kecil (md:hidden) DAN sidebar sedang terbuka (!isCollapsed) */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-90 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={toggleSidebar} // Klik gelap untuk tutup sidebar
        />
      )}

      {/* 2. SIDEBAR UTAMA */}
      <div
        className={cn(
          // --- Base Styles (Gaya Dasar) ---
          "flex flex-col h-full glass-panel border-r-0 transition-all duration-300 ease-in-out group/sidebar",

          // --- MOBILE Styles (HP - Mode Overlay/Melayang) ---
          "fixed inset-y-0 left-0 z-100 bg-background/95 backdrop-blur-xl shadow-2xl",
          // Logika Mobile: Jika collapsed, sembunyi ke kiri. Jika tidak, muncul.
          isCollapsed ? "-translate-x-full" : "translate-x-0",
          // Lebar fix di mobile
          "w-[85vw] max-w-[320px]",

          // --- DESKTOP Styles (Laptop - Mode Relative/Diam) ---
          // Reset posisi jadi relative (tidak melayang)
          "md:relative md:translate-x-0 md:shadow-none md:bg-transparent",
          // Logika Lebar Desktop: Icon Mode (72px) vs Full Mode (80 = 320px)
          isCollapsed ? "md:w-[72px]" : "md:w-80"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "p-4 flex items-center",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {!isCollapsed && (
            <button
              onClick={onNewConversation}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30 mr-2"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">New Chat</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isCollapsed && "h-10 w-10"
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* New Chat Button (Collapsed Mode) */}
        {isCollapsed && (
          <div className="px-2 pb-4 flex justify-center">
            <button
              onClick={onNewConversation}
              className="p-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all duration-200 shadow-lg shadow-primary/20"
              title="New Chat"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Search (Expanded Only) */}
        {!isCollapsed && (
          <div className="px-4 pb-2 animate-in fade-in duration-300">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-secondary/50 border-transparent focus:border-primary/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin">
          {isLoading ? (
            // Skeleton Loading State
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 p-3",
                  isCollapsed && "justify-center"
                )}
              >
                <Skeleton className="h-5 w-5 rounded-md shrink-0" />
                {!isCollapsed && (
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                )}
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div
              className={cn(
                "text-center text-muted-foreground",
                isCollapsed ? "pt-4" : "p-8"
              )}
            >
              {!isCollapsed ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <History className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">No history</p>
                </>
              ) : (
                <History className="h-5 w-5 mx-auto opacity-50" />
              )}
            </div>
          ) : (
            filteredConversations
              .slice(0, isCollapsed ? 5 : undefined)
              .map((conv) => {
                const getIconPath = (source: string) => {
                  const map: Record<string, string> = {
                    nextjs: "/assets/support_docs/icons8-nextjs.svg",
                    react: "/assets/support_docs/icons8-react.svg",
                    typescript: "/assets/support_docs/icons8-typescript.svg",
                    tailwind: "/assets/support_docs/icons8-tailwind-css.svg",
                    nodejs: "/assets/support_docs/icons8-nodejs.svg",
                    express: "/assets/support_docs/icons8-express-js.svg",
                    go: "/assets/support_docs/icons8-go.svg",
                    python: "/assets/support_docs/icons8-python.svg",
                    rust: "/assets/support_docs/icons8-rust-programming-language.svg",
                    prisma: "/assets/support_docs/icons8-prisma-orm.svg",
                  };
                  return map[source.toLowerCase()] || null;
                };

                const iconPath = getIconPath(conv.doc_source);

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    title={isCollapsed ? conv.title : undefined}
                    className={cn(
                      "group w-full rounded-lg transition-all duration-200 relative overflow-hidden flex items-center border border-transparent cursor-pointer",
                      currentConversationId === conv.id
                        ? "bg-secondary/80 text-foreground border-border/50 shadow-sm"
                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
                      isCollapsed ? "justify-center p-3" : "text-left p-3"
                    )}
                  >
                    {/* Active Indicator */}
                    {currentConversationId === conv.id && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                    )}

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
                            currentConversationId === conv.id
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                      )
                    ) : (
                      <div className="flex items-start gap-3 pl-2 w-full overflow-hidden">
                        {iconPath ? (
                          <div
                            className={cn(
                              "h-4 w-4 mt-1 shrink-0 bg-current transition-opacity",
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
                              "h-4 w-4 mt-1 shrink-0",
                              currentConversationId === conv.id
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium truncate",
                              currentConversationId === conv.id
                                ? "text-primary"
                                : "text-foreground"
                            )}
                          >
                            {conv.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground border border-border/50">
                              {conv.doc_source}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 truncate">
                              {formatDate(conv.updated_at)}
                            </span>
                          </div>
                        </div>

                        {/* Pin Action */}
                        {!isCollapsed && onTogglePin && (
                          <div
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 flex gap-1",
                              conv.is_pinned
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100 transition-opacity"
                            )}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin(conv.id, !conv.is_pinned);
                              }}
                              className="p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                              title={
                                conv.is_pinned
                                  ? "Unpin conversation"
                                  : "Pin conversation"
                              }
                            >
                              {conv.is_pinned ? (
                                <PinOff className="h-3.5 w-3.5" />
                              ) : (
                                <Pin className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Pinned Indicator (Collapsed) */}
                        {isCollapsed && conv.is_pinned && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full ring-1 ring-background" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>
    </>
  );
}
