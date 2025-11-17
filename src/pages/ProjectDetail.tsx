import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MessageSquare, Map, BookOpen, ArrowLeft, Loader2, Sparkles, ExternalLink, Search } from "lucide-react";
import { gatherResources } from "@/lib/api";
import { db, type Project as DBProject, type Chat as DBChat, type Message as DBMessage, type Resource as DBResource } from "@/lib/db";
import { contextManager } from "@/lib/context";
import { ChatInterface, type ChatMessage } from "@/components/ChatInterface";
import RuixenQueryBox from "@/components/ui/ruixen-query-box";

type Chat = DBChat;
type Project = DBProject;
type Resource = DBResource;

const generateChatTitle = (firstMessage: string): string => {
  const words = firstMessage.trim().split(' ');
  if (words.length <= 5) return firstMessage;
  return words.slice(0, 5).join(' ') + '...';
};

const ProjectDetail = () => {
  const { projectId, chatId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'roadmap' | 'resources'>('chat');
  
  // Chat state
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Roadmap editing state
  const [roadmapInput, setRoadmapInput] = useState("");
  const [isEditingRoadmap, setIsEditingRoadmap] = useState(false);

  // Resources state
  const [resourceUrl, setResourceUrl] = useState("");
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isFindingResources, setIsFindingResources] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<any>(null);

  // Load project from DB and cleanup empty chats
  useEffect(() => {
    if (!projectId) return;
    
    const loadedProject = db.getProject(projectId);
    if (loadedProject) {
      // Cleanup: Delete chats with no messages (created but never used)
      const projectChats = db.getProjectChats(projectId);
      projectChats.forEach(chat => {
        if (chat.messages.length === 0) {
          // Only delete if chat is older than 5 minutes (not just created)
          const createdTime = new Date(chat.createdAt).getTime();
          const now = Date.now();
          if (now - createdTime > 5 * 60 * 1000) {
            db.deleteProjectChat(projectId, chat.id);
          }
        }
      });
      
      // Reload after cleanup
      const cleanedProject = db.getProject(projectId);
      if (cleanedProject) {
        setProject(cleanedProject);
      }
      
      // Update context
      db.updateContext({ 
        currentProject: projectId,
        lastActivity: new Date().toISOString()
      });
      
      // Get resume prompt
      const prompt = db.getResumePrompt();
      if (prompt && prompt.type === 'project' && prompt.data?.projectId === projectId) {
        setResumePrompt(prompt);
      }
    } else {
      // Project not found
      navigate('/projects');
    }
  }, [projectId, navigate]);

  // Removed scrollToBottom - ChatInterface handles this

  // Load specific chat when chatId changes
  useEffect(() => {
    if (!project || !chatId) return;
    
    const chat = db.getProjectChat(project.id, chatId);
    if (chat) {
      setCurrentChatId(chat.id);
      // Filter system messages and convert to ChatMessage type
      setMessages(chat.messages.filter(m => m.role !== 'system') as ChatMessage[]);
      setActiveTab('chat');
      
      // Update context
      db.updateContext({ 
        currentProject: project.id,
        currentChat: chat.id,
        lastActivity: new Date().toISOString()
      });
    }
  }, [chatId, project]);

  const handleStartNewChat = () => {
    if (!project) return;
    
    const newChatId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      messages: [], // Empty array for new chat
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: project.id
    };
    
    db.saveProjectChat(project.id, newChat);
    setCurrentChatId(newChatId);
    setMessages([]); // Clear UI messages
    setActiveTab('chat');
    
    // Update context
    db.updateContext({ 
      currentProject: project.id,
      currentChat: newChatId,
      lastActivity: new Date().toISOString()
    });
  };

  const handleContinueChat = (chat: Chat) => {
    setCurrentChatId(chat.id);
    // Filter system messages and convert to ChatMessage type
    setMessages(chat.messages.filter(m => m.role !== 'system') as ChatMessage[]);
  };

  const handleStartNewChatWithMessage = async (message: string) => {
    if (!project) return;
    
    // Create new chat
    const newChatId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: project.id
    };
    
    db.saveProjectChat(project.id, newChat);
    setCurrentChatId(newChatId);
    setMessages([]);
    setActiveTab('chat');
    
    // Update context
    db.updateContext({ 
      currentProject: project.id,
      currentChat: newChatId,
      lastActivity: new Date().toISOString()
    });

    // Send the message
    await handleSendMessage(message);
  };

  const handleSendMessage = async (userMessageContent: string) => {
    if (!userMessageContent.trim() || isLoading || !project) return;

    setIsLoading(true);

    // Create new chat if needed
    let activeChatId = currentChatId;
    if (!activeChatId) {
      activeChatId = `chat-${Date.now()}`;
      setCurrentChatId(activeChatId);
    }

    // Add user message
    const newUserMessage: ChatMessage = { 
      role: "user", 
      content: userMessageContent,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Add AI placeholder with streaming indicator
    const aiPlaceholder: ChatMessage = {
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    try {
      // Build project context for orchestration
      const context = contextManager.buildProjectChatContext(
        project.id,
        activeChatId,
        project.roadmap?.milestones.find(m => !m.completed)?.id
      );

      // Step 1: Call orchestration endpoint to detect intent
      const orchestrateResponse = await fetch('/.netlify/functions/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageContent,
          chatHistory: messages
            .filter(m => !m.isStreaming)
            .map(m => ({
              role: m.role,
              content: m.content
            })),
          projectContext: {
            projectId: project.id,
            title: project.title,
            level: project.level
          }
        })
      });

      if (!orchestrateResponse.ok) {
        throw new Error(`Orchestration failed: ${orchestrateResponse.status}`);
      }

      const orchestration = await orchestrateResponse.json();
      const actionType = orchestration.suggestedAction?.type;

      // Variables to capture response data
      let responseContent = "";
      let visualData: any = null;

      // Step 2: Route to appropriate endpoint based on intent
      if (actionType === 'generate_visual') {
        // Generate visual explanation
        const visualResponse = await fetch('/.netlify/functions/generate-visual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userMessageContent,
            visualType: orchestration.suggestedAction.parameters?.visualType,
            context: {
              projectTitle: project.title,
              level: project.level
            }
          })
        });

        if (!visualResponse.ok) {
          throw new Error(`Visual generation failed: ${visualResponse.status}`);
        }

        visualData = await visualResponse.json();
        responseContent = `Here's a visual explanation of ${orchestration.suggestedAction.parameters?.topic || 'your query'}:\n\n${JSON.stringify(visualData, null, 2)}`;

        // Update message with visual
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            role: "assistant",
            content: responseContent,
            timestamp: new Date().toISOString()
          };
          return updated;
        });
      } else {
        // Regular chat response with project context
        const systemPrompt = contextManager.generateSystemPrompt(context, "project");
        
        const chatResponse = await fetch('/.netlify/functions/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.filter(m => !m.isStreaming).map(m => ({
                role: m.role,
                content: m.content
              })),
              { role: "user", content: userMessageContent }
            ],
            useReasoning: orchestration.suggestedAction?.parameters?.useReasoning || false,
            stream: false,
            context: {
              projectId: project.id,
              milestoneId: project.roadmap?.milestones?.[0]?.id,
              weakAreas: []
            }
          })
        });

        if (!chatResponse.ok) {
          throw new Error(`Chat failed: ${chatResponse.status}`);
        }

        const chatResult = await chatResponse.json();
        responseContent = chatResult.response || "No response received";

        // Update message with response
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            role: "assistant",
            content: responseContent,
            timestamp: new Date().toISOString()
          };
          return updated;
        });
      }

      // Save chat to DB after getting response
      // Capture final state to save
      const allMessages = [
        ...messages.filter(m => !m.isStreaming),
        newUserMessage,
        {
          role: "assistant" as const,
          content: responseContent,
          timestamp: new Date().toISOString()
        }
      ];

      const chatTitle = messages.filter(m => !m.isStreaming).length === 0 
        ? generateChatTitle(userMessageContent)
        : project.chats?.find(c => c.id === activeChatId)?.title || "New Chat";

      const chatToSave: Chat = {
        id: activeChatId,
        title: chatTitle,
        messages: allMessages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
          isStreaming: m.isStreaming
        })),
        createdAt: project.chats?.find(c => c.id === activeChatId)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: project.id
      };

      db.saveProjectChat(project.id, chatToSave);

      // Reload project to refresh sidebar
      const updatedProject = db.getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
      }

      // Update context
      db.updateContext({
        currentProject: project.id,
        currentChat: activeChatId,
        lastActivity: new Date().toISOString()
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          role: "assistant",
          content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          timestamp: new Date().toISOString()
        };
        return updated;
      });
      setIsLoading(false);
    }
  };

  const handleEditRoadmap = async () => {
    if (!roadmapInput.trim() || isEditingRoadmap || !project || !project.roadmap) return;

    const instruction = roadmapInput.trim();
    setRoadmapInput("");
    setIsEditingRoadmap(true);
    
    try {
      // Call AI to modify the roadmap based on user instruction
      const response = await fetch('/.netlify/functions/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: project.title,
          level: project.level,
          context: `Current roadmap has ${project.roadmap.milestones.length} milestones. User instruction: "${instruction}". Modify the roadmap according to this instruction while keeping the same structure.`,
          existingRoadmap: project.roadmap.milestones
        })
      });

      if (!response.ok) throw new Error('Failed to update roadmap');

      const data = await response.json();
      
      if (data.roadmap && data.roadmap.milestones) {
        // Update project with modified roadmap
        const updatedProject = { ...project, roadmap: data.roadmap };
        setProject(updatedProject);
        
        // Save to localStorage
        const allProjects = JSON.parse(localStorage.getItem('mindcoach-projects') || '[]');
        const updatedProjects = allProjects.map((p: Project) =>
          p.id === project.id ? updatedProject : p
        );
        localStorage.setItem('mindcoach-projects', JSON.stringify(updatedProjects));
      }
    } catch (error) {
      console.error('Error editing roadmap:', error);
    } finally {
      setIsEditingRoadmap(false);
    }
  };

  const handleAddResource = () => {
    if (!resourceUrl.trim() || !project) return;

    const newResource: Resource = {
      id: `resource-${Date.now()}`,
      title: "User Added Resource",
      url: resourceUrl,
      type: "link",
      level: project.level,
      quality: 3,
      description: "Resource added by user",
      topics: [],
      isPaid: false,
      addedBy: "user",
      createdAt: new Date().toISOString()
    };

    db.addResource(project.id, newResource);
    const updatedProject = db.getProject(project.id);
    if (updatedProject) {
      setProject(updatedProject);
    }
    setResourceUrl("");
    setIsAddingResource(false);
  };

  const handleFindResources = async () => {
    if (!project) return;
    
    setIsFindingResources(true);
    
    try {
      const newResources = await gatherResources(project.title, 'all', project.level, 5);
      // Map API resources to DB Resource format
      const mappedResources = newResources.map(r => ({
        id: `resource-${Date.now()}-${Math.random()}`,
        title: r.title,
        url: r.url,
        type: r.type as "video" | "article" | "doc" | "course" | "link" | "pdf",
        level: r.level,
        quality: r.quality,
        description: r.description,
        topics: r.topics,
        platform: r.platform,
        isPaid: r.isPaid,
        addedBy: "ai" as const,
        createdAt: new Date().toISOString(),
      }));
      const updatedResources = [...(project.resources || []), ...mappedResources];
      setProject({ ...project, resources: updatedResources });
    } catch (error) {
      console.error('Error finding resources:', error);
    } finally {
      setIsFindingResources(false);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Focused Chat Mode: When in active chat, hide tabs and show full conversation
  const isFocusedChatMode = currentChatId && activeTab === 'chat';

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Focused Chat Mode: Full-screen conversation */}
      {isFocusedChatMode ? (
        <div className="flex flex-col h-full max-h-screen">
          {/* Minimal Header - Only Back Navigation */}
          <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur px-3 sm:px-4 py-3">
            <div className="container max-w-4xl mx-auto flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentChatId(null)}
                className="h-8"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chats
              </Button>
              <div className="text-xs text-muted-foreground">
                {project.chats?.find(c => c.id === currentChatId)?.title || 'Chat'}
              </div>
            </div>
          </div>          {/* Messages - Full Screen */}
          {/* Use Unified ChatInterface */}
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Continue your learning conversation..."
            showWelcome={false}
            respectSidebar={true}
          />
        </div>
      ) : (
        /* Normal Mode: Tabs + Navigation */
        <>
          {/* Compact Header */}
          <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
            <div className="container max-w-4xl mx-auto px-4 py-2 md:px-4 pl-16 md:pl-4">
              {/* Single Row: Back + Project Info + Badges */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="h-7 px-2 flex-shrink-0">
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Projects</span>
                  </Button>
                  <span className="text-muted-foreground">/</span>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h1 className="text-sm font-semibold truncate">{project.title}</h1>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs h-5">{project.level}</Badge>
                  <Badge variant="outline" className="text-xs h-5">{project.progress}%</Badge>
                </div>
              </div>

              {/* Description + Tabs Row */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                  <TabsList className="grid w-full max-w-sm mx-auto grid-cols-3 h-8">
                    <TabsTrigger value="chat" className="text-xs gap-1.5">
                      <MessageSquare className="h-3 w-3" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="roadmap" className="text-xs gap-1.5">
                      <Map className="h-3 w-3" />
                      Roadmap
                    </TabsTrigger>
                    <TabsTrigger value="resources" className="text-xs gap-1.5">
                      <BookOpen className="h-3 w-3" />
                      Resources
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Resume Prompt - Single Compact Row */}
          {resumePrompt && (
            <div className="border-t px-4 py-2.5">
              <div className="container max-w-4xl mx-auto">
                <div 
                  onClick={() => {
                    if (resumePrompt.data?.chatId) {
                      navigate(`/projects/${projectId}/${resumePrompt.data.chatId}`);
                    }
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent hover:from-accent/10 hover:border-accent/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Sparkles className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                    <p className="text-sm truncate">
                      <span className="text-muted-foreground">Continue:</span>{' '}
                      <span className="font-medium text-accent">{project?.title}</span>
                      {resumePrompt.data.currentMilestone && (
                        <>
                          {' • '}
                          <span className="text-muted-foreground text-xs">{resumePrompt.data.currentMilestone}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <MessageSquare className="h-3.5 w-3.5 text-accent flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-32">
            <div className="container max-w-4xl mx-auto px-4 py-4">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              {!currentChatId ? (
                /* Home State - Just Input and History */
                <div className="space-y-6">
                  {/* Chat History - Compact List */}
                  {project.chats && project.chats.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Previous Conversations</h3>
                      <div className="grid gap-2">
                        {project.chats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => handleContinueChat(chat)}
                            className="group p-3 rounded-lg border border-border hover:border-accent/50 bg-background hover:bg-accent/5 transition-all text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate mb-1">{chat.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {chat.messages[chat.messages.length - 1]?.content.substring(0, 80)}...
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <Badge variant="outline" className="text-xs">
                                  {chat.messages.length}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fixed Chat Input - Always visible in home state */}
                  <div className="fixed bottom-0 left-0 right-0 md:left-64 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="container max-w-4xl mx-auto px-4">
                      <RuixenQueryBox
                        onSend={async (message) => {
                          await handleStartNewChatWithMessage(message);
                        }}
                        placeholder="Ask questions about this project..."
                        className="py-3"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Chat - Use Unified ChatInterface */
                <div className="h-[calc(100vh-16rem)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">
                      {project.chats?.find(c => c.id === currentChatId)?.title || 'New Chat'}
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setCurrentChatId(null)}>
                      View History
                    </Button>
                  </div>
                  
                  <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    placeholder="Ask questions about this project..."
                    showWelcome={false}
                    respectSidebar={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Roadmap Tab */}
          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              {project.roadmap ? (
                <>
                  <div className="space-y-4">
                    {project.roadmap.milestones.map((milestone, idx) => (
                      <Card key={milestone.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                {idx + 1}. {milestone.title}
                              </CardTitle>
                              <CardDescription className="mt-2">{milestone.objective}</CardDescription>
                            </div>
                            <Badge variant={milestone.completed ? "default" : "secondary"}>
                              {milestone.completed ? '✓ Done' : milestone.duration}
                            </Badge>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No roadmap generated yet
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              {/* Actions */}
              <div className="grid md:grid-cols-2 gap-3">
                {!isAddingResource ? (
                  <Button variant="outline" onClick={() => setIsAddingResource(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Resource Link
                  </Button>
                ) : (
                  <div className="flex gap-2 md:col-span-2">
                    <Input
                      value={resourceUrl}
                      onChange={(e) => setResourceUrl(e.target.value)}
                      placeholder="Paste resource URL..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddResource()}
                    />
                    <Button onClick={handleAddResource} size="sm">Add</Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingResource(false)}>Cancel</Button>
                  </div>
                )}
                
                <Button
                  variant="default"
                  onClick={handleFindResources}
                  disabled={isFindingResources}
                  className="gap-2"
                >
                  {isFindingResources ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Finding...</>
                  ) : (
                    <><Search className="h-4 w-4" /> Find More Resources</>
                  )}
                </Button>
              </div>

              {/* Resources List */}
              <div className="space-y-3">
                {(project.resources || []).length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No resources yet. Add some or let AI find the best ones!
                    </CardContent>
                  </Card>
                ) : (
                  (project.resources || []).map((resource, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-base">{resource.title}</CardTitle>
                            <CardDescription className="mt-2">{resource.description}</CardDescription>
                          </div>
                          <Badge variant={resource.isPaid ? "default" : "secondary"}>
                            {resource.isPaid ? '💰 Paid' : '🆓 Free'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline">{resource.type}</Badge>
                          <Badge variant="outline">{resource.level}</Badge>
                          <Badge variant="outline">{'⭐'.repeat(resource.quality)}</Badge>
                          {resource.platform && <Badge variant="secondary">{resource.platform}</Badge>}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                            View Resource
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Removed old chat input - ChatInterface handles it */}

      {/* Roadmap Chat Input - Centered Floating */}
      {!isFocusedChatMode && activeTab === 'roadmap' && (
        <div className="fixed bottom-0 left-0 md:left-[var(--sidebar-width)] right-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 bg-background/80 backdrop-blur-xl border-t border-border">
            <RuixenQueryBox
              value={roadmapInput}
              onChange={setRoadmapInput}
              onSend={() => handleEditRoadmap()}
              placeholder="Ask AI to modify your roadmap... (e.g., 'Add databases milestone' or 'Make it more beginner-friendly')"
              disabled={isEditingRoadmap}
              showVoice={false}
              showUpload={false}
            />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default ProjectDetail;
