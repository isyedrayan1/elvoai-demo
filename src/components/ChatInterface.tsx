import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import RuixenQueryBox from "@/components/ui/ruixen-query-box";
import { VisualMessage } from "@/components/VisualMessage";
import type { VisualData } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
  hasVisual?: boolean;
  visualData?: VisualData;
  actionButton?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
}

interface QuickAction {
  label: string;
  prompt: string;
  icon?: React.ReactNode;
  description?: string;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  showWelcome?: boolean;
  welcomeMessage?: string;
  quickActions?: QuickAction[];
  className?: string;
  respectSidebar?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Ask me anything...",
  showWelcome = false,
  welcomeMessage,
  quickActions = [],
  className = "",
  respectSidebar = true,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return;
    setInput("");
    await onSendMessage(message.trim());
  };

  const handleQuickAction = async (prompt: string) => {
    setInput(prompt);
    await onSendMessage(prompt);
  };

  const hasUserMessages = messages.some(m => m.role === "user");
  const displayWelcome = showWelcome && !hasUserMessages;

  return (
    <div className={`flex flex-col h-full min-h-0 relative ${className}`}>
      {/* Messages Container - Ultra Responsive */}
      <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth">
        {/* Welcome Screen - Centered, No Scroll */}
        {displayWelcome ? (
          <div className="h-full flex flex-col items-center justify-center px-3 sm:px-4 md:px-6 animate-in fade-in duration-500">
            <div className="w-full max-w-4xl mx-auto">
              {/* Hero Section */}
              <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12 px-4 max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 shadow-xl shadow-primary/25 mb-3 sm:mb-6 animate-in zoom-in duration-500">
                  <Sparkles className="w-7 h-7 sm:w-10 sm:h-10 text-primary-foreground" />
                </div>
                
                {welcomeMessage ? (
                  <div className="prose prose-sm sm:prose-base md:prose-lg prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{welcomeMessage}</ReactMarkdown>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      Welcome to MindCoach
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-md mx-auto">
                      Your AI learning companion for deep understanding and personalized growth
                    </p>
                  </>
                )}
              </div>

              {/* Quick Actions Grid - Responsive Card Design */}
              {quickActions.length > 0 && (
                <div className="w-full max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="group relative flex flex-col items-start gap-3 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors duration-200 text-left active:scale-[0.98]"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {action.icon && (
                          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-muted text-muted-foreground flex-shrink-0">
                            {action.icon}
                          </div>
                        )}
                        <span className="font-semibold text-sm sm:text-base">
                          {action.label}
                        </span>
                      </div>
                      {action.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {action.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Chat Messages View */
          <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 pb-4">
            {/* Messages - Modern Chat Bubbles */}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 sm:gap-4 animate-in slide-in-from-bottom-2 duration-300 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
              {/* Avatar - Assistant Only (NOT when streaming/loading) */}
              {message.role === "assistant" && !isMobile && !message.isStreaming && (
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
              )}
              
              {/* Loading Spinner - When streaming */}
              {message.role === "assistant" && !isMobile && message.isStreaming && (
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
                </div>
              )}

              {/* Message Content */}
              <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
                message.role === "user" ? "items-end" : "items-start"
              }`}>
                {/* Message Bubble */}
                <div
                  className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl shadow-sm ${
                    message.role === "user"
                      ? "bg-muted border border-border/50 text-foreground rounded-tr-md"
                      : "bg-muted/50 backdrop-blur-sm border border-border/50 text-foreground rounded-tl-md"
                  }`}
                >
                  {message.hasVisual && message.visualData ? (
                    <VisualMessage visual={message.visualData} />
                  ) : (
                    <div className="prose prose-sm sm:prose-base max-w-none prose-slate dark:prose-invert
                      prose-headings:font-semibold prose-headings:tracking-tight
                      prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-2
                      prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-4
                      prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-3
                      prose-p:leading-relaxed prose-p:mb-4
                      prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6
                      prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6
                      prose-li:my-1.5 prose-li:leading-relaxed
                      prose-strong:font-semibold prose-strong:text-foreground
                      prose-em:italic prose-em:text-foreground/90
                      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4
                      prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                      prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline
                      [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          // Custom renderers for better formatting
                          p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="space-y-1.5 my-3">{children}</ul>,
                          ol: ({children}) => <ol className="space-y-1.5 my-3">{children}</ol>,
                          li: ({children}) => <li className="leading-relaxed">{children}</li>,
                          code: ({inline, children, ...props}: any) => 
                            inline ? (
                              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...props}>
                                {children}
                              </code>
                            ) : (
                              <code className="block" {...props}>{children}</code>
                            ),
                          h1: ({children}) => <h1 className="text-2xl font-semibold mb-4 mt-2">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-semibold mb-3 mt-4">{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-semibold mb-2 mt-3">{children}</h3>,
                          strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({children}) => <em className="italic text-foreground/90">{children}</em>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {message.actionButton && (
                  <Button
                    onClick={message.actionButton.onClick}
                    size={isMobile ? "sm" : "default"}
                    className="rounded-full shadow-md hover:shadow-lg transition-all"
                  >
                    {message.actionButton.icon}
                    <span className="ml-2">{message.actionButton.label}</span>
                  </Button>
                )}

                {/* Timestamp - Subtle */}
                {message.timestamp && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground/60 px-2">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                )}
              </div>

              {/* Avatar - User Only on Desktop */}
              {message.role === "user" && !isMobile && (
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator - Modern Pulse */}
          {isLoading && (
            <div className="flex gap-3 sm:gap-4 items-start animate-in fade-in duration-300">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md animate-pulse">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl bg-muted/50 backdrop-blur-sm border border-border/50 rounded-tl-md">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at Bottom with Minimal Padding */}
      <div className="flex-shrink-0 w-full bg-background border-t border-border/50">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-2">
          <div className="relative">
            <RuixenQueryBox
              value={input}
              onChange={setInput}
              onSend={handleSubmit}
              placeholder={placeholder}
              disabled={isLoading}
              className="shadow-xl shadow-black/5 border-border/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
