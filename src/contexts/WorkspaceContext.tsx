/**
 * WorkspaceContext - Manages workspace and project state
 * Provides workspace/project selection and switching functionality
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { workspaceApi, Workspace, Project } from '../services/workspaceApi';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  // Current workspace and project
  currentWorkspace: Workspace | null;
  currentProject: Project | null;

  // Available workspaces and projects
  workspaces: Workspace[];
  projects: Project[];

  // Loading states
  isLoadingWorkspaces: boolean;
  isLoadingProjects: boolean;

  // Actions
  switchWorkspace: (workspaceId: string) => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  createProject: (projectName: string) => Promise<Project>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Prevent duplicate API calls
  const isLoadingWorkspacesRef = useRef(false);
  const isLoadingProjectsRef = useRef(false);
  const hasLoadedWorkspaces = useRef(false);

  /**
   * Fetch user's workspaces on mount and when user changes
   */
  useEffect(() => {
    if (user?.activeWorkspaceId && !hasLoadedWorkspaces.current) {
      loadWorkspaces();
      hasLoadedWorkspaces.current = true;
    }
  }, [user?.activeWorkspaceId]);

  /**
   * Load projects when workspace changes
   */
  useEffect(() => {
    if (currentWorkspace) {
      loadProjects(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  /**
   * Set current project from localStorage or user's activeProjectId
   */
  useEffect(() => {
    if (projects.length === 0) return;

    // First, try to get from localStorage
    const savedProjectId = localStorage.getItem('activeProjectId');

    if (savedProjectId) {
      const savedProject = projects.find(p => p.id === savedProjectId);
      if (savedProject) {
        setCurrentProject(savedProject);
        return;
      }
    }

    // Fallback to user's activeProjectId
    if (user?.activeProjectId) {
      const project = projects.find(p => p.id === user.activeProjectId);
      if (project) {
        setCurrentProject(project);
        return;
      }
    }

    // Last fallback: first project
    setCurrentProject(projects[0]);
    localStorage.setItem('activeProjectId', projects[0].id);
  }, [user?.activeProjectId, projects]);

  /**
   * Load all workspaces for the user
   */
  const loadWorkspaces = async () => {
    if (!user) return;

    // Prevent duplicate API calls
    if (isLoadingWorkspacesRef.current) {
      console.log('🔒 Workspaces already loading, skipping...');
      return;
    }

    isLoadingWorkspacesRef.current = true;
    setIsLoadingWorkspaces(true);
    try {
      const fetchedWorkspaces = await workspaceApi.getUserWorkspaces();
      setWorkspaces(fetchedWorkspaces);

      // Set current workspace from user's activeWorkspaceId
      if (user.activeWorkspaceId) {
        const activeWorkspace = fetchedWorkspaces.find(w => w.id === user.activeWorkspaceId);
        if (activeWorkspace) {
          setCurrentWorkspace(activeWorkspace);
        } else if (fetchedWorkspaces.length > 0) {
          // Fallback to first workspace
          setCurrentWorkspace(fetchedWorkspaces[0]);
        }
      } else if (fetchedWorkspaces.length > 0) {
        // Set first workspace as default
        setCurrentWorkspace(fetchedWorkspaces[0]);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setIsLoadingWorkspaces(false);
      isLoadingWorkspacesRef.current = false;
    }
  };

  /**
   * Load projects for a workspace
   */
  const loadProjects = async (workspaceId: string) => {
    // Prevent duplicate API calls
    if (isLoadingProjectsRef.current) {
      console.log('🔒 Projects already loading, skipping...');
      return;
    }

    isLoadingProjectsRef.current = true;
    setIsLoadingProjects(true);
    try {
      const fetchedProjects = await workspaceApi.getWorkspaceProjects(workspaceId);
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
      isLoadingProjectsRef.current = false;
    }
  };

  /**
   * Switch to a different workspace
   */
  const switchWorkspace = async (workspaceId: string) => {
    try {
      await workspaceApi.switchWorkspace(workspaceId);

      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
        setCurrentProject(null); // Reset project when switching workspace
        await loadProjects(workspaceId);
      }
    } catch (error) {
      console.error('Failed to switch workspace:', error);
      throw error;
    }
  };

  /**
   * Switch to a different project
   */
  const switchProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      // Save to localStorage
      localStorage.setItem('activeProjectId', projectId);
      // Update user's activeProjectId on backend
      try {
        await workspaceApi.switchProject(projectId);
      } catch (error) {
        console.error('Failed to update active project on backend:', error);
      }
    }
  };

  /**
   * Refresh workspaces list
   */
  const refreshWorkspaces = async () => {
    await loadWorkspaces();
  };

  /**
   * Refresh projects list
   */
  const refreshProjects = async () => {
    if (currentWorkspace) {
      await loadProjects(currentWorkspace.id);
    }
  };

  /**
   * Create a new project in current workspace
   */
  const createProject = async (projectName: string): Promise<Project> => {
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    try {
      const newProject = await workspaceApi.createProject(currentWorkspace.id, projectName);
      await refreshProjects();
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        currentProject,
        workspaces,
        projects,
        isLoadingWorkspaces,
        isLoadingProjects,
        switchWorkspace,
        switchProject,
        refreshWorkspaces,
        refreshProjects,
        createProject
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

/**
 * Hook to use workspace context
 */
export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
