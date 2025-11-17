import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Check, X, Target, Lightbulb, Rocket, Brain, BookOpen, Sparkles } from "lucide-react";
import { ChatInterface, type ChatMessage } from "@/components/ChatInterface";
import type { VisualData } from "@/lib/api";
import { db, type Chat as DBChat, type Message as DBMessage } from "@/lib/db";
import { contextManager } from "@/lib/context";

// Extend Message type for UI-specific properties
interface Message extends Omit<DBMessage, 'role' | 'timestamp'> {
  role: "user" | "assistant";
  timestamp?: string;
  hasVisual?: boolean;
  visualData?: VisualData;
  suggestsProject?: boolean;
  projectSuggestion?: {
    title: string;
    description: string;
  };
  isStreaming?: boolean;
}

interface Chat extends Omit<DBChat, 'messages'> {
  messages: Message[];
}

// Generate chat title from first user message
const generateChatTitle = (firstMessage: string): string => {
  const words = firstMessage.trim().split(' ');
  if (words.length <= 5) return firstMessage;
  return words.slice(0, 5).join(' ') + '...';
};

// Welcome message for new chats
const WELCOME_MESSAGE = `# Hello! 👋

## How can I help you today?`;

// Main action cards for welcome screen
const QUICK_ACTIONS = [
  {
    label: "Create Learning Roadmap",
    prompt: "I want to create a structured learning project",
    icon: <Target className="w-5 h-5" />,
    description: "Build a personalized learning path"
  },
  {
    label: "Continue Your Learning",
    prompt: "Help me understand a concept I'm learning",
    icon: <Brain className="w-5 h-5" />,
    description: "Get explanations and deep insights"
  },
  {
    label: "Discover",
    prompt: "What are the latest trends in tech and learning?",
    icon: <Rocket className="w-5 h-5" />,
    description: "Explore industry trends and tips"
  }
];

const AskMindCoach = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  
  const [currentChatId, setCurrentChatId] = useState<string>(chatId || 'new');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTitle, setCurrentTitle] = useState<string>("New Chat");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for create_project intent on mount
  // Check for new chat or load existing
  useEffect(() => {
    // Check URL params for project creation intent
    const searchParams = new URLSearchParams(window.location.search);
    const createProject = searchParams.get('create_project');
    
    if (createProject === 'true' && messages.length === 0) {
      // Trigger project creation via URL param (handled by ChatInterface)
    }
  }, [messages.length]);

  // Load chats from DB on mount
  useEffect(() => {
    const savedChats = db.getChats().map(c => ({
      ...c,
      messages: c.messages.filter(m => m.role !== 'system') as ChatMessage[]
    })) as Chat[];
    setChats(savedChats);
    
    // Load specific chat if chatId provided
    if (chatId && chatId !== 'new') {
      const chat = savedChats.find(c => c.id === chatId);
      if (chat) {
        setMessages(chat.messages);
        setCurrentTitle(chat.title);
        setCurrentChatId(chatId);
      }
    }
  }, [chatId]);

  // Save current chat to DB whenever messages change
  useEffect(() => {
    if (currentChatId === 'new' && messages.length === 0) return; // Don't save empty new chats
    if (messages.length === 0) return;
    
    const chatToSave: DBChat = {
      id: currentChatId === 'new' ? `chat-${Date.now()}` : currentChatId,
      title: currentTitle,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || new Date().toISOString(),
        isStreaming: m.isStreaming
      })),
      createdAt: chats.find(c => c.id === currentChatId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to DB
    db.saveChat(chatToSave);
    
    // Update local state from DB
    const updatedChats = db.getChats().map(c => ({
      ...c,
      messages: c.messages.filter(m => m.role !== 'system') as ChatMessage[]
    })) as Chat[];
    setChats(updatedChats);
    
    if (currentChatId === 'new') {
      setCurrentChatId(chatToSave.id);
      navigate(`/chat/${chatToSave.id}`, { replace: true });
    }
  }, [messages, currentChatId, currentTitle, navigate]);

  const handleNewChat = () => {
    setCurrentChatId('new');
    setCurrentTitle('New Chat');
    setMessages([]);
    navigate('/', { replace: true });
  };

  const handleEditTitle = () => {
    setEditedTitle(currentTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      setCurrentTitle(editedTitle.trim());
      // Update in DB
      const chat = db.getChat(currentChatId);
      if (chat) {
        chat.title = editedTitle.trim();
        db.saveChat(chat);
        // Reload chats
        const updatedChats = db.getChats().map(c => ({
          ...c,
          messages: c.messages.filter(m => m.role !== 'system') as Message[]
        })) as Chat[];
        setChats(updatedChats);
      }
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const handleSend = async (userMessageContent: string) => {
    if (!userMessageContent.trim() || isLoading) return;
    
    setIsLoading(true);
    
    // Auto-generate title from first user message
    if (messages.length === 0) {
      const newTitle = generateChatTitle(userMessageContent);
      setCurrentTitle(newTitle);
    }
    
    // Add user message
    const userMessage: ChatMessage = { role: "user", content: userMessageContent };
    setMessages(prev => [...prev, userMessage]);
    
    // Add AI message placeholder with streaming indicator
    const aiMessage: ChatMessage = {
      role: "assistant",
      content: "",
      isStreaming: true
    };
    setMessages(prev => [...prev, aiMessage]);
    
    try {
      // Step 1: Call orchestration endpoint to detect intent
      const orchestrateResponse = await fetch('/.netlify/functions/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageContent,
          chatHistory: [...messages, userMessage]
            .filter(m => m.isStreaming === undefined)
            .map(m => ({
              role: m.role,
              content: m.content
            }))
        })
      });
      
      if (!orchestrateResponse.ok) {
        throw new Error(`Orchestration failed: ${orchestrateResponse.status}`);
      }
      
      const orchestration = await orchestrateResponse.json();
      const actionType = orchestration.suggestedAction?.type;
      
      // Step 2: Call appropriate endpoint based on intent
      if (actionType === 'generate_visual') {
        // Call generate-visual endpoint
        const visualResponse = await fetch('/.netlify/functions/generate-visual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userMessageContent,
            visualType: orchestration.suggestedAction.parameters?.visualType
          })
        });
        
        if (!visualResponse.ok) {
          throw new Error(`Visual generation failed: ${visualResponse.status}`);
        }
        
        const visualData = await visualResponse.json();
        
        // Update with visual
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            role: "assistant",
            content: `Here's a visual explanation of ${orchestration.suggestedAction.parameters?.topic || 'your query'}:`,
            hasVisual: true,
            visualData: visualData
          };
          return updated;
        });
      } else if (actionType === 'create_project' || actionType === 'generate_roadmap') {
        // Analyze conversation context to decide: direct creation or consultation
        const topic = orchestration.suggestedAction?.parameters?.extractedTopic || userMessageContent;
        const hasEnoughInfo = orchestration.confidence > 0.8 && orchestration.suggestedAction?.parameters?.extractedTopic;
        
        // Check conversation history for user details
        const conversationContext = messages
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join(' ');
        
        // Intelligent detection: does user message contain enough details?
        const mentionsLevel = /\b(beginner|intermediate|advanced|new to|experienced|expert)\b/i.test(userMessageContent + ' ' + conversationContext);
        const mentionsGoal = /\b(want to|goal|build|create|become|career|job|project)\b/i.test(userMessageContent);
        const isDirectRequest = /\b(create|make|build|generate) (a |me )?(roadmap|plan|path|guide|project)\b/i.test(userMessageContent);
        
        // Create project function that will be called on button click
        const handleCreateProject = async () => {
          // Find the message with the button and update it to show loading
          setMessages(prev => {
            const updated = [...prev];
            const buttonMessageIndex = updated.findIndex(m => m.actionButton);
            if (buttonMessageIndex >= 0) {
              updated[buttonMessageIndex] = {
                ...updated[buttonMessageIndex],
                actionButton: undefined
              };
            }
            return updated;
          });
          
          // Add loading message
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `Creating your personalized learning roadmap for **${topic}**... 🚀`,
            isStreaming: true
          }]);
          
          try {
            // Generate roadmap
            const roadmapResponse = await fetch('/.netlify/functions/generate-roadmap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: topic,
                userLevel: orchestration.suggestedAction?.parameters?.level || 'beginner',
                timeframe: 'month',
                goals: []
              })
            });

            if (!roadmapResponse.ok) {
              throw new Error(`Roadmap generation failed: ${roadmapResponse.status}`);
            }

            const roadmapData = await roadmapResponse.json();

            // Gather resources
            const resourcesResponse = await fetch('/.netlify/functions/gather-resources', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: topic,
                level: orchestration.suggestedAction?.parameters?.level || 'beginner'
              })
            });

            const resourcesData = resourcesResponse.ok ? await resourcesResponse.json() : { resources: [] };

            // Create project with roadmap and resources
            const newProject = db.createProject({
              title: roadmapData.roadmap.title || `Learn ${topic}`,
              description: roadmapData.roadmap.description || `A comprehensive learning path for ${topic}`,
              level: roadmapData.roadmap.level || 'beginner',
              roadmap: roadmapData.roadmap,
              resources: resourcesData.resources || [],
              chats: []
            });

            // Update loading message with success
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                role: "assistant",
                content: `✨ **Your learning journey is ready!**\n\nI've created a personalized roadmap for **${roadmapData.roadmap.title}** with:\n\n📚 **${roadmapData.roadmap.milestones?.length || 0} Learning Milestones**\n🔗 **${resourcesData.resources?.length || 0} Curated Resources**\n🎯 **Estimated Duration:** ${roadmapData.roadmap.totalDuration}\n\nClick below to start your journey!`,
                actionButton: {
                  label: "Open Project",
                  icon: <Rocket className="h-4 w-4" />,
                  onClick: () => navigate(`/projects/${newProject.id}`)
                }
              };
              return updated;
            });
          } catch (error) {
            console.error('Failed to create project:', error);
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                role: "assistant",
                content: `I encountered an error creating your learning roadmap. Please try again.`
              };
              return updated;
            });
          }
        };
        
        // DYNAMIC DECISION: Skip consultation if user gives clear, direct request with details
        if ((hasEnoughInfo && (mentionsLevel || mentionsGoal)) || isDirectRequest) {
          // DIRECT PROJECT CREATION - User gave enough info
          const cleanResponse = `Perfect! I'll create a comprehensive learning roadmap for **${topic}** right away! 🚀`;
          
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = {
              role: "assistant",
              content: cleanResponse,
              actionButton: {
                label: "Create Learning Journey",
                icon: <Sparkles className="h-4 w-4" />,
                onClick: handleCreateProject
              }
            };
            return updated;
          });
        } else {
          // CONSULTATIVE MODE - Need more info
          const systemMessage = {
            role: "system",
            content: `You are ELVO AI, an expert learning consultant. The user wants to learn something new.

**DYNAMIC CONSULTATION MODE:**
Analyze what information you already know from the conversation, then ask ONLY for missing details.

**Information to gather:**
1. Topic (what to learn) - ${topic ? '✓ Known: ' + topic : '✗ Ask this'}
2. Current level (beginner/intermediate/advanced) - ${mentionsLevel ? '✓ Detected' : '✗ Ask this'}
3. Learning goals (career/project/hobby) - ${mentionsGoal ? '✓ Detected' : '✗ Ask this'}
4. Time commitment (hours per week)
5. Learning style (hands-on/theory/balanced)

**RULES:**
- Ask ONLY ONE question at a time
- Skip questions for info you already know
- Be conversational and encouraging
- When you have AT LEAST topic + level + goal (3 items), you can offer to create the roadmap

**When ready**, respond with:
"Perfect! I can create your personalized learning roadmap for [topic] now!"

Then add: [CREATE_ROADMAP]`
          };
          
          const chatResponse = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                systemMessage,
                ...messages
                  .filter(m => m.content && m.isStreaming === undefined)
                  .map(m => ({
                    role: m.role,
                    content: m.content
                  })),
                {
                  role: userMessage.role,
                  content: userMessage.content
                }
              ],
              stream: false
            })
          });
          
          if (!chatResponse.ok) {
            throw new Error(`Chat failed: ${chatResponse.status}`);
          }
          
          const chatResult = await chatResponse.json();
          const shouldShowButton = chatResult.response.includes('[CREATE_ROADMAP]');
          const cleanResponse = chatResult.response.replace(/\[CREATE_ROADMAP\]/g, '').trim();
          
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            updated[lastIndex] = {
              role: "assistant",
              content: cleanResponse,
              ...(shouldShowButton && {
                actionButton: {
                  label: "Create Learning Journey",
                  icon: <Sparkles className="h-4 w-4" />,
                  onClick: handleCreateProject
                }
              })
            };
            return updated;
          });
        }
        
      } else {
        // Regular chat response - FULLY CONTEXT-AWARE
        
        // Build context from current chat
        const chatContext = contextManager.buildGeneralChatContext(currentChatId !== 'new' ? currentChatId : undefined);
        
        // Prepare full conversation history for context awareness
        const conversationHistory = [...messages, userMessage]
          .filter(m => m.content && !m.isStreaming)
          .map(m => ({
            role: m.role,
            content: m.content
          }));
        
        const chatResponse = await fetch('/.netlify/functions/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationHistory,
            useReasoning: orchestration.suggestedAction?.parameters?.useReasoning || false,
            stream: false,
            // Pass context for context-aware responses
            context: {
              chatId: chatContext.chatId,
              lastTopic: chatContext.lastTopic,
              recentMessages: chatContext.recentMessages,
              conversationLength: conversationHistory.length,
              // Enable web-aware, dynamic responses
              enableWebSearch: true,
              enableVisuals: true
            }
          })
        });
        
        if (!chatResponse.ok) {
          throw new Error(`Chat failed: ${chatResponse.status}`);
        }
        
        const chatResult = await chatResponse.json();
        
        // Update message with response and clear streaming state
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            role: "assistant",
            content: chatResult.response || "No response received",
            isStreaming: false, // Clear streaming state
            timestamp: new Date().toISOString()
          };
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Clear streaming state and show error
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex] && updated[lastIndex].isStreaming) {
          updated[lastIndex] = {
            role: "assistant",
            content: `I encountered an error. Please try again.`,
            isStreaming: false,
            timestamp: new Date().toISOString()
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Chat Header with Title */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="h-8 text-sm md:text-base font-semibold"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                    <Check className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0 group">
                  <h1 className="text-base md:text-lg font-semibold truncate">{currentTitle}</h1>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleEditTitle}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <Button onClick={handleNewChat} variant="outline" size="sm" className="shrink-0">
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-0 md:mr-2" />
              <span className="hidden md:inline">New Chat</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Unified Chat Interface */}
      <ChatInterface
        messages={messages}
        onSendMessage={handleSend}
        isLoading={isLoading}
        placeholder="What do you want to understand today?"
        showWelcome={true}
        welcomeMessage={WELCOME_MESSAGE}
        quickActions={QUICK_ACTIONS}
      />
    </div>
  );
};

export default AskMindCoach;
