import { MessageSquare, Target, Compass, Settings, Plus, Menu, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { db } from "@/lib/db";

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  level: string;
  progress: number;
  updatedAt?: string;
  chats?: Chat[];
}

export function AppSidebar() {
  const navigate = useNavigate();
  const { state, isMobile: sidebarIsMobile } = useSidebar();
  const isMobileHook = useIsMobile();
  const isMobile = sidebarIsMobile || isMobileHook;
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const isCollapsed = state === "collapsed";

  // Load recent chats and projects from DB
  useEffect(() => {
    const loadData = () => {
      // Load chats from DB
      const chats = db.getChats();
      setRecentChats(chats.slice(0, 10)); // Show last 10 chats

      // Load projects with their chats from DB
      const projectList = db.getProjects();
      const projectsWithChats = projectList.map(project => ({
        ...project,
        chats: db.getProjectChats(project.id).slice(0, 5) // Show last 5 chats per project
      }));
      setProjects(projectsWithChats.slice(0, 10)); // Show last 10 projects
    };

    loadData();
    
    // Listen for storage changes (when new chat/project is created)
    window.addEventListener('storage', loadData);
    
    // Poll every 2 seconds to catch same-tab updates
    const interval = setInterval(loadData, 2000);
    
    return () => {
      window.removeEventListener('storage', loadData);
      clearInterval(interval);
    };
  }, []);

  const handleNewChat = () => {
    navigate("/");
    window.location.reload(); // Force refresh to start new chat
  };

  return (
    <>
      {/* Mobile Floating Toggle */}
      {isMobile && (
        <div className="fixed top-3 left-3 z-50 md:hidden">
          <SidebarTrigger className="bg-background/95 backdrop-blur-md border border-border/50 shadow-lg rounded-xl h-11 w-11 hover:bg-background active:scale-95 transition-all" />
        </div>
      )}

      <Sidebar className="border-r border-border bg-sidebar" collapsible="icon">
        <SidebarHeader className="border-b border-border/50 p-3 md:p-4 bg-sidebar">
          <div className="flex flex-col gap-2">
            {!isMobile && <SidebarTrigger className="self-end -mr-2 h-8 w-8" />}
            <div className="flex items-center gap-3 px-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-primary-foreground font-bold text-base">M</span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight">MindCoach</span>
                  <span className="text-[10px] text-muted-foreground">Learn & Grow</span>
                </div>
              )}
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* New Chat Button */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleNewChat}
                    className="flex items-center gap-3 h-10"
                    tooltip="New Chat"
                  >
                    <Plus className="h-4 w-4" />
                    {!isCollapsed && <span>New Chat</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Recent Chats */}
                {recentChats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton asChild tooltip={chat.title}>
                      <NavLink
                        to={`/chat/${chat.id}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span className="truncate">{chat.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* Divider */}
                {recentChats.length > 0 && (
                  <div className="my-2 border-t border-border" />
                )}

                {/* Projects Navigation */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Projects">
                    <NavLink
                      to="/projects"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <Target className="h-4 w-4" />
                      {!isCollapsed && <span>Projects</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Active Projects with Sub-chats */}
                {projects.map((project) => (
                  <Collapsible key={project.id} defaultOpen={false}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center w-full">
                          <SidebarMenuButton asChild tooltip={project.title} className="flex-1">
                            <NavLink
                              to={`/projects/${project.id}`}
                              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            >
                              <Target className="h-4 w-4 flex-shrink-0" />
                              {!isCollapsed && <span className="truncate flex-1">{project.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                          {!isCollapsed && project.chats && project.chats.length > 0 && (
                            <ChevronRight className="h-4 w-4 mr-2 transition-transform [[data-state=open]_&]:rotate-90" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      {!isCollapsed && project.chats && project.chats.length > 0 && (
                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1">
                            {project.chats.map((chat) => (
                              <SidebarMenuButton key={chat.id} asChild tooltip={chat.title} size="sm">
                                <NavLink
                                  to={`/projects/${project.id}/${chat.id}`}
                                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                  activeClassName="bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium"
                                >
                                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{chat.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                ))}

                {/* Divider */}
                <div className="my-2 border-t border-border" />

                {/* Discover Navigation */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Discover">
                    <NavLink
                      to="/discover"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <Compass className="h-4 w-4" />
                      {!isCollapsed && <span>Discover</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <Settings className="h-4 w-4" />
                  {!isCollapsed && <span>Settings</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
