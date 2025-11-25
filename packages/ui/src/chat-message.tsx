'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Copy, Check, ExternalLink, Bot, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  references?: Array<{ title: string; url: string; snippet: string }>;
}

export function ChatMessage({ role, content, references }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex gap-4 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20' 
            : 'bg-secondary text-primary border border-border'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Bubble */}
        <div className={`relative px-5 py-3.5 rounded-2xl shadow-sm ${
          isUser 
            ? 'bg-linear-to-br from-indigo-600 to-blue-600 text-white rounded-tr-sm shadow-indigo-500/10' 
            : 'bg-card border border-border/50 text-foreground rounded-tl-sm'
        }`}>
          
          {role === 'assistant' ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
                    ) : (
                      <code className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono text-xs border border-border/50" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children }: any) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                        {children} <ExternalLink className="w-3 h-3" />
                      </a>
                    );
                  }
                }}
              >
                {content}
              </ReactMarkdown>
              
              {references && references.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border/40">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Sources</p>
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
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-border/50 shadow-sm">
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-8 w-8 bg-background/50 backdrop-blur hover:bg-background text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, padding: '1.25rem', fontSize: '0.875rem' }}
        showLineNumbers={true}
        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#4b5563', textAlign: 'right' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
