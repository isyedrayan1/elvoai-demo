import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, BookOpen, Loader2, Send, Sparkles, Map, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { streamChat, generateRoadmap, gatherResources, type Roadmap, type Resource } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { db, type Project as DBProject } from "@/lib/db";

type Message = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

type Project = DBProject;

const Upskill = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<'chat' | 'generating' | 'preview'>('chat');
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm here to help you create a personalized learning project. 🎯

Let's have a conversation about what you want to learn:
- What skill or topic interests you?
- What's your current level? (beginner/intermediate/advanced)
- What's your goal? (career change, skill improvement, hobby, etc.)
- How much time can you dedicate? (hours per week)

Just tell me what you want to learn, and I'll ask follow-up questions to create the perfect roadmap for you!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Generated data
  const [projectData, setProjectData] = useState<{
    topic: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    roadmap?: Roadmap;
    resources?: Resource[];
  } | null>(null);

  // Load projects from DB
  useEffect(() => {
    const loadedProjects = db.getProjects();
    setProjects(loadedProjects);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      // Stream AI response
      setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);
      
      let fullResponse = "";
      await streamChat(
        messages.concat([{ role: "user", content: userMessage }]),
        (chunk) => {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1 ? { ...msg, content: fullResponse } : msg
            )
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1 ? { ...msg, isStreaming: false } : msg
            )
          );
          setIsLoading(false);
        },
        (error) => {
          console.error('Chat error:', error);
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? { ...msg, content: `Error: ${error.message}`, isStreaming: false }
                : msg
            )
          );
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setDialogStep('generating');
    
    try {
      // Extract project details from conversation
      const conversationContext = messages.map(m => m.content).join('\n');
      
      // Determine topic (from first user message usually)
      const firstUserMsg = messages.find(m => m.role === 'user')?.content || '';
      const topic = firstUserMsg.split(' ').slice(0, 5).join(' '); // Simple extraction
      
      // Generate roadmap
      const roadmap = await generateRoadmap(topic, 'beginner', 'month', []);
      
      // Gather resources in parallel
      const resources = await gatherResources(topic, 'all', 'beginner', 10);
      
      setProjectData({
        topic,
        level: 'beginner',
        roadmap,
        resources,
      });
      
      setDialogStep('preview');
    } catch (error) {
      console.error('Generation error:', error);
      alert(`Failed to generate roadmap: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDialogStep('chat');
    }
  };

  const handleSaveProject = () => {
    if (!projectData || !projectData.roadmap) return;

    // Create project using db module (which handles proper structure)
    const newProject = db.createProject({
      title: projectData.roadmap.title,
      description: projectData.roadmap.description,
      level: projectData.level,
      roadmap: projectData.roadmap,
      resources: projectData.resources || [],
      chats: [], // Initialize empty chats array for sub-chat functionality
    });

    // Update local state
    setProjects(prev => [newProject, ...prev]);
    
    // Reset dialog
    setIsDialogOpen(false);
    setDialogStep('chat');
    setMessages([
      {
        role: "assistant",
        content: `Hi! I'm here to help you create a personalized learning project. 🎯

Let's have a conversation about what you want to learn:
- What skill or topic interests you?
- What's your current level? (beginner/intermediate/advanced)
- What's your goal? (career change, skill improvement, hobby, etc.)
- How much time can you dedicate? (hours per week)

Just tell me what you want to learn, and I'll ask follow-up questions to create the perfect roadmap for you!`,
      },
    ]);
    setProjectData(null);
    
    // Navigate to the new project
    navigate(`/projects/${newProject.id}`);
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6 md:p-6 pl-20 md:pl-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Learning Projects</h1>
          <p className="text-muted-foreground">AI-guided conversations that become structured learning paths</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {dialogStep === 'chat' && '💬 Let\'s Chat About Your Learning Goals'}
                {dialogStep === 'generating' && '✨ Generating Your Personalized Learning Path...'}
                {dialogStep === 'preview' && '🎯 Your Custom Learning Project'}
              </DialogTitle>
              <DialogDescription>
                {dialogStep === 'chat' && 'Have a conversation with AI to design your perfect learning journey'}
                {dialogStep === 'generating' && 'Creating roadmap and gathering resources...'}
                {dialogStep === 'preview' && 'Review and save your AI-generated learning path'}
              </DialogDescription>
            </DialogHeader>

            {/* Chat Step */}
            {dialogStep === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/20">
                  {messages.map((message, i) => (
                    <div
                      key={i}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <Card
                        className={`max-w-[80%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background'
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                            {message.isStreaming && !message.content && (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Thinking...
                              </div>
                            )}
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="Tell me what you want to learn..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="icon" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleGenerateRoadmap}
                    className="w-full gap-2"
                    variant="default"
                    disabled={messages.filter(m => m.role === 'user').length < 1}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate My Learning Roadmap
                  </Button>
                </div>
              </div>
            )}

            {/* Generating Step */}
            {dialogStep === 'generating' && (
              <div className="py-16 flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-accent" />
                <div className="space-y-2 text-center">
                  <p className="font-medium text-lg">Creating your personalized learning path...</p>
                  <p className="text-sm text-muted-foreground">
                    ✨ Analyzing conversation<br />
                    🗺️ Generating structured roadmap<br />
                    📚 Gathering curated resources<br />
                    🎯 Optimizing for your goals
                  </p>
                </div>
              </div>
            )}

            {/* Preview Step */}
            {dialogStep === 'preview' && projectData?.roadmap && (
              <div className="space-y-4 overflow-y-auto flex-1">
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <h3 className="font-bold text-xl mb-2">{projectData.roadmap.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{projectData.roadmap.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge><Map className="h-3 w-3 mr-1" />{projectData.roadmap.milestones.length} milestones</Badge>
                    <Badge><Clock className="h-3 w-3 mr-1" />{projectData.roadmap.totalDuration}</Badge>
                    <Badge><BookOpen className="h-3 w-3 mr-1" />{projectData.resources?.length} resources</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Learning Milestones</h4>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {projectData.roadmap.milestones.slice(0, 5).map((milestone, idx) => (
                      <Card key={milestone.id} className="border-l-4 border-l-accent">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{idx + 1}. {milestone.title}</CardTitle>
                          <CardDescription className="text-xs">{milestone.objective}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogStep('chat')} className="flex-1">
                    ← Back to Chat
                  </Button>
                  <Button onClick={handleSaveProject} className="flex-1 gap-2">
                    <Target className="h-4 w-4" />
                    Start Learning
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-dashed border-2 hover:border-accent transition-colors cursor-pointer" onClick={() => setIsDialogOpen(true)}>
            <CardHeader className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Start Your First Project</CardTitle>
              <CardDescription>Chat with AI to create your personalized learning path</CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{project.level}</Badge>
                  <Badge variant="outline" className="text-xs">{project.roadmap?.milestones.length} milestones</Badge>
                  <Badge variant="outline" className="text-xs">{project.resources?.length} resources</Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Upskill;

