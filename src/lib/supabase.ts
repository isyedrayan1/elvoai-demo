import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Types for database tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
          settings: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          created_at?: string;
          settings?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          created_at?: string;
          settings?: Record<string, any> | null;
        };
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          project_chat_id: string | null;
          role: 'user' | 'assistant';
          content: string;
          has_visual: boolean;
          visual_data: Record<string, any> | null;
          visual_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id?: string;
          project_chat_id?: string | null;
          role: 'user' | 'assistant';
          content: string;
          has_visual?: boolean;
          visual_data?: Record<string, any> | null;
          visual_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          project_chat_id?: string | null;
          role?: 'user' | 'assistant';
          content?: string;
          has_visual?: boolean;
          visual_data?: Record<string, any> | null;
          visual_url?: string | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          progress: number;
          total_milestones: number;
          completed_milestones: number;
          current_milestone: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          progress?: number;
          total_milestones?: number;
          completed_milestones?: number;
          current_milestone?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          progress?: number;
          total_milestones?: number;
          completed_milestones?: number;
          current_milestone?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_chats: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      resources: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          url: string;
          type: 'video' | 'website' | 'article';
          added_by: 'ai' | 'user';
          added_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          url: string;
          type: 'video' | 'website' | 'article';
          added_by: 'ai' | 'user';
          added_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          url?: string;
          type?: 'video' | 'website' | 'article';
          added_by?: 'ai' | 'user';
          added_at?: string;
        };
      };
      embeddings: {
        Row: {
          id: string;
          message_id: string;
          embedding: number[]; // pgvector type
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          embedding: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          embedding?: number[];
          created_at?: string;
        };
      };
      discover_feed: {
        Row: {
          id: string;
          title: string;
          description: string;
          url: string;
          source: string;
          category: string;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          url: string;
          source: string;
          category: string;
          published_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          url?: string;
          source?: string;
          category?: string;
          published_at?: string;
          created_at?: string;
        };
      };
    };
  };
}
