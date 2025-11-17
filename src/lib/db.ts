/**
 * Database Layer - localStorage with proper structure and context management
 * This handles all data persistence and retrieval
 */

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  projectId?: string; // If chat belongs to a project
  milestoneId?: string; // If chat is linked to a roadmap milestone
  weakAreas?: string[]; // AI-detected weak areas
  lastMilestone?: string; // Last discussed milestone
}

export interface Milestone {
  id: string;
  title: string;
  objective: string;
  duration: string;
  completed: boolean;
  progress: number;
  status: "not-started" | "in-progress" | "completed" | "struggling";
  dependencies?: string[];
  weakAreas?: string[];
  chatIds?: string[]; // Chats related to this milestone
}

export interface Roadmap {
  title: string;
  description: string;
  level: string;
  totalDuration: string;
  milestones: Milestone[];
  lastUpdated: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: "video" | "article" | "doc" | "course" | "link" | "pdf";
  level: string;
  quality: number;
  description: string;
  topics: string[];
  platform?: string;
  isPaid: boolean;
  addedBy: "ai" | "user";
  milestoneIds?: string[];
  tags?: string[];
  insights?: string; // AI-extracted key points
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  roadmap?: Roadmap;
  resources: Resource[];
  chats: Chat[];
  createdAt: string;
  updatedAt: string;
  progress: number;
  currentMilestone?: string;
  weakAreas?: string[];
  learningStyle?: string; // AI-detected preferred style
}

export interface UserContext {
  currentProject?: string;
  currentChat?: string;
  lastActivity: string;
  totalChats: number;
  totalProjects: number;
  preferredExplanationStyle?: "visual" | "textual" | "examples";
}

class Database {
  private readonly CHATS_KEY = "mindcoach-chats";
  private readonly PROJECTS_KEY = "mindcoach-projects";
  private readonly CONTEXT_KEY = "mindcoach-context";

  // ===== GENERAL CHATS (Outside Projects) =====
  
  getChats(): Chat[] {
    const data = localStorage.getItem(this.CHATS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getChat(chatId: string): Chat | null {
    const chats = this.getChats();
    return chats.find(c => c.id === chatId) || null;
  }

  saveChat(chat: Chat): void {
    const chats = this.getChats();
    const index = chats.findIndex(c => c.id === chat.id);
    
    if (index >= 0) {
      chats[index] = { ...chat, updatedAt: new Date().toISOString() };
    } else {
      chats.unshift(chat);
    }
    
    localStorage.setItem(this.CHATS_KEY, JSON.stringify(chats));
    this.updateContext({ lastActivity: new Date().toISOString() });
  }

  deleteChat(chatId: string): void {
    const chats = this.getChats().filter(c => c.id !== chatId);
    localStorage.setItem(this.CHATS_KEY, JSON.stringify(chats));
  }

  // ===== PROJECTS =====
  
  getProjects(): Project[] {
    const data = localStorage.getItem(this.PROJECTS_KEY);
    const projects = data ? JSON.parse(data) : [];
    
    // Migration: Ensure all projects have chats array (for old projects)
    const migratedProjects = projects.map((project: any) => {
      if (!project.chats) {
        project.chats = [];
      }
      if (!project.updatedAt) {
        project.updatedAt = project.createdAt || new Date().toISOString();
      }
      if (!project.resources) {
        project.resources = [];
      }
      return project;
    });
    
    // Save migrated data if any changes were made
    const needsMigration = projects.some((p: any) => !p.chats || !p.updatedAt || !p.resources);
    if (needsMigration) {
      localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(migratedProjects));
    }
    
    return migratedProjects;
  }

  getProject(projectId: string): Project | null {
    const projects = this.getProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'progress'>): Project {
    const project: Project = {
      ...data,
      id: `project-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
    };
    this.saveProject(project);
    return project;
  }

  saveProject(project: Project): void {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    project.updatedAt = new Date().toISOString();
    
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.unshift(project);
    }
    
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    this.updateContext({ lastActivity: new Date().toISOString() });
  }

  deleteProject(projectId: string): void {
    const projects = this.getProjects().filter(p => p.id !== projectId);
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
  }

  // ===== PROJECT CHATS =====
  
  getProjectChats(projectId: string): Chat[] {
    const project = this.getProject(projectId);
    return project?.chats || [];
  }

  getProjectChat(projectId: string, chatId: string): Chat | null {
    const chats = this.getProjectChats(projectId);
    return chats.find(c => c.id === chatId) || null;
  }

  saveProjectChat(projectId: string, chat: Chat): void {
    const project = this.getProject(projectId);
    if (!project) return;

    chat.projectId = projectId;
    chat.updatedAt = new Date().toISOString();

    const index = project.chats.findIndex(c => c.id === chat.id);
    if (index >= 0) {
      project.chats[index] = chat;
    } else {
      project.chats.unshift(chat);
    }

    this.saveProject(project);
  }

  deleteProjectChat(projectId: string, chatId: string): void {
    const project = this.getProject(projectId);
    if (!project) return;

    project.chats = project.chats.filter(c => c.id !== chatId);
    this.saveProject(project);
  }

  // ===== ROADMAP =====
  
  updateRoadmap(projectId: string, roadmap: Roadmap): void {
    const project = this.getProject(projectId);
    if (!project) return;

    roadmap.lastUpdated = new Date().toISOString();
    project.roadmap = roadmap;
    
    // Calculate progress
    const completed = roadmap.milestones.filter(m => m.completed).length;
    project.progress = Math.round((completed / roadmap.milestones.length) * 100);
    
    this.saveProject(project);
  }

  updateMilestone(projectId: string, milestoneId: string, updates: Partial<Milestone>): void {
    const project = this.getProject(projectId);
    if (!project?.roadmap) return;

    const milestone = project.roadmap.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      Object.assign(milestone, updates);
      this.updateRoadmap(projectId, project.roadmap);
    }
  }

  // ===== RESOURCES =====
  
  addResource(projectId: string, resource: Resource): void {
    const project = this.getProject(projectId);
    if (!project) return;

    resource.id = resource.id || `resource-${Date.now()}`;
    resource.createdAt = new Date().toISOString();
    project.resources.push(resource);
    
    this.saveProject(project);
  }

  deleteResource(projectId: string, resourceId: string): void {
    const project = this.getProject(projectId);
    if (!project) return;

    project.resources = project.resources.filter(r => r.id !== resourceId);
    this.saveProject(project);
  }

  // ===== CONTEXT MANAGEMENT =====
  
  getContext(): UserContext {
    const data = localStorage.getItem(this.CONTEXT_KEY);
    return data ? JSON.parse(data) : {
      lastActivity: new Date().toISOString(),
      totalChats: 0,
      totalProjects: 0
    };
  }

  updateContext(updates: Partial<UserContext>): void {
    const context = this.getContext();
    Object.assign(context, updates);
    localStorage.setItem(this.CONTEXT_KEY, JSON.stringify(context));
  }

  // ===== SMART FEATURES =====
  
  detectWeakAreas(projectId: string): string[] {
    const project = this.getProject(projectId);
    if (!project) return [];

    const weakAreas = new Set<string>();
    
    // Analyze chats for repeated questions
    project.chats.forEach(chat => {
      if (chat.weakAreas) {
        chat.weakAreas.forEach(area => weakAreas.add(area));
      }
    });

    // Analyze roadmap for struggling milestones
    project.roadmap?.milestones.forEach(milestone => {
      if (milestone.status === "struggling" && milestone.weakAreas) {
        milestone.weakAreas.forEach(area => weakAreas.add(area));
      }
    });

    return Array.from(weakAreas);
  }

  getResumePrompt(): { type: "project" | "chat" | null; data: any } | null {
    const context = this.getContext();
    
    // Check for active project
    if (context.currentProject) {
      const project = this.getProject(context.currentProject);
      if (project && context.currentChat) {
        const chat = this.getProjectChat(context.currentProject, context.currentChat);
        if (chat && chat.messages.length > 0) {
          return {
            type: "project",
            data: {
              projectTitle: project.title,
              chatTitle: chat.title,
              lastMessage: chat.messages[chat.messages.length - 1]?.content.substring(0, 100)
            }
          };
        }
      }
    }

    // Check for recent general chat
    const chats = this.getChats();
    if (chats.length > 0 && chats[0].messages.length > 0) {
      return {
        type: "chat",
        data: {
          chatTitle: chats[0].title,
          lastMessage: chats[0].messages[chats[0].messages.length - 1]?.content.substring(0, 100)
        }
      };
    }

    return null;
  }

  // ===== ANALYTICS =====
  
  getProjectAnalytics(projectId: string) {
    const project = this.getProject(projectId);
    if (!project) return null;

    return {
      totalChats: project.chats.length,
      totalMessages: project.chats.reduce((sum, chat) => sum + chat.messages.length, 0),
      completedMilestones: project.roadmap?.milestones.filter(m => m.completed).length || 0,
      totalMilestones: project.roadmap?.milestones.length || 0,
      weakAreas: this.detectWeakAreas(projectId),
      resources: {
        total: project.resources.length,
        ai: project.resources.filter(r => r.addedBy === "ai").length,
        user: project.resources.filter(r => r.addedBy === "user").length
      }
    };
  }
}

export const db = new Database();
