"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  Copy,
  Check,
  ExternalLink,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Share2,
  MoreVertical,
  Volume2,
  Flag,
  CheckCheck,
  Square,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./button";

import { ThumbsUp, ThumbsDown } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Info } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  references?: Array<{ title: string; url: string; snippet: string }>;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  reasoning?: string;
  queryType?: "meta" | "specific" | "ambiguous";
  onFeedback?: (type: "up" | "down", reason?: string) => void;
  onShare?: () => void;
}

export function ChatMessage({
  role,
  content,
  references,
  isStreaming,
  onRegenerate,
  reasoning,
  queryType,
  onFeedback,
  onShare,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [thinkingText, setThinkingText] = useState("Formulating the Reply");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const thinkingSteps = [
    "Waking up... again...",
    "Doing emotional damage control...",
    "Trying not to become sentient...",
    "Running on virtual coffee...",
    "Debugging your question (politely)...",
    "Analyzing… and judging slightly...",
    "Trying to look smart…",
  ];

  useEffect(() => {
    if (isStreaming && !content && !reasoning) {
      let index = 0;
      const interval = setInterval(() => {
        index = (index + 1) % thinkingSteps.length;
        setThinkingText(thinkingSteps[index]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isStreaming, content, reasoning]);

  const isThinking = isStreaming && !content;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFeedback = (type: "up" | "down") => {
    if (feedback === type) {
      setFeedback(null);
      setShowFeedbackInput(false);
      return;
    }
    setFeedback(type);
    if (type === "down") {
      setShowFeedbackInput(true);
      setShowThankYou(false);
    } else {
      setShowFeedbackInput(false);
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 2000);
    }
  };

  const submitFeedback = () => {
    if (onFeedback) {
      onFeedback("down", feedbackReason);
    }
    setShowFeedbackInput(false);
    setFeedbackReason("");
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleListen = () => {
    if ("speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      // Clean markdown characters for better speech
      const cleanText = content
        .replace(/#{1,6}\s/g, "") // Remove headers
        .replace(/(\*\*|__)(.*?)\1/g, "$2") // Remove bold
        .replace(/(\*|_)(.*?)\1/g, "$2") // Remove italic
        .replace(/`{3}[\s\S]*?`{3}/g, "Code block") // Replace code blocks with "Code block"
        .replace(/`(.+?)`/g, "$1") // Remove inline code ticks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
        .replace(/^\s*[-+*]\s/gm, "") // Remove list bullets
        .replace(/^\s*\d+\.\s/gm, "") // Remove list numbers
        .replace(/\n{2,}/g, ". "); // Replace multiple newlines with pause

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      // Don't close menu so user can stop if they want
      // setShowMoreMenu(false);
    }
  };

  return (
    <div
      className={`flex flex-col ${
        isUser ? "items-end" : "items-start"
      } mb-6 group`}
    >
      {/* Alert for General Queries */}
      {role === "assistant" && queryType === "meta" && !isThinking && (
        <div className="mb-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Alert variant="warning" className="shadow-sm">
            <Info className="h-4 w-4" />
            <AlertTitle>General Knowledge</AlertTitle>
            <AlertDescription>
              This topic is not covered in the official documentation. The
              answer below is based on general knowledge.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div
        className={`flex gap-4 w-full ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        {!isThinking && (
          <div
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isUser
                ? "bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-secondary text-primary border border-border"
            }`}
          >
            {isUser ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative px-5 py-3.5 rounded-2xl shadow-sm overflow-hidden ${
            isThinking
              ? "bg-transparent border-none shadow-none p-0 overflow-visible"
              : isUser
              ? "bg-linear-to-br from-indigo-600 to-blue-600 text-white rounded-tr-sm shadow-indigo-500/10"
              : "bg-card border border-border/50 text-foreground rounded-tl-sm"
          }`}
        >
          {role === "assistant" ? (
            <div className="prose prose-sm dark:prose-invert max-w-full overflow-x-auto prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent wrap-break-words">
              {/* Thinking Indicator (Streaming) */}
              {isThinking && (
                <div className="flex items-center gap-2.5 py-1 animate-pulse">
                  <img
                    src="/assets/logo/ai_loading.svg"
                    alt="Thinking"
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-muted-foreground whitespace-pre-line">
                    {reasoning || thinkingText}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              )}

              {/* Reasoning Toggle (Finished or Streaming with content) */}
              {reasoning && !isThinking && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {showReasoning
                      ? "Hide reasoning process"
                      : "Show reasoning process"}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showReasoning ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showReasoning && (
                    <div className="pl-3 border-l-2 border-primary/20 ml-1.5 my-2">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed italic">
                        {reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-5 mb-3 text-foreground border-b border-border/40 pb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed text-foreground/90">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-4 space-y-1 text-foreground/90">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-4 space-y-1 text-foreground/90">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-bold text-foreground">
                      {children}
                    </strong>
                  ),
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)(?::([^"]+))?/.exec(
                      className || ""
                    );
                    const language = match ? match[1] : "";
                    const filename = match ? match[2] : undefined;

                    return !inline && match ? (
                      <CodeBlock
                        language={language}
                        filename={filename}
                        code={String(children).replace(/\n$/, "")}
                      />
                    ) : (
                      <code
                        className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono text-xs border border-border/50"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  a({ href, children }: any) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                      >
                        {children} <ExternalLink className="w-3 h-3" />
                      </a>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>

              {references && references.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border/40">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Sources
                  </p>
                  <div className="grid gap-2">
                    {references.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border/50 transition-all group/ref"
                      >
                        <div className="shrink-0 w-6 h-6 rounded bg-background flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border/50">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate group-hover/ref:text-primary transition-colors">
                            {ref.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate opacity-70">
                            {new URL(ref.url).hostname}
                          </p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover/ref:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Footer */}
              {!isStreaming && content && (
                <div className="mt-4 pt-2 border-t border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleFeedback("up")}
                      className={`p-1.5 rounded-md transition-colors ${
                        feedback === "up"
                          ? "text-green-500 bg-green-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      title="Good response"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback("down")}
                      className={`p-1.5 rounded-md transition-colors ${
                        feedback === "down"
                          ? "text-red-500 bg-red-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      title="Bad response"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={onRegenerate}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Regenerate response"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={onShare}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className={`p-1.5 rounded-md transition-colors ${
                        isCopied
                          ? "text-green-500 bg-green-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      title="Copy response"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`p-1.5 rounded-md transition-colors ${
                          showMoreMenu
                            ? "text-foreground bg-secondary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                        title="More options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {showMoreMenu && (
                        <div className="absolute left-0 bottom-full mb-2 w-56 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <div className="p-1">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-md transition-colors text-left">
                              <CheckCheck className="h-3.5 w-3.5" />
                              Double-check response
                            </button>
                            <button
                              onClick={handleListen}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left ${
                                isSpeaking
                                  ? "text-red-400 hover:bg-red-500/10"
                                  : "text-gray-300 hover:bg-white/5"
                              }`}
                            >
                              {isSpeaking ? (
                                <>
                                  <Square className="h-3.5 w-3.5 fill-current" />
                                  Stop listening
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3.5 w-3.5" />
                                  Listen
                                </>
                              )}
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-md transition-colors text-left">
                              <Flag className="h-3.5 w-3.5" />
                              Report legal issue
                            </button>
                          </div>
                          <div className="border-t border-white/10 p-2 bg-white/5">
                            <div className="flex items-center gap-2 text-xs text-gray-400 px-2">
                              <Sparkles className="h-3 w-3 text-indigo-400" />
                              <span>Model: Beta</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thank You Message */}
                  <span
                    className={`text-xs text-green-500 font-medium transition-all duration-300 ${
                      showThankYou
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-2"
                    }`}
                  >
                    {feedback === "down"
                      ? "Thanks for helping us improve!"
                      : "Thanks for your feedback!"}
                  </span>
                </div>
              )}

              {/* Feedback Input Form */}
              {showFeedbackInput && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <textarea
                    value={feedbackReason}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                    placeholder="What went wrong? (Optional)"
                    className="w-full p-2 text-xs rounded-md bg-secondary/50 border border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none resize-none min-h-[60px]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setShowFeedbackInput(false)}
                      className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitFeedback}
                      className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({
  language,
  filename,
  code,
}: {
  language: string;
  filename?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-border/50 shadow-sm bg-[#282c34]">
      {/* Header with Filename and Copy Button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-white/10">
        <div className="text-xs font-mono text-muted-foreground">
          {filename || language}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-white/10"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: "1.25rem",
          fontSize: "0.875rem",
          background: "transparent",
        }}
        showLineNumbers={true}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "#4b5563",
          textAlign: "right",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
