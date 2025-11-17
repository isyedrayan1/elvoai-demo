import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { FlowDiagram } from "./FlowDiagram";
import { Lightbulb, AlertCircle, Target, BookOpen, Sparkles } from "lucide-react";

interface VisualData {
  type: 'mermaid' | 'comparison-chart' | 'illustration' | 'text' | 'ai-image' | 'flow-diagram';
  content?: string; // For mermaid diagrams (legacy)
  flowData?: {
    nodes: any[];
    edges: any[];
  };
  data?: any[]; // For charts
  chartType?: 'bar' | 'radar' | 'line';
  imageUrl?: string; // For AI-generated images
  title?: string;
  description?: string;
  
  // Educational enhancements
  learningObjective?: string;
  prerequisites?: string;
  keyTakeaways?: string[];
  commonMistakes?: string[];
  realWorldExample?: string;
  realWorldExamples?: { item1Name?: string; item2Name?: string };
  whenToUse?: { item1Name?: string; item2Name?: string };
  practicePrompt?: string;
}

interface VisualMessageProps {
  visual: VisualData;
}

// Educational Context - Simple inline text like ChatGPT
const EducationalContext = ({ visual }: { visual: VisualData }) => {
  if (!visual.learningObjective && !visual.prerequisites && !visual.keyTakeaways && 
      !visual.commonMistakes && !visual.realWorldExample && !visual.practicePrompt) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
      {visual.learningObjective && (
        <p><strong className="text-foreground">🎯 Learning Objective:</strong> {visual.learningObjective}</p>
      )}

      {visual.prerequisites && (
        <p><strong className="text-foreground">📚 Prerequisites:</strong> {visual.prerequisites}</p>
      )}

      {visual.keyTakeaways && visual.keyTakeaways.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-1">💡 Key Takeaways:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            {visual.keyTakeaways.map((takeaway, i) => (
              <li key={i}>{takeaway}</li>
            ))}
          </ul>
        </div>
      )}

      {visual.commonMistakes && visual.commonMistakes.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-1">⚠️ Common Mistakes:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            {visual.commonMistakes.map((mistake, i) => (
              <li key={i}>{mistake}</li>
            ))}
          </ul>
        </div>
      )}

      {visual.realWorldExample && (
        <p><strong className="text-foreground">✨ Real-World Example:</strong> {visual.realWorldExample}</p>
      )}

      {visual.practicePrompt && (
        <p><strong className="text-foreground">🚀 Try This:</strong> {visual.practicePrompt}</p>
      )}
    </div>
  );
};

export const VisualMessage = ({ visual }: VisualMessageProps) => {
  const [error, setError] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // React Flow Diagram (NEW - replaces Mermaid)
  if (visual.type === 'flow-diagram' && visual.flowData) {
    return (
      <div>
        <FlowDiagram
          nodes={visual.flowData.nodes}
          edges={visual.flowData.edges}
          title={visual.title}
          description={visual.description}
        />
        <EducationalContext visual={visual} />
      </div>
    );
  }

  // Mermaid Diagram (LEGACY - kept for backwards compatibility)
  if (visual.type === 'mermaid') {
    return (
      <Card className="p-6 my-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950">
        <div className="text-center py-8">
          <p className="text-orange-600 dark:text-orange-400 mb-2">⚠️ Mermaid diagrams are deprecated</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This diagram type is no longer supported. Please try asking for a flowchart instead.
          </p>
        </div>
      </Card>
    );
  }

  // Comparison Chart
  if (visual.type === 'comparison-chart' && visual.data) {
    const chartType = visual.chartType || 'bar';

    return (
      <Card className="p-6 my-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        {visual.title && (
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            {visual.title}
          </h3>
        )}
        {visual.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {visual.description}
          </p>
        )}
        <ResponsiveContainer width="100%" height={350}>
          {chartType === 'radar' ? (
            <RadarChart data={visual.data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis />
              <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          ) : (
            <BarChart data={visual.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8b5cf6" />
              {visual.data[0]?.value2 && <Bar dataKey="value2" fill="#ec4899" />}
            </BarChart>
          )}
        </ResponsiveContainer>
        <EducationalContext visual={visual} />
      </Card>
    );
  }

  // AI Generated Image
  if (visual.type === 'ai-image' && visual.imageUrl) {
    return (
      <Card className="p-6 my-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        {visual.title && (
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            🎨 {visual.title}
          </h3>
        )}
        {visual.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {visual.description}
          </p>
        )}
        
        {!imageError ? (
          <div className="relative rounded-lg overflow-hidden shadow-lg bg-white dark:bg-gray-800">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Generating image...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take 5-15 seconds</p>
                </div>
              </div>
            )}
            <img 
              src={visual.imageUrl} 
              alt={visual.title || 'AI Generated Visual'}
              className={`w-full h-auto object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </div>
        ) : (
          <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">Failed to generate image</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The AI image service is currently unavailable. Try asking for a diagram or chart instead.
            </p>
          </div>
        )}
        
        {!imageError && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">AI Generated</span>
              <span>Powered by Pollinations.ai</span>
            </div>
            {!imageLoading && (
              <span className="text-green-600 dark:text-green-400">✓ Loaded</span>
            )}
          </div>
        )}
        
        <EducationalContext visual={visual} />
      </Card>
    );
  }

  // Fallback text
  return (
    <Card className="p-4 my-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <p className="text-sm text-gray-700 dark:text-gray-300">{visual.content || 'Visual content unavailable'}</p>
    </Card>
  );
};
