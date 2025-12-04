"use client";

import Image from "next/image";

import { useState, useEffect, useRef } from "react";
import {
  ChatMessage as ChatMessageType,
  streamChatAuto,
  getUsageStats,
  createConversation,
  getUserConversations,
  getConversationMessages,
  saveMessage,
  submitFeedback,
  updateConversation,
  getSessionContext,
  type RoutingMetadata,
  type ClarificationResponse,
  type SessionContext,
} from "@/lib/api-client";
import {
  ChatMessage,
  ChatInput,
  ConversationSidebar,
  ModeToggle,
  AuthModal,
  AnimatedLogo,
  ClarificationFlow,
  RoutingIndicator,
  Button,
} from "@docstalk/ui";
import {
  BookOpen,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  PanelLeft,
  Terminal,
  Code,
  FileCode,
  Server,
} from "lucide-react";
import { UserButton, useUser, SignInButton, useAuth } from "@clerk/nextjs";

const GUEST_MESSAGE_LIMIT = 5;
const GUEST_MESSAGES_KEY = "docstalk_guest_messages";

export default function ChatPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseMode, setResponseMode] = useState<string>("auto");
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

  // Router & Clarification State
  const [routingMetadata, setRoutingMetadata] =
    useState<RoutingMetadata | null>(null);
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationOptions, setClarificationOptions] =
    useState<ClarificationResponse | null>(null);
  const [pendingQuery, setPendingQuery] = useState("");
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    null
  );

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
    const loadData = async () => {
      if (user?.id && user?.primaryEmailAddress?.emailAddress) {
        setIsLoadingConversations(true);
        try {
          const token = await getToken();
          if (!token) return;

          // Fetch usage
          getUsageStats(
            user.id,
            user.primaryEmailAddress.emailAddress,
            token
          ).then((stats) => {
            if (stats && typeof stats.count === "number") {
              setUsage({ count: stats.count, limit: stats.limit });
            }
          });

          // Fetch conversations
          getUserConversations(user.id, token)
            .then((data) => {
              if (data.conversations) {
                setConversations(data.conversations);
              }
            })
            .finally(() => setIsLoadingConversations(false));
        } catch (error) {
          console.error("Failed to load user data:", error);
          setIsLoadingConversations(false);
        }
      }
    };

    loadData();
  }, [user, getToken]);

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      setCurrentConversationId(conversationId);
      const token = await getToken();
      if (!token) return;

      // Optional: Add loading state for messages here if desired
      const data = await getConversationMessages(conversationId, token);
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

  const handleTogglePin = async (conversationId: string, isPinned: boolean) => {
    try {
      const token = await getToken();
      if (!token) return;

      // Optimistic update
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === conversationId ? { ...c, is_pinned: isPinned } : c
          )
          .sort((a, b) => {
            // Sort by pinned (desc) then updated_at (desc)
            if (a.is_pinned === b.is_pinned) {
              return (
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
              );
            }
            return (a.is_pinned ? 1 : 0) > (b.is_pinned ? 1 : 0) ? -1 : 1;
          })
      );

      await updateConversation(conversationId, { is_pinned: isPinned }, token);

      // Re-fetch to ensure sync (optional, but good for consistency)
      if (user?.id) {
        const data = await getUserConversations(user.id, token);
        if (data.conversations) setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      // Revert on error (could be improved)
    }
  };

  const handleSendMessage = async (query: string) => {
    // Unified entry point: delegates to handleAutoDetectSend
    await handleAutoDetectSend(query);
  };
  // Unified message handler for both Auto and Manual modes
  const handleAutoDetectSend = async (
    query: string,
    forcedSource?: string,
    skipUserMessage: boolean = false
  ) => {
    // Reset clarification state
    setShowClarification(false);
    setClarificationOptions(null);
    setRoutingMetadata(null);

    // Guest user handling (check limit first)
    if (!user && guestMessageCount >= GUEST_MESSAGE_LIMIT) {
      setShowAuthModal(true);
      return;
    }

    // Add user message to UI
    if (!skipUserMessage) {
      const userMessage: ChatMessageType = { role: "user", content: query };
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsStreaming(true);
    const assistantMessage: ChatMessageType = {
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const email =
        user?.primaryEmailAddress?.emailAddress || "guest@temporary.com";
      const userId = user?.id || `guest_${Date.now()}`;
      // Get token if user is logged in
      const token = user ? await getToken() : "";

      let conversationId = currentConversationId;

      // For authenticated users, ensure conversation exists
      if (user && token) {
        if (!conversationId) {
          try {
            // Use forcedSource if available, otherwise default to "nextjs" for initial conversation creation
            // "auto" is not a valid doc_source ID in the database
            const initialSource =
              forcedSource && forcedSource !== "auto" ? forcedSource : "nextjs";

            const convData = await createConversation(
              user.id,
              initialSource,
              token,
              query.slice(0, 50),
              email
            );
            conversationId = convData.conversationId;
            setCurrentConversationId(conversationId);

            // Refresh conversations list
            getUserConversations(user.id, token).then((data) => {
              if (data.conversations) setConversations(data.conversations);
            });
          } catch (err) {
            console.error("Failed to create conversation:", err);
            // Continue anyway, just won't save to DB
          }
        }

        // Save user message to DB
        if (conversationId && !skipUserMessage) {
          await saveMessage(conversationId, "user", query, token).catch(
            console.error
          );
        }
      }

      // Prepare conversation history
      const history = messages
        .filter((msg) => msg.content && msg.content.trim().length > 0)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      let fullResponse = "";
      let thinkingContent = "";

      // Determine source to use: forcedSource takes precedence
      const sourceToUse = forcedSource;

      // Stream with auto-detect API (used for both auto and manual)
      console.log("[Unified Handler] Starting stream:", { query, sourceToUse });

      // If guest, we might need a different handling or just pass empty token if backend allows (it shouldn't for protected routes)
      // But wait, our backend now PROTECTS everything.
      // So guests CANNOT use the API anymore unless we allow public access or have a guest token.
      // The requirement was "Security Review", and we locked it down.
      // Guest access will fail with 401.
      // We should probably handle that gracefully or disable guest access in UI.
      // For now, let's pass the token. If empty (guest), it will fail, which is correct security behavior.

      for await (const event of streamChatAuto(
        query,
        userId,
        email,
        token || "", // Pass token
        conversationId || undefined,
        history,
        responseMode,
        sourceToUse
      )) {
        console.log("[Unified Handler] Event:", event.event);

        switch (event.event) {
          case "routing":
            const metadata = event.data as RoutingMetadata;
            setRoutingMetadata(metadata);

            // Update assistant message with queryType for UI warning
            setMessages((prev) => [
              ...prev.slice(0, -1),
              {
                ...assistantMessage,
                content: fullResponse, // Preserve current content
                queryType: metadata.queryType,
              },
            ]);
            break;

          case "clarification":
            console.log("🔥🔥🔥 [DEBUG] CLARIFICATION EVENT RECEIVED 🔥🔥🔥");
            console.log("Data:", event.data);

            // Force state updates
            const options = event.data as ClarificationResponse;
            console.log("Setting options:", options);

            setClarificationOptions(options);
            setShowClarification(true);
            setPendingQuery(query);
            setIsStreaming(false);

            // Remove assistant message
            setMessages((prev) => {
              console.log(
                "Removing assistant message, prev length:",
                prev.length
              );
              return prev.slice(0, -1);
            });

            console.log("State updated. ShowClarification should be true.");
            return;



          case "references":
            const references = event.data as Array<{
              title: string;
              url: string;
              snippet: string;
            }>;
            setMessages((prev) => [
              ...prev.slice(0, -1),
              {
                ...assistantMessage,
                content: fullResponse,
                references,
              },
            ]);
            break;

          case "content":
            const chunk = (event.data as { chunk: string }).chunk;
            fullResponse += chunk;

            setMessages((prev) => [
              ...prev.slice(0, -1),
              {
                ...assistantMessage,
                content: fullResponse.trim(),
              },
            ]);
            break;

          case "done":
            // Streaming complete
            break;
        }
      }

      // Post-stream actions

      // 1. Save assistant message for authenticated users
      // Save assistant message
      if (token && conversationId) {
        // Extract references from the last message state
        const finalReferences = assistantMessage.references;
        
        const saveResult = await saveMessage(
          conversationId,
          "assistant",
          fullResponse,
          token,
          finalReferences,
          undefined // tokensUsed not available from stream yet
        );

        // Update message with ID for feedback
        if (saveResult && saveResult.messageId) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              ...assistantMessage,
              content: fullResponse,
              references: finalReferences,
              id: saveResult.messageId, // Store ID
            } as any,
          ]);
        }
      }

      // 2. Increment guest counter
      if (!user) {
        setGuestMessageCount((prev) => prev + 1);
        if (guestMessageCount + 1 >= GUEST_MESSAGE_LIMIT) {
          setTimeout(() => setShowAuthModal(true), 1000);
        }
      }

      // 3. Refresh session context
      if (conversationId && token) {
        getSessionContext(conversationId, token).then((ctx) => {
          if (ctx) setSessionContext(ctx);
        });
      }

      // 4. Update usage stats
      if (user) {
        setUsage((prev) => ({ ...prev, count: prev.count + 1 }));
      }
    } catch (error: any) {
      console.error("Auto-detect error:", error);

      let errorMessage = "Sorry, an error occurred. Please try again.";
      if (error.message === "LIMIT_REACHED") {
        errorMessage =
          "🚫 Monthly limit reached (30/30). Please upgrade to continue.";
      } else if (error.message?.includes("401")) {
        errorMessage = "🔒 Please sign in to continue.";
        setShowAuthModal(true);
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

  // Handle clarification selection
  const handleClarificationSelect = async (sourceId: string) => {
    setShowClarification(false);

    // Call unified handler with forced source
    if (pendingQuery) {
      await handleAutoDetectSend(pendingQuery, sourceId, true);
      setPendingQuery("");
    }
  };

  const handleFeedback = async (
    messageId: string,
    type: "up" | "down",
    reason?: string
  ) => {
    try {
      const token = await getToken();
      if (!token) return;

      await submitFeedback(messageId, type, token, reason);
      console.log("Feedback submitted successfully");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const handleRegenerate = async () => {
    if (isStreaming) return;
    
    // Find last assistant message index
    const lastMsgIndex = messages.length - 1;
    if (lastMsgIndex < 0) return;
    
    const lastMsg = messages[lastMsgIndex];
    if (lastMsg.role !== "assistant") return;

    // Find the preceding user message
    const userMsgIndex = lastMsgIndex - 1;
    if (userMsgIndex < 0 || messages[userMsgIndex].role !== "user") return;

    const userQuery = messages[userMsgIndex].content;

    // Remove the last assistant message
    setMessages((prev) => prev.slice(0, -1));

    // Re-send the query, skipping adding the user message again
    await handleAutoDetectSend(userQuery, undefined, true);
  };

  const handleShare = async (content: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "DocsTalk Response",
          text: content,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(content);
      // You might want to add a toast here if available, or just rely on the user noticing
      // For now we'll just log it as we don't have a toast component ready
      console.log("Shared to clipboard");
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
          onTogglePin={handleTogglePin}
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
              <button
                onClick={toggleSidebar}
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
                {mounted &&
                  (user ? (
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox:
                            "h-9 w-9 ring-2 ring-border/50 hover:ring-primary/50 transition-all",
                        },
                      }}
                    />
                  ) : (
                    <SignInButton mode="modal">
                      <Button
                        size="sm"
                        variant="default"
                        className="font-semibold"
                      >
                        Sign In
                      </Button>
                    </SignInButton>
                  ))}
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 scroll-smooth">
          <div className="max-w-4xl mx-auto">
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
                  <span className="text-sm opacity-70 block">
                    Expanding soon to more platforms.
                  </span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {[
                    {
                      label: "Create Next.js app",
                      query: "How do I create a Next.js app?",
                      icon: <Terminal className="w-5 h-5 text-blue-500" />,
                    },
                    {
                      label: "Explain React hooks",
                      query: "Explain React hooks",
                      icon: <Code className="w-5 h-5 text-purple-500" />,
                    },
                    {
                      label: "TypeScript generics",
                      query: "What are TypeScript generics?",
                      icon: <FileCode className="w-5 h-5 text-yellow-500" />,
                    },
                    {
                      label: "Server Components",
                      query: "How to use Server Components?",
                      icon: <Server className="w-5 h-5 text-green-500" />,
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      disabled={isStreaming}
                      className="group relative text-left p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/5 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <div className="flex items-start gap-3 relative z-10">
                        <div className="p-2 rounded-lg bg-background/50 border border-border/50 group-hover:border-primary/20 transition-colors">
                          {item.icon}
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                            {item.label}
                          </span>
                          <span className="block text-xs text-muted-foreground opacity-70">
                            "{item.query}"
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    role={msg.role}
                    content={msg.content}
                    references={msg.references}
                    isStreaming={msg.isStreaming}
                    reasoning={msg.reasoning}
                    queryType={msg.queryType}
                    onRegenerate={
                      idx === messages.length - 1 && msg.role === "assistant"
                        ? handleRegenerate
                        : undefined
                    }
                    onFeedback={
                      msg.role === "assistant" && (msg as any).id
                        ? (type, reason) =>
                            handleFeedback((msg as any).id, type, reason)
                        : undefined
                    }
                    onShare={
                      msg.role === "assistant"
                        ? () => handleShare(msg.content)
                        : undefined
                    }
                  />
                ))}

                {/* Routing Indicator */}
                {routingMetadata && (
                  <div className="flex justify-center my-4">
                    <RoutingIndicator
                      queryType={routingMetadata.queryType}
                      detectedSource={routingMetadata.detectedSource}
                      confidence={routingMetadata.confidence}
                      reasoning={routingMetadata.reasoning}
                      wasAutoDetected={routingMetadata.wasAutoDetected}
                    />
                  </div>
                )}

                {/* Clarification Flow */}
                {showClarification && clarificationOptions && (
                  <ClarificationFlow
                    message={clarificationOptions.message}
                    options={clarificationOptions.options}
                    onSelect={handleClarificationSelect}
                  />
                )}

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
