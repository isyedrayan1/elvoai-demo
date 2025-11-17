-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (synced with Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_milestones INTEGER DEFAULT 0,
  completed_milestones INTEGER DEFAULT 0,
  current_milestone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project chats table
CREATE TABLE project_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (supports both main chats and project chats)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  project_chat_id UUID REFERENCES project_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  has_visual BOOLEAN DEFAULT FALSE,
  visual_data JSONB,
  visual_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT message_belongs_to_chat CHECK (
    (chat_id IS NOT NULL AND project_chat_id IS NULL) OR
    (chat_id IS NULL AND project_chat_id IS NOT NULL)
  )
);

-- Embeddings table (for RAG)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  embedding vector(1024), -- JINA Embeddings v3 dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'website', 'article')),
  added_by TEXT NOT NULL CHECK (added_by IN ('ai', 'user')),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discover feed table
CREATE TABLE discover_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_project_chat_id ON messages(project_chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_project_chats_project_id ON project_chats(project_id);
CREATE INDEX idx_resources_project_id ON resources(project_id);
CREATE INDEX idx_discover_feed_published_at ON discover_feed(published_at DESC);
CREATE INDEX idx_discover_feed_category ON discover_feed(category);

-- Vector similarity index (IVFFlat for faster approximate search)
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_feed ENABLE ROW LEVEL SECURITY;

-- Users: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Chats: Users can only access their own chats
CREATE POLICY "Users can view own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: Users can access messages from their chats
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_chats 
      JOIN projects ON projects.id = project_chats.project_id 
      WHERE project_chats.id = messages.project_chat_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_chats 
      JOIN projects ON projects.id = project_chats.project_id 
      WHERE project_chats.id = messages.project_chat_id AND projects.user_id = auth.uid()
    )
  );

-- Projects: Users can only access their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Project chats: Users can access chats from their projects
CREATE POLICY "Users can view own project chats" ON project_chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_chats.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project chats" ON project_chats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_chats.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project chats" ON project_chats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_chats.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project chats" ON project_chats
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_chats.project_id AND projects.user_id = auth.uid()
    )
  );

-- Resources: Users can access resources from their projects
CREATE POLICY "Users can view own resources" ON resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = resources.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own resources" ON resources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = resources.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own resources" ON resources
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = resources.project_id AND projects.user_id = auth.uid()
    )
  );

-- Embeddings: Users can access embeddings from their messages
CREATE POLICY "Users can view own embeddings" ON embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN chats ON chats.id = messages.chat_id
      WHERE messages.id = embeddings.message_id AND chats.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM messages
      JOIN project_chats ON project_chats.id = messages.project_chat_id
      JOIN projects ON projects.id = project_chats.project_id
      WHERE messages.id = embeddings.message_id AND projects.user_id = auth.uid()
    )
  );

-- Discover feed: Public read access for all authenticated users
CREATE POLICY "Authenticated users can view discover feed" ON discover_feed
  FOR SELECT USING (auth.role() = 'authenticated');

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_chats_updated_at BEFORE UPDATE ON project_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
