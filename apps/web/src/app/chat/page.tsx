"use client";

import Image from "next/image";

import { useState, useEffect, useRef } from "react";
import {
  ChatMessage as ChatMessageType,
  streamChat,
  getUsageStats,
  createConversation,
  getUserConversations,
  getConversationMessages,
  saveMessage,
} from "@/lib/api-client";
import {
  ChatMessage,
  ChatInput,
  ConversationSidebar,
  ModeToggle,
  AuthModal,
  AnimatedLogo,
} from "@docstalk/ui";
import {
  BookOpen,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  PanelLeft,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

const GUEST_MESSAGE_LIMIT = 5;
const GUEST_MESSAGES_KEY = "docstalk_guest_messages";

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>("nextjs");
  const [responseMode, setResponseMode] = useState<string>("friendly");
  const [usage, setUsage] = useState<{ count: number; limit: number }>({
    count: 0,
    limit: 30,
  });
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Swipe Gesture Logic
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && !isSidebarCollapsed) {
      // Swipe Left -> Close Sidebar
      setIsSidebarCollapsed(true);
    }
    if (isRightSwipe && isSidebarCollapsed) {
      // Swipe Right -> Open Sidebar
      setIsSidebarCollapsed(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  useEffect(() => {
    setMounted(true);

    // Load guest messages from localStorage if not logged in
    if (!user) {
      const savedMessages = localStorage.getItem(GUEST_MESSAGES_KEY);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed.messages || []);
          setGuestMessageCount(parsed.count || 0);
        } catch (error) {
          console.error("Failed to load guest messages:", error);
        }
      }
      setIsLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save guest messages to localStorage
  useEffect(() => {
    if (!user && messages.length > 0) {
      localStorage.setItem(
        GUEST_MESSAGES_KEY,
        JSON.stringify({
          messages,
          count: guestMessageCount,
        })
      );
    }
  }, [messages, guestMessageCount, user]);

  // Fetch usage and conversations on load
  useEffect(() => {
    if (user?.id && user?.primaryEmailAddress?.emailAddress) {
      setIsLoadingConversations(true);
      // Fetch usage
      getUsageStats(user.id, user.primaryEmailAddress.emailAddress)
        .then((stats) => {
          if (stats && typeof stats.count === "number") {
            setUsage({ count: stats.count, limit: stats.limit });
          }
        })
        .catch(console.error);

      // Fetch conversations
      getUserConversations(user.id)
        .then((data) => {
          if (data.conversations) {
            setConversations(data.conversations);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingConversations(false));
    }
  }, [user]);

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      setCurrentConversationId(conversationId);
      // Optional: Add loading state for messages here if desired
      const data = await getConversationMessages(conversationId);
      if (data.messages) {
        const loadedMessages = data.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleSendMessage = async (query: string) => {
    // Guest user handling
    if (!user) {
      // Check if guest has reached message limit
      if (guestMessageCount >= GUEST_MESSAGE_LIMIT) {
        setShowAuthModal(true);
        return;
      }

      // Add user message
      const userMessage: ChatMessageType = { role: "user", content: query };
      setMessages((prev) => [...prev, userMessage]);

      setIsStreaming(true);
      let assistantContent = "";
      const assistantMessage: ChatMessageType = {
        role: "assistant",
        content: "",
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // For guests, use a mock guest ID
        const guestId = "guest_" + Date.now();
        const guestEmail = "guest@temporary.com";

        // Prepare conversation history
        const history = messages
          .filter((msg) => msg.content && msg.content.trim().length > 0)
          .map((msg) => ({ role: msg.role, content: msg.content }));

        // Stream response without saving to database
        let fullResponse = "";
        let thinkingContent = "";

        for await (const chunk of streamChat(
          query,
          selectedSource,
          guestId,
          guestEmail,
          history,
          responseMode
        )) {
          fullResponse += chunk;

          // Parse thinking tags
          const thinkingMatch = fullResponse.match(
            /<thinking>([\s\S]*?)<\/thinking>/
          );
          if (thinkingMatch) {
            thinkingContent = thinkingMatch[1].trim();
          } else if (
            fullResponse.includes("<thinking>") &&
            !fullResponse.includes("</thinking>")
          ) {
            // Still streaming thinking content
            const start = fullResponse.indexOf("<thinking>") + 10;
            thinkingContent = fullResponse.slice(start).trim();
          }

          // Clean content (remove thinking tags)
          const cleanContent = fullResponse
            .replace(/<thinking>[\s\S]*?<\/thinking>/, "")
            .trim();

          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              ...assistantMessage,
              content: cleanContent,
              reasoning: thinkingContent,
            },
          ]);
        }

        // Increment guest message counter
        setGuestMessageCount((prev) => prev + 1);

        // Show auth modal if this was the last allowed message
        if (guestMessageCount + 1 >= GUEST_MESSAGE_LIMIT) {
          setTimeout(() => setShowAuthModal(true), 1000); // Show after a brief delay
        }
      } catch (error: any) {
        console.error("Stream error:", error);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: "Sorry, an error occurred. Please try again.",
          },
        ]);
      } finally {
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...prev[prev.length - 1], isStreaming: false },
        ]);
      }
      return;
    }

    // Authenticated user handling (existing logic)
    const userMessage: ChatMessageType = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);

    setIsStreaming(true);
    let assistantContent = "";
    const assistantMessage: ChatMessageType = {
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) throw new Error("No email found");

      // Create conversation if it's a new chat
      let conversationId = currentConversationId;
      if (!conversationId) {
        const convData = await createConversation(
          user.id,
          selectedSource,
          query.slice(0, 50),
          email
        );
        conversationId = convData.conversationId;
        setCurrentConversationId(conversationId);

        // Refresh conversations list
        const listData = await getUserConversations(user.id);
        if (listData.conversations) {
          setConversations(listData.conversations);
        }
      }

      if (!conversationId) throw new Error("Failed to initialize conversation");

      // Save user message
      await saveMessage(conversationId, "user", query);

      // Prepare conversation history (exclude the current user message and streaming assistant message)
      const history = messages
        .filter((msg) => msg.content && msg.content.trim().length > 0)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      // Stream response with conversation context
      let fullResponse = "";
      let thinkingContent = "";

      for await (const chunk of streamChat(
        query,
        selectedSource,
        user.id,
        email,
        history,
        responseMode
      )) {
        fullResponse += chunk;

        // Parse thinking tags
        const thinkingMatch = fullResponse.match(
          /<thinking>([\s\S]*?)<\/thinking>/
        );
        if (thinkingMatch) {
          thinkingContent = thinkingMatch[1].trim();
        } else if (
          fullResponse.includes("<thinking>") &&
          !fullResponse.includes("</thinking>")
        ) {
          // Still streaming thinking content
          const start = fullResponse.indexOf("<thinking>") + 10;
          thinkingContent = fullResponse.slice(start).trim();
        }

        // Clean content (remove thinking tags)
        const cleanContent = fullResponse
          .replace(/<thinking>[\s\S]*?<\/thinking>/, "")
          .trim();

        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            ...assistantMessage,
            content: cleanContent,
            reasoning: thinkingContent,
          },
        ]);
      }

      // Save assistant message
      await saveMessage(conversationId, "assistant", assistantContent);

      // Update usage after successful chat
      setUsage((prev) => ({ ...prev, count: prev.count + 1 }));
    } catch (error: any) {
      console.error("Stream error:", error);

      let errorMessage = "Sorry, an error occurred. Please try again.";

      if (error.message === "LIMIT_REACHED") {
        errorMessage =
          "🚫 Monthly limit reached (30/30). Please upgrade to continue.";
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...prev[prev.length - 1], isStreaming: false },
      ]);
    }
  };

  return (
    <div
      className="flex h-screen bg-background overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Sidebar */}
      {mounted && user && (
        <ConversationSidebar
          userId={user.id}
          currentConversationId={currentConversationId || undefined}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          conversations={conversations}
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          isLoading={isLoadingConversations}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Header */}
        <header className="glass-header px-6 py-3">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 👇 TAMBAHKAN TOMBOL INI (Hanya muncul di Mobile) 👇 */}
              <button
                onClick={toggleSidebar} // Pastikan nama fungsi ini sesuai dengan state Anda
                className="md:hidden p-2 -ml-2 mr-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <AnimatedLogo variant="header" className="w-full h-full" />
                </div>
                <div>
                  <h1 className="text-lg font-bold gradient-text leading-none">
                    DocsTalk
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-0.5">
                    Smart Documentation Assistant
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Usage Badge */}
              <div
                className={`hidden md:flex px-3 py-1.5 rounded-full text-xs font-medium border ${
                  usage.count >= usage.limit
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-secondary/50 text-muted-foreground border-border/50"
                }`}
              >
                {usage.count} / {usage.limit} queries
              </div>

              <div className="ml-2 flex items-center gap-2">
                <ModeToggle />
                {mounted && (
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox:
                          "h-9 w-9 ring-2 ring-border/50 hover:ring-primary/50 transition-all",
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="relative mb-8 group">
                  <div className="absolute inset-0 bg-linear-to-r from-indigo-500 to-purple-600 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
                  <div className="relative bg-background border border-border/50 p-6 rounded-3xl shadow-2xl shadow-indigo-500/10 w-24 h-24 flex items-center justify-center">
                    <AnimatedLogo variant="loading" className="w-full h-full" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold tracking-tight mb-3">
                  <span className="bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Smart Documentation Assistant
                  </span>
                </h2>
                <p className="text-muted-foreground max-w-lg mb-10 text-lg leading-relaxed">
                  Your intelligent companion for documentation.
                  <br className="hidden sm:block" />
                  <span className="text-sm opacity-70">
                    Expanding soon to more platforms.
                  </span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {[
                    {
                      label: "Create Next.js app",
                      query: "How do I create a Next.js app?",
                    },
                    {
                      label: "Explain React hooks",
                      query: "Explain React hooks",
                    },
                    {
                      label: "TypeScript generics",
                      query: "What are TypeScript generics?",
                    },
                    {
                      label: "Server Components",
                      query: "How to use Server Components?",
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      disabled={isStreaming}
                      className="group text-left p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/20 transition-all duration-200"
                    >
                      <span className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted-foreground opacity-70">
                        "{item.query}"
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} {...msg} />
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="relative z-10">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming || usage.count >= usage.limit}
            selectedSource={selectedSource}
            onSelectedSourceChange={setSelectedSource}
            responseMode={responseMode}
            onResponseModeChange={setResponseMode}
          />
        </div>
      </div>

      {/* Auth Modal for Guest Users */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        messageCount={guestMessageCount}
      />
    </div>
  );
}
