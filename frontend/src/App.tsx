/**
 * App - Main application component with routing
 *
 * Routes:
 * - / : Home page (project selection)
 * - /project/:id : Redirects to current phase
 * - /project/:id/:phase : Project workspace with phase content
 *
 * TODO: Add more routes as features are built (settings, profile, etc.)
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { UploadArea } from '@/components/upload/UploadArea';
import { DataViewerTab } from '@/components/data/DataViewerTab';
import { useProjectStore } from '@/stores/projectStore';
import { FolderOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import type { Phase } from '@/types/phase';

// Home page - shown when no project is selected
function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const projects = useProjectStore((state) => state.projects);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            AI-Augmented AutoML Toolchain
          </h1>
          <p className="text-muted-foreground">
            {projects.length === 0
              ? 'Create your first project to get started with automated machine learning workflows.'
              : 'Select a project from the sidebar or create a new one.'}
          </p>
        </div>

        {projects.length === 0 && (
          <Button size="lg" onClick={() => setIsCreateDialogOpen(true)}>
            <FolderOpen className="h-5 w-5 mr-2" />
            Create Your First Project
          </Button>
        )}

        <ProjectDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </div>
    </div>
  );
}

// Redirect to current phase
function ProjectRedirect() {
  const { projectId } = useParams();
  const projects = useProjectStore((state) => state.projects);
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

  if (!project) {
    return <Navigate to="/" replace />;
  }

  // Redirect to current phase (or upload if not set)
  return <Navigate to={`/project/${projectId}/${project.currentPhase || 'upload'}`} replace />;
}

// Project workspace - shown when a project and phase are selected
function ProjectWorkspace() {
  const { projectId, phase } = useParams<{ projectId: string; phase: Phase }>();
  const projects = useProjectStore((state) => state.projects);
  const setCurrentPhase = useProjectStore((state) => state.setCurrentPhase);
  const isPhaseUnlocked = useProjectStore((state) => state.isPhaseUnlocked);

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

  // Set active project if not set
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  useEffect(() => {
    if (projectId && projectId !== useProjectStore.getState().activeProjectId) {
      setActiveProject(projectId);
    }
  }, [projectId, setActiveProject]);

  if (!project) {
    return <Navigate to="/" replace />;
  }

  if (!phase) {
    return <Navigate to={`/project/${projectId}/${project.currentPhase || 'upload'}`} replace />;
  }

  // Check if phase is unlocked
  if (!isPhaseUnlocked(projectId, phase as Phase)) {
    // Redirect to current phase if locked
    return <Navigate to={`/project/${projectId}/${project.currentPhase}`} replace />;
  }

  // Update current phase
  useEffect(() => {
    if (phase && project.currentPhase !== phase) {
      setCurrentPhase(projectId, phase as Phase);
    }
  }, [phase, projectId, project.currentPhase, setCurrentPhase]);

  // Render content based on phase
  switch (phase as Phase) {
    case 'upload':
      return <UploadArea />;

    case 'data-viewer':
      return <DataViewerTab />;

    case 'preprocessing':
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Data Preprocessing</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Preprocessing interface will be implemented here. This is where users can clean,
              transform, and prepare their data for model training.
            </p>
            <p className="text-xs text-muted-foreground italic">
              TODO: Implement preprocessing UI with data cleaning, transformation, and feature
              engineering tools.
            </p>
          </div>
        </div>
      );

    case 'feature-engineering':
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Feature Engineering</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Feature engineering interface will be implemented here with AI-assisted suggestions.
            </p>
            <p className="text-xs text-muted-foreground italic">
              TODO: Implement RAG-based feature suggestions and CRUD interface.
            </p>
          </div>
        </div>
      );

    case 'training':
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Model Training</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Model training interface with algorithm selection, hyperparameter tuning, and
              experiment tracking.
            </p>
            <p className="text-xs text-muted-foreground italic">
              TODO: Implement model training UI with backend integration.
            </p>
          </div>
        </div>
      );

    case 'experiments':
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Experiments</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Experiment tracking dashboard with metrics, visualizations, and model comparison.
            </p>
            <p className="text-xs text-muted-foreground italic">
              TODO: Implement experiment tracking UI.
            </p>
          </div>
        </div>
      );

    case 'deployment':
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Deployment</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Model deployment interface with containerization and API endpoint management.
            </p>
            <p className="text-xs text-muted-foreground italic">
              TODO: Implement deployment UI.
            </p>
          </div>
        </div>
      );

    case 'chat':
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">AI Assistant</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Policy-aware AI assistant powered by RAG for guidance and insights.
            </p>
            <p className="text-xs text-muted-foreground italic">
              TODO: Implement AI chat interface with RAG integration.
            </p>
          </div>
        </div>
      );

    default:
      return <Navigate to={`/project/${projectId}/upload`} replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full bg-background text-foreground">
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/:projectId" element={<ProjectRedirect />} />
            <Route path="/project/:projectId/:phase" element={<ProjectWorkspace />} />
          </Routes>
        </AppShell>
      </div>
    </BrowserRouter>
  );
}

export default App;