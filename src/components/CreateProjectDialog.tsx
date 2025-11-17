import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Send, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { streamChat, generateRoadmap } from "@/lib/api";
import { Card } from "@/components/ui/card";
import RuixenQueryBox from "@/components/ui/ruixen-query-box";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  showCreateButton?: boolean;
  projectData?: {
    topic: string;
    level: string;
    goal: string;
    timeCommitment: string;
  };
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedTitle?: string;
  suggestedDescription?: string;
}

export function CreateProjectDialog({ 
  open, 
  onOpenChange, 
  suggestedTitle = "", 
  suggestedDescription = "" 
}: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset conversation when dialog closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [open]);

  // Initialize conversation on open with consultation message
  useEffect(() => {
    if (open && messages.length === 0) {
      // Show consultation starting message immediately
      const consultationMsg: Message = {
        role: "assistant",
        content: "🎯 **Starting your learning consultation...**\n\nI'll help you design the perfect learning roadmap through a quick conversation!",
        timestamp: new Date().toISOString(),
      };
      setMessages([consultationMsg]);
      
      // Then let AI start the conversation naturally
      setTimeout(() => handleInitialGreeting(), 500);
    }
  }, [open]);

  const handleInitialGreeting = async () => {
    setIsLoading(true);
    
    try {
      let aiResponse = "";
      
      // Create a simple conversation with system prompt
      const conversationHistory = [
        {
          role: "system" as const,
          content: `You are MindCoach, an enthusiastic learning guide. Start a friendly, conversational greeting to help someone create a learning project. 

Keep it brief and warm - just 2-3 sentences. Ask what they want to learn in a natural, encouraging way. Don't list requirements or be too formal.

Example tone: "Hey! 👋 I'm excited to help you start your learning journey. What would you like to learn or improve at?"`
        },
        {
          role: "user" as const,
          content: "Please greet me and ask what I want to learn"
        }
      ];
      
      // Create the AI message placeholder
      const aiMsg: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      
      // Add it to messages immediately
      setMessages(prev => [...prev, aiMsg]);
      
      await streamChat(
        conversationHistory as any,
        (chunk) => {
          aiResponse += chunk;
          // Update the last message (AI response)
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: aiResponse,
            };
            return updated;
          });
        },
        () => {
          // On complete
          setIsLoading(false);
        },
        (error) => {
          console.error("Error getting AI greeting:", error);
          // Update with fallback
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: "Hi! 👋 I'm here to help you create a personalized learning roadmap. What would you like to learn?",
            };
            return updated;
          });
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Error getting AI greeting:", error);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    // Add user message
    const userMsg: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Create AI message with streaming placeholder
      const aiMsg: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, aiMsg]);

      // Build conversation context with system prompt
      const systemMessage = {
        role: "system" as const,
        content: `You are an AI learning consultant helping users create personalized learning roadmaps.

IMPORTANT: Your goal is to have a NATURAL, CONSULTATIVE conversation. DO NOT show the create button immediately.

Conversation Guidelines:
1. Start by asking what they want to learn
2. Ask follow-up questions naturally based on their responses:
   - If they mention a topic, ask about their current level
   - If they share their level, ask about their learning goal
   - If they share a goal, ask about time commitment
   - Ask clarifying questions to understand their motivation and context

3. ONLY after you have gathered ALL of this information through conversation:
   - What they want to learn (specific topic/skill)
   - Their current level (beginner/intermediate/advanced)
   - Their learning goal (career change, skill improvement, hobby, etc.)
   - Time commitment (hours per week)

4. When you have everything, respond enthusiastically:
   "Perfect! I have everything I need to create your personalized learning roadmap! 🚀"

Then add this EXACT line at the end:
[CREATE_ROADMAP: topic="<topic>", level="<level>", goal="<goal>", time="<hours>"]

Example: [CREATE_ROADMAP: topic="React Development", level="beginner", goal="Get a job", time="10-20"]

DO NOT show the create tag until you've had at least 3-4 conversational exchanges and have all required information.`
      };

      const conversationHistory = [
        systemMessage,
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: userMsg.role,
          content: userMsg.content
        }
      ];

      // Stream the response
      let fullResponse = "";
      await streamChat(
        conversationHistory as any,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: fullResponse,
            };
            return updated;
          });
        },
        () => {
          // On complete
        },
        (error) => {
          console.error('Stream error:', error);
        }
      );

      // Check if AI is ready to create roadmap
      const createMatch = fullResponse.match(/\[CREATE_ROADMAP: topic="([^"]+)", level="([^"]+)", goal="([^"]+)", time="([^"]+)"\]/);
      
      if (createMatch) {
        const [, topic, level, goal, time] = createMatch;
        
        // Remove the [CREATE_ROADMAP...] tag from display
        const cleanResponse = fullResponse.replace(/\[CREATE_ROADMAP:[^\]]+\]/, '').trim();
        
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: cleanResponse,
            showCreateButton: true,
            projectData: { topic, level, goal, timeCommitment: time }
          };
          return updated;
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "I encountered an error. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoadmap = async (projectData: Message['projectData']) => {
    if (!projectData) return;
    
    setIsGenerating(true);

    try {
      const roadmap = await generateRoadmap(
        projectData.topic,
        projectData.level as 'beginner' | 'intermediate' | 'advanced',
        projectData.timeCommitment === '5-10' ? 'week' : projectData.timeCommitment === '10-20' ? 'month' : 'quarter',
        [projectData.goal]
      );
      
      const convertedMilestones = roadmap.milestones.map((m: any, index: number) => ({
        id: `milestone-${index + 1}`,
        title: m.title,
        objective: m.objective,
        concepts: m.concepts || [],
        project: m.project || '',
        successCriteria: m.successCriteria || [],
        duration: `${m.estimatedHours || 8} hours`,
        completed: false,
        progress: 0,
        status: 'not-started' as const
      }));
      
      const project = db.createProject({
        title: roadmap.title,
        description: roadmap.description,
        level: (roadmap.level as 'beginner' | 'intermediate' | 'advanced') || projectData.level as any,
        roadmap: {
          title: roadmap.title,
          description: roadmap.description,
          level: roadmap.level,
          totalDuration: roadmap.totalDuration,
          milestones: convertedMilestones,
          lastUpdated: new Date().toISOString()
        },
        resources: [],
        chats: [],
      });

      onOpenChange(false);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] sm:h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">Let's Chat About Your Learning Goals</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Have a conversation with AI to design your perfect learning journey
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                
                {/* Create Roadmap Button */}
                {message.showCreateButton && message.projectData && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Button
                      onClick={() => handleCreateRoadmap(message.projectData)}
                      disabled={isGenerating}
                      className="w-full gap-2"
                      size="sm"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Your Roadmap...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Create My Learning Roadmap
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-3 sm:px-6 py-3 sm:py-4 bg-background">
          <RuixenQueryBox
            onSend={handleSendMessage}
            placeholder="Tell me what you want to learn..."
            disabled={isLoading || isGenerating}
            showUpload={false}
            showVoice={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
