/**
 * TrainingPanel - Jupyter-style training interface with AI assistance
 * 
 * Features:
 * - Model selection with template code
 * - Code cells for custom training logic
 * - Chat input for AI assistance (RAG-enabled)
 * - Output visualization
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Send, 
  Sparkles, 
  Code,
  MessageSquare,
  Loader2,
  BookOpen,
  Lightbulb,
  Cpu
} from 'lucide-react';
import { CodeCell } from './CodeCell';
import { ModelSelector } from './ModelSelector';
import type { Cell, ModelTemplate } from '@/types/training';
import { getAnswer } from '@/lib/api/documents';

export function TrainingPanel() {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [selectedModel, setSelectedModel] = useState<ModelTemplate | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when cells change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [cells]);

  // Generate unique ID for cells
  const generateCellId = () => `cell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Add a new code cell
  const addCodeCell = useCallback((content: string = '') => {
    const newCell: Cell = {
      id: generateCellId(),
      type: 'code',
      content,
      status: 'idle',
      createdAt: new Date().toISOString()
    };
    setCells(prev => [...prev, newCell]);
  }, []);

  // Add a chat cell (AI response)
  const addChatCell = useCallback((content: string) => {
    const newCell: Cell = {
      id: generateCellId(),
      type: 'chat',
      content,
      status: 'success',
      createdAt: new Date().toISOString()
    };
    setCells(prev => [...prev, newCell]);
  }, []);

  // Handle model selection
  const handleSelectModel = useCallback((model: ModelTemplate) => {
    setSelectedModel(model);
    setShowModelSelector(false);
    
    // Generate code from template
    let code = model.codeTemplate;
    
    // Replace template placeholders with default values
    for (const [key, config] of Object.entries(model.defaultParams)) {
      code = code.replace(new RegExp(`{{${key}}}`, 'g'), String(config.default));
    }
    
    // Add the generated code as a new cell
    addCodeCell(code);
  }, [addCodeCell]);

  // Handle cell content change
  const handleCellContentChange = useCallback((cellId: string, content: string) => {
    setCells(prev => prev.map(cell => 
      cell.id === cellId ? { ...cell, content } : cell
    ));
  }, []);

  // Handle cell deletion
  const handleDeleteCell = useCallback((cellId: string) => {
    setCells(prev => prev.filter(cell => cell.id !== cellId));
  }, []);

  // Simulate running a cell (in a real app, this would send to a backend/kernel)
  const handleRunCell = useCallback((cellId: string) => {
    setCells(prev => prev.map(cell => {
      if (cell.id !== cellId) return cell;
      
      return {
        ...cell,
        status: 'running' as const,
        executedAt: new Date().toISOString()
      };
    }));

    // Simulate execution (would be replaced with actual backend call)
    setTimeout(() => {
      setCells(prev => prev.map(cell => {
        if (cell.id !== cellId) return cell;
        
        return {
          ...cell,
          status: 'success' as const,
          executionDurationMs: Math.floor(Math.random() * 1000) + 100,
          output: {
            type: 'text' as const,
            content: '# Code execution simulated.\n# In a real implementation, this would connect to a Python kernel.'
          }
        };
      }));
    }, 1500);
  }, []);

  // Handle AI chat submission
  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || !projectId) return;
    
    const userMessage = chatInput;
    setChatInput('');
    setIsAiThinking(true);

    // Add user message as a cell
    const userCell: Cell = {
      id: generateCellId(),
      type: 'chat',
      content: `**You:** ${userMessage}`,
      status: 'success',
      createdAt: new Date().toISOString()
    };
    setCells(prev => [...prev, userCell]);

    try {
      // Call the RAG API
      const response = await getAnswer(projectId, userMessage);
      
      if (response.answer.status === 'ok') {
        const aiResponse = response.answer.answer;
        const citations = response.answer.citations;
        
        // Format response with citations
        let formattedResponse = `**AI Assistant:**\n\n${aiResponse}`;
        
        if (citations.length > 0) {
          formattedResponse += '\n\n---\n*Sources:*\n';
          citations.forEach((citation, idx) => {
            formattedResponse += `\n${idx + 1}. ${citation.filename} (chunk ${citation.chunkIndex})`;
          });
        }
        
        addChatCell(formattedResponse);
      } else {
        addChatCell('**AI Assistant:**\n\nI couldn\'t find relevant information in your documents. Try uploading relevant documentation or rephrasing your question.');
      }
    } catch (error) {
      console.error('AI chat failed:', error);
      addChatCell('**AI Assistant:**\n\nSorry, I encountered an error. Please try again.');
    } finally {
      setIsAiThinking(false);
      inputRef.current?.focus();
    }
  }, [chatInput, projectId, addChatCell]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Model Training</h2>
            <p className="text-sm text-muted-foreground">
              Train models with AI assistance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedModel && (
            <Badge variant="secondary" className="gap-1">
              <Code className="h-3 w-3" />
              {selectedModel.name}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModelSelector(!showModelSelector)}
          >
            {showModelSelector ? 'Hide' : 'Change Model'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCodeCell()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Cell
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {/* Model Selector */}
              {showModelSelector && (
                <div className="mb-6">
                  <ModelSelector
                    selectedModelId={selectedModel?.id}
                    onSelectModel={handleSelectModel}
                  />
                </div>
              )}

              {/* Cells */}
              {cells.length === 0 && !showModelSelector ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Ready to Train</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      Select a model above or add a code cell to start training.
                      Ask the AI assistant for help with your training code.
                    </p>
                    <div className="flex justify-center gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowModelSelector(true)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Choose Model
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => addCodeCell()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Cell
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {cells.map((cell, index) => (
                    <CodeCell
                      key={cell.id}
                      cell={cell}
                      cellNumber={index + 1}
                      onRun={cell.type === 'code' ? () => handleRunCell(cell.id) : undefined}
                      onDelete={() => handleDeleteCell(cell.id)}
                      onContentChange={cell.type === 'code' ? (content) => handleCellContentChange(cell.id, content) : undefined}
                      isRunning={cell.status === 'running'}
                    />
                  ))}
                </div>
              )}

              {/* AI thinking indicator */}
              {isAiThinking && (
                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-sm text-purple-700 dark:text-purple-300">
                      AI is thinking...
                    </span>
                  </CardContent>
                </Card>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* AI Chat Input */}
          <div className="border-t bg-background p-4 shrink-0">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                  placeholder="Ask AI for help with training, tuning, or debugging..."
                  className="pl-10 pr-20"
                  disabled={isAiThinking}
                />
                <Button
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isAiThinking}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Try: "How do I tune hyperparameters?"
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                AI uses your uploaded documents for context
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

