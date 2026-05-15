/**
 * ProjectSelector Component
 * Modal to select and switch between projects in current workspace
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { workspaceApi } from '@/services/workspaceApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Star, Pencil, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
}

interface Project {
  id: string;
  name: string;
  ownerId?: string;
  admins?: string[];
}

interface ProjectSelectorProps {
  compact?: boolean; // For header usage
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ compact = false }) => {
  const {
    currentProject,
    projects: contextProjects,
    isLoadingProjects: contextLoadingProjects,
    switchProject,
    switchWorkspace,
    createProject,
    refreshProjects,
    currentWorkspace
  } = useWorkspace();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [starredProjects, setStarredProjects] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [switchingProjectId, setSwitchingProjectId] = useState<string | null>(null);

  // Workspace selection states
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [workspaceProjects, setWorkspaceProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Use workspace projects if a different workspace is selected, otherwise use context projects
  const projects = selectedWorkspaceId && selectedWorkspaceId !== currentWorkspace?.id
    ? workspaceProjects
    : contextProjects;

  const handleProjectChange = async (projectId: string) => {
    setSwitchingProjectId(projectId);

    try {
      // Check if project is from a different workspace
      if (selectedWorkspaceId && selectedWorkspaceId !== currentWorkspace?.id) {
        // User is viewing projects from a different workspace
        // First switch workspace, then switch project
        const targetWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
        const confirmSwitch = confirm(
          `This project belongs to "${targetWorkspace?.name}". ` +
          `Do you want to switch to this workspace and project?`
        );

        if (!confirmSwitch) {
          setSwitchingProjectId(null);
          return;
        }

        // Switch workspace first
        await switchWorkspace(selectedWorkspaceId);

        // Wait a bit for projects to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Then switch to the specific project
        await switchProject(projectId);
      } else {
        // Same workspace - just switch project
        await switchProject(projectId);
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch project:', error);
      alert('Failed to switch to this project. Please try again.');
    } finally {
      setSwitchingProjectId(null);
    }
  };

  const toggleStar = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const newProject = await createProject(newProjectName.trim());
      setNewProjectName('');
      setShowCreateDialog(false);
      setSwitchingProjectId(newProject.id);
      await switchProject(newProject.id);
      setSwitchingProjectId(null);
      // Keep the Manage Projects modal open
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
      setSwitchingProjectId(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditProject = (project: { id: string; name: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditedName(project.name);
  };

  const handleUpdateProject = async (projectId: string) => {
    if (!editedName.trim()) return;

    setIsUpdating(true);
    try {
      await workspaceApi.updateProject(projectId, { name: editedName.trim() });
      await refreshProjects();
      setEditingProjectId(null);
      setEditedName('');
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditedName('');
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setDeletingProjectId(projectId);
    try {
      await workspaceApi.deleteProject(projectId);
      await refreshProjects();

      // If deleted project was active, switch to first available project
      if (currentProject?.id === projectId && projects.length > 1) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          await switchProject(remainingProjects[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  // Fetch workspaces when modal opens
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!isOpen || !user?.id) return;

      setIsLoadingWorkspaces(true);
      try {
        const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const response = await fetch(
          `http://localhost:8082/api/workspaces`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setWorkspaces(data || []);
          // Set current workspace as default
          if (data && data.length > 0 && !selectedWorkspaceId) {
            setSelectedWorkspaceId(currentWorkspace?.id || data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        setWorkspaces([]);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [isOpen, user?.id]);

  // Fetch projects when workspace changes
  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedWorkspaceId || !user?.id || selectedWorkspaceId === currentWorkspace?.id) {
        // Use context projects for current workspace
        setIsLoadingProjects(false);
        return;
      }

      setIsLoadingProjects(true);
      try {
        const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const response = await fetch(
          `http://localhost:8082/api/workspaces/${selectedWorkspaceId}/projects`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setWorkspaceProjects(data || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setWorkspaceProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [selectedWorkspaceId, user?.id, currentWorkspace?.id]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.id.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  if (isLoadingProjects) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${compact ? 'px-0 py-0' : 'px-3 py-2'}`}>
        <Spinner size="sm" label="Loading projects" />
        {!compact && <span>Loading projects…</span>}
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={compact ? 'px-4 py-2 border border-rule-strong rounded bg-paper text-sm hover:bg-paper-2 flex items-center gap-2' : 'px-3 py-2'}
      >
        {compact && (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="hsl(var(--ink))" viewBox="0 0 256 256">
            <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm109.94-52.79a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A112.1,112.1,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.62a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21Zm-15,34.91-28.57,16.25a8,8,0,0,0-3,3c-.58,1-1.19,2.06-1.81,3.06a7.94,7.94,0,0,0-1.22,4.21l-.15,32.25a95.89,95.89,0,0,1-25.37,14.3L134,199.13a8,8,0,0,0-3.91-1h-.19c-1.21,0-2.43,0-3.64,0a8.08,8.08,0,0,0-4.1,1l-28.84,16.1A96,96,0,0,1,67.88,201l-.11-32.2a8,8,0,0,0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.09,8.09,0,0,0-3-3.06l-28.6-16.29a90.49,90.49,0,0,1,0-28.26L61.67,97.63a8,8,0,0,0,3-3c.58-1,1.19-2.06,1.81-3.06a7.94,7.94,0,0,0,1.22-4.21l.15-32.25a95.89,95.89,0,0,1,25.37-14.3L122,56.87a8,8,0,0,0,4.1,1c1.21,0,2.43,0,3.64,0a8.08,8.08,0,0,0,4.1-1l28.84-16.1A96,96,0,0,1,188.12,55l.11,32.2a8,8,0,0,0,1.22,4.22c.62,1,1.23,2,1.8,3.06a8.09,8.09,0,0,0,3,3.06l28.6,16.29A90.49,90.49,0,0,1,222.9,142.12Z"></path>
          </svg>
        )}
        {currentProject?.name || 'Select project'}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl rounded!">
          <DialogHeader className="pb-6 pr-8">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-[hsl(var(--ink))]">Manage Projects</DialogTitle>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-[hsl(var(--ink))] text-paper hover:bg-[hsl(var(--ink-soft))] border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                New project
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-col">
            {/* Workspace Selector */}
            <div className="mb-4">
              <Label htmlFor="workspace-selector" className="text-sm font-semibold text-[hsl(var(--ink))] mb-2 block">
                Select Workspace
              </Label>
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger id="workspace-selector" className="w-full">
                  <SelectValue placeholder={isLoadingWorkspaces ? "Loading workspaces..." : "Select a workspace"} />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      <div className="flex items-center gap-2">
                        <span>{workspace.name}</span>
                        {workspace.ownerId === user?.id && (
                          <span className="text-xs text-info">(Owner)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Input
                placeholder="Search by ID or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4"
              />
            </div>

            {/* Projects Table */}
            <div className="border rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] mb-12">
              <Table>
                <TableHeader>
                  <TableRow className="bg-paper-2/50">
                    <TableHead className="font-semibold text-[hsl(var(--ink))] text-base">Name</TableHead>
                    <TableHead className="font-semibold text-[hsl(var(--ink))] text-base">ID</TableHead>
                    <TableHead className="w-[80px] font-semibold text-[hsl(var(--ink))] text-base text-center">Star</TableHead>
                    <TableHead className="w-[150px] font-semibold text-[hsl(var(--ink))] text-base text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted py-12 text-sm">
                        No projects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => (
                      <TableRow
                        key={project.id}
                        onClick={() => {
                          // Don't switch projects if we're editing or already switching
                          if (editingProjectId !== project.id && !switchingProjectId) {
                            handleProjectChange(project.id);
                          }
                        }}
                        className={`cursor-pointer hover:bg-paper-2/50 transition-colors ${
                          project.id === currentProject?.id ? 'bg-info-soft/30' : ''
                        } ${switchingProjectId === project.id ? 'opacity-50' : ''}`}
                      >
                        <TableCell className="font-medium text-[hsl(var(--ink))] text-sm" onClick={(e) => editingProjectId === project.id && e.stopPropagation()}>
                          {editingProjectId === project.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateProject(project.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="h-8 text-sm"
                                autoFocus
                                disabled={isUpdating}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateProject(project.id);
                                }}
                                disabled={isUpdating || !editedName.trim()}
                                className="p-1 hover:bg-success-soft rounded transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 text-success animate-spin" />
                                ) : (
                                  <svg className="h-4 w-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }}
                                disabled={isUpdating}
                                className="p-1 hover:bg-paper-3 rounded transition-colors disabled:opacity-50"
                                title="Cancel"
                              >
                                <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {switchingProjectId === project.id && (
                                <Loader2 className="h-4 w-4 animate-spin text-info" />
                              )}
                              <span>{project.name}</span>
                              {project.id === currentProject?.id && (
                                <span className="ml-2 text-xs text-info font-semibold">(Current)</span>
                              )}
                              {project.ownerId === user?.id && (
                                <span className="text-xs text-info bg-info-soft px-2 py-0.5 rounded-full">Owner</span>
                              )}
                              {project.admins?.includes(user?.id || '') && project.ownerId !== user?.id && (
                                <span className="text-xs text-gold-ink bg-paper-3 px-2 py-0.5 rounded-full">Admin</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted text-sm font-mono">
                          {project.id}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => toggleStar(project.id, e)}
                            className="hover:scale-110 transition-transform inline-flex"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                starredProjects.has(project.id)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-2 hover:text-muted-2'
                              }`}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleEditProject(project, e)}
                              className="p-1.5 hover:bg-paper-3 rounded transition-colors"
                              title="Edit project"
                            >
                              <Pencil className="h-4 w-4 text-muted" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteProject(project.id, e)}
                              disabled={deletingProjectId === project.id}
                              className="p-1.5 hover:bg-danger-soft rounded transition-colors disabled:opacity-50"
                              title="Delete project"
                            >
                              {deletingProjectId === project.id ? (
                                <Loader2 className="h-4 w-4 text-danger animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-danger" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Cancel Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="px-8 font-medium"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md rounded!">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[hsl(var(--ink))]">Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label htmlFor="projectName" className="text-sm font-medium text-[hsl(var(--ink))] mb-2 block">
                Project Name
              </label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) {
                    handleCreateProject();
                  }
                }}
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewProjectName('');
                }}
                variant="outline"
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreating}
                className="bg-[hsl(var(--ink))] text-paper hover:bg-[hsl(var(--ink-soft))] border-0"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show stats only in non-compact mode (sidebar) */}
      {!compact && currentProject && (
        <div className="mt-2 px-2 text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>Interviews: {currentProject.stats.interviewCount}</div>
            <div>Lists: {currentProject.stats.listsCreated}</div>
          </div>
        </div>
      )}
    </>
  );
};
