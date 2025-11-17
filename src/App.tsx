import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import AskMindCoach from "./pages/AskMindCoach";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Discover from "./pages/Discover";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Main pages - all AI-powered */}
            <Route path="/" element={<AskMindCoach />} />
            <Route path="/chat/:chatId" element={<AskMindCoach />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/:chatId" element={<ProjectDetail />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Redirect old routes */}
            <Route path="/explore" element={<Navigate to="/" replace />} />
            <Route path="/upskill" element={<Navigate to="/projects" replace />} />
            <Route path="/ask-mindcoach" element={<Navigate to="/" replace />} />
            <Route path="/create-project" element={<Navigate to="/projects" replace />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
