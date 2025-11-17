import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Clock, TrendingUp, CheckCircle2, Circle, ArrowRight, Sparkles, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [resumePrompt, setResumePrompt] = useState<any>(null);

  // Load projects from DB and check for resume prompt
  useEffect(() => {
    const loadProjects = () => {
      const loadedProjects = db.getProjects();
      setProjects(loadedProjects);
      
      // Get resume prompt if user has activity
      const prompt = db.getResumePrompt();
      if (prompt && prompt.type === 'project') {
        setResumePrompt(prompt);
      }
    };

    loadProjects();

    // Listen for storage changes
    window.addEventListener('storage', loadProjects);
    const interval = setInterval(loadProjects, 2000);

    return () => {
      window.removeEventListener('storage', loadProjects);
      clearInterval(interval);
    };
  }, []);

  const handleResumeProject = () => {
    if (resumePrompt?.data?.projectId) {
      navigate(`/projects/${resumePrompt.data.projectId}`);
    }
  };

  const handleCreateProject = () => {
    // Navigate to main chat with create_project param
    navigate('/?create_project=true');
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-24">
      {/* Header - Mobile Optimized */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Learning Journeys</h1>
              <p className="text-sm text-muted-foreground">Structured roadmaps with AI guidance</p>
            </div>
            <Button 
              className="gap-2 self-start sm:self-auto shadow-md hover:shadow-lg transition-all" 
              onClick={handleCreateProject}
              size="default"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">{/* Resume Prompt - Mobile Optimized */}
      {resumePrompt && projects.length > 0 && (
        <div 
          onClick={handleResumeProject}
          className="flex items-center justify-between px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/5 to-transparent hover:from-primary/10 hover:border-primary/30 transition-all cursor-pointer group active:scale-[0.99] shadow-sm"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Continue learning</p>
              <p className="font-semibold text-sm sm:text-base text-foreground truncate">
                {resumePrompt.data.projectTitle}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
        </div>
      )}

      {/* Empty State - Mobile Friendly */}
      {projects.length === 0 && (
        <Card className="border-dashed border-2 bg-muted/30 hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-8 sm:py-10 text-center sm:text-left">
            <div className="h-16 w-16 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-8 w-8 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-base sm:text-lg">Start Your First Learning Journey</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Create a structured project with AI-generated roadmaps, milestones, and personalized guidance
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid - Mobile-First Responsive */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {projects.map((project) => {
            const milestone = project.roadmap?.milestones[0];
            const completedCount = project.roadmap?.milestones.filter(m => m.completed).length || 0;
            const totalCount = project.roadmap?.milestones.length || 0;
            const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

            return (
              <Card
                key={project.id}
                className="group relative overflow-hidden border border-border/50 hover:border-border hover:shadow-xl transition-all duration-300 cursor-pointer bg-card/80 backdrop-blur-sm active:scale-[0.98]"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                {/* Progress Bar */}
                {project.roadmap && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <CardHeader className="space-y-2 sm:space-y-3 pb-3 sm:pb-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <CardTitle className="line-clamp-2 text-base sm:text-lg leading-tight">
                        {project.title}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0">
                      {completedCount}/{totalCount}
                    </Badge>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 pt-0">
                  {/* Current Milestone */}
                  {milestone && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
                      <CheckCircle2 className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${
                        milestone.completed ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <span className="text-xs sm:text-sm truncate flex-1">
                        {milestone.title}
                      </span>
                    </div>
                  )}

                  {/* Milestone Progress Dots */}
                  {project.roadmap && totalCount > 0 && (
                    <div className="flex items-center gap-1 pt-2">
                      {project.roadmap.milestones.slice(0, 8).map((m, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            m.completed
                              ? "bg-primary"
                              : i === completedCount
                              ? "bg-primary/50"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                      {totalCount > 8 && (
                        <span className="text-[10px] text-muted-foreground ml-1">+{totalCount - 8}</span>
                      )}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>{new Date(project.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: new Date(project.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })}</span>
                    </div>
                    {project.roadmap && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{Math.round(progress)}%</span>
                        <span>complete</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Cards - Mobile Optimized */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-2">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg">Milestone-Based Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Each project is broken into clear milestones with focused AI-generated conversations
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg">Visual Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Track your journey through each milestone with visual explanations and examples
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg">AI-Guided Path</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Personalized roadmap adapts to your pace with contextual conversations
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
};

export default Projects;
