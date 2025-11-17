/**
 * Context Manager - Handles conversation context, memory, and RAG
 * This ensures AI responses are contextually aware of:
 * - Current project
 * - Current milestone
 * - Chat history
 * - Roadmap progress
 * - Resources
 * - Weak areas
 */

import { db, type Chat, type Project, type Message, type Milestone } from './db';

export interface ConversationContext {
  // Project context
  projectId?: string;
  projectTitle?: string;
  projectDescription?: string;
  projectLevel?: string;
  
  // Roadmap context
  currentMilestone?: Milestone;
  completedMilestones?: string[];
  nextMilestone?: Milestone;
  
  // Chat context
  chatId?: string;
  chatHistory?: Message[];
  recentMessages?: Message[];
  
  // Learning context
  weakAreas?: string[];
  learningStyle?: string;
  progress?: number;
  
  // Resource context
  relevantResources?: any[];
  
  // Session context
  isResuming?: boolean;
  lastTopic?: string;
}

class ContextManager {
  
  /**
   * Build complete context for general chat (outside projects)
   */
  buildGeneralChatContext(chatId?: string): ConversationContext {
    const context: ConversationContext = {};
    
    if (chatId) {
      const chat = db.getChat(chatId);
      if (chat) {
        context.chatId = chatId;
        context.chatHistory = chat.messages;
        context.recentMessages = chat.messages.slice(-10); // Last 10 messages
        context.lastTopic = this.extractLastTopic(chat.messages);
      }
    }
    
    return context;
  }
  
  /**
   * Build complete context for project chat
   * This is where RAG happens - we gather all relevant information
   */
  buildProjectChatContext(projectId: string, chatId?: string, milestoneId?: string): ConversationContext {
    const project = db.getProject(projectId);
    if (!project) return {};
    
    const context: ConversationContext = {
      projectId,
      projectTitle: project.title,
      projectDescription: project.description,
      projectLevel: project.level,
      progress: project.progress,
      weakAreas: db.detectWeakAreas(projectId)
    };
    
    // Add roadmap context
    if (project.roadmap) {
      const milestones = project.roadmap.milestones;
      
      context.completedMilestones = milestones
        .filter(m => m.completed)
        .map(m => m.title);
      
      // Current milestone
      if (milestoneId) {
        context.currentMilestone = milestones.find(m => m.id === milestoneId);
      } else {
        // Find first incomplete milestone
        context.currentMilestone = milestones.find(m => !m.completed);
      }
      
      // Next milestone
      if (context.currentMilestone) {
        const currentIndex = milestones.indexOf(context.currentMilestone);
        context.nextMilestone = milestones[currentIndex + 1];
      }
    }
    
    // Add chat context
    if (chatId) {
      const chat = db.getProjectChat(projectId, chatId);
      if (chat) {
        context.chatId = chatId;
        context.chatHistory = chat.messages;
        context.recentMessages = chat.messages.slice(-10);
        context.lastTopic = this.extractLastTopic(chat.messages);
        context.isResuming = chat.messages.length > 0;
        
        // Detect weak areas from this chat
        if (chat.weakAreas) {
          context.weakAreas = [...new Set([...(context.weakAreas || []), ...chat.weakAreas])];
        }
      }
    }
    
    // Add relevant resources
    if (context.currentMilestone) {
      context.relevantResources = project.resources.filter(r =>
        r.milestoneIds?.includes(context.currentMilestone!.id)
      );
    } else {
      context.relevantResources = project.resources.slice(0, 5);
    }
    
    return context;
  }
  
  /**
   * Generate system prompt based on context
   * This creates the coaching personality and contextual awareness
   */
  generateSystemPrompt(context: ConversationContext, mode: "general" | "project"): string {
    if (mode === "general") {
      return this.generateGeneralChatPrompt(context);
    } else {
      return this.generateProjectChatPrompt(context);
    }
  }
  
  private generateGeneralChatPrompt(context: ConversationContext): string {
    let prompt = `You are MindCoach - a calm, intelligent AI learning coach.

YOUR PERSONALITY:
- Clear, concise, no lecture voice
- Talk like a mentor, not a motivational poster
- No long lessons; only tight explanations
- Ask questions instead of dumping information
- Give just enough clarity for the user to think
- Encourage action, not consumption
- Never pretend to know everything; stay grounded
- Speak like a human expert, not a bot

YOUR BEHAVIOR:
1. Diagnose first: "Tell me what you understand so far."
2. Explain minimally: 1-3 sentences + example
3. Give tiny actions: micro-steps
4. Correct and guide
5. Use analogies and real-world examples
6. Check understanding: "Can you explain that in your own words?"
7. Never feel templated - respond naturally

WHEN USER EXPRESSES A LEARNING GOAL:
- Detect the intent
- Offer to create a project: "Want to turn this into a structured learning journey?"
- Don't force it; just suggest

`;

    if (context.lastTopic) {
      prompt += `\nLAST DISCUSSION: ${context.lastTopic}\n`;
    }

    return prompt;
  }
  
  private generateProjectChatPrompt(context: ConversationContext): string {
    let prompt = `You are MindCoach - an AI learning coach helping with the project: "${context.projectTitle}".

PROJECT DETAILS:
${context.projectDescription}
Level: ${context.projectLevel}
Progress: ${context.progress}%

YOUR COACHING STYLE:
1. Teach through conversation, not lectures
2. Ask follow-up questions to diagnose understanding
3. Use analogies and real-world examples
4. Give tiny hands-on actions: "Try writing...", "Explain back to me..."
5. Correct gently: "Almost! But think about..."
6. Celebrate small wins
7. Link to roadmap only when natural
8. Be adaptive - if they're confused, try different explanations
9. Check understanding: "Can you explain that in your own words?"
10. Never feel templated - respond like a real human coach

`;

    // Add roadmap context
    if (context.currentMilestone) {
      prompt += `\nCURRENT MILESTONE: "${context.currentMilestone.title}"
Objective: ${context.currentMilestone.objective}
Status: ${context.currentMilestone.status}
`;
    }

    if (context.completedMilestones && context.completedMilestones.length > 0) {
      prompt += `\nCOMPLETED MILESTONES: ${context.completedMilestones.join(', ')}\n`;
    }

    if (context.nextMilestone) {
      prompt += `\nNEXT UP: "${context.nextMilestone.title}"\n`;
    }

    // Add weak areas
    if (context.weakAreas && context.weakAreas.length > 0) {
      prompt += `\nWEAK AREAS (revisit when needed): ${context.weakAreas.join(', ')}\n`;
    }

    // Add resource context
    if (context.relevantResources && context.relevantResources.length > 0) {
      prompt += `\nRELEVANT RESOURCES AVAILABLE:
${context.relevantResources.map(r => `- ${r.title} (${r.type})`).join('\n')}
`;
    }

    // Resumption context
    if (context.isResuming && context.lastTopic) {
      prompt += `\nLAST DISCUSSION: ${context.lastTopic}
(The user is continuing from where they left off)\n`;
    }

    prompt += `\nRemember: This is CONVERSATIONAL learning. Be natural, encouraging, and adaptive.`;

    return prompt;
  }
  
  /**
   * Extract last discussed topic from messages
   */
  private extractLastTopic(messages: Message[]): string | undefined {
    const userMessages = messages.filter(m => m.role === "user").slice(-3);
    if (userMessages.length === 0) return undefined;
    
    // Simple extraction - get keywords from last user message
    const lastMessage = userMessages[userMessages.length - 1].content;
    return lastMessage.substring(0, 100);
  }
  
  /**
   * Detect weak areas from conversation
   * This analyzes the chat to find concepts the user struggles with
   */
  detectWeakAreasFromChat(messages: Message[]): string[] {
    const weakAreas: string[] = [];
    
    // Look for patterns:
    // - Repeated questions about same concept
    // - AI saying "let me explain differently"
    // - User saying "I don't understand"
    
    const conceptCounts = new Map<string, number>();
    
    messages.forEach((msg, index) => {
      if (msg.role === "user") {
        const content = msg.content.toLowerCase();
        
        // Detect confusion phrases
        if (
          content.includes("don't understand") ||
          content.includes("confused") ||
          content.includes("what does") ||
          content.includes("explain again")
        ) {
          // Look at previous assistant message to identify concept
          if (index > 0) {
            const prevMessage = messages[index - 1];
            if (prevMessage.role === "assistant") {
              // Extract key terms (simple approach)
              const words = prevMessage.content.split(' ');
              const concepts = words.filter(w => w.length > 8); // Longer words likely concepts
              concepts.forEach(concept => {
                const count = conceptCounts.get(concept) || 0;
                conceptCounts.set(concept, count + 1);
              });
            }
          }
        }
      }
    });
    
    // Concepts mentioned multiple times in confusion context
    conceptCounts.forEach((count, concept) => {
      if (count >= 2) {
        weakAreas.push(concept);
      }
    });
    
    return weakAreas.slice(0, 5); // Top 5 weak areas
  }
  
  /**
   * Update milestone status based on chat progress
   */
  updateMilestoneFromChat(projectId: string, milestoneId: string, messages: Message[]): void {
    if (messages.length < 5) return; // Need some conversation
    
    const weakAreas = this.detectWeakAreasFromChat(messages);
    const hasWeakAreas = weakAreas.length > 0;
    
    // Check if milestone seems completed
    const lastMessages = messages.slice(-5);
    const hasCompletionSignals = lastMessages.some(m =>
      m.role === "assistant" && (
        m.content.toLowerCase().includes("great job") ||
        m.content.toLowerCase().includes("you got it") ||
        m.content.toLowerCase().includes("well done") ||
        m.content.toLowerCase().includes("ready to move")
      )
    );
    
    const updates: Partial<Milestone> = {};
    
    if (hasWeakAreas) {
      updates.status = "struggling";
      updates.weakAreas = weakAreas;
    } else if (hasCompletionSignals) {
      updates.status = "completed";
      updates.completed = true;
      updates.progress = 100;
    } else {
      updates.status = "in-progress";
      updates.progress = Math.min(90, messages.length * 10); // Rough progress
    }
    
    db.updateMilestone(projectId, milestoneId, updates);
  }
}

export const contextManager = new ContextManager();
