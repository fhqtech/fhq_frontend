/**
 * WorkspaceSelector Component
 * Dropdown to select and switch between workspaces
 */

import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ChevronDown, Loader2 } from 'lucide-react';

export const WorkspaceSelector: React.FC = () => {
  const {
    currentWorkspace,
    workspaces,
    isLoadingWorkspaces,
    switchWorkspace
  } = useWorkspace();

  const handleWorkspaceChange = async (workspaceId: string) => {
    try {
      await switchWorkspace(workspaceId);
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  if (isLoadingWorkspaces) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading workspaces...</span>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2">
      <Select
        value={currentWorkspace?.id || ''}
        onValueChange={handleWorkspaceChange}
      >
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <SelectValue placeholder="Select workspace">
              {currentWorkspace?.name || 'Select workspace'}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <div className="flex items-center justify-between w-full">
                <span>{workspace.name}</span>
                {workspace.id === currentWorkspace?.id && (
                  <span className="ml-2 text-xs text-muted-foreground">(Current)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentWorkspace && (
        <div className="mt-2 px-2 text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>Projects: {currentWorkspace.stats.totalProjects}</div>
            <div>Lists: {currentWorkspace.stats.totalLists}</div>
            <div>Candidates: {currentWorkspace.stats.totalCandidates}</div>
            <div>Interviews: {currentWorkspace.stats.totalInterviews}</div>
          </div>
        </div>
      )}
    </div>
  );
};
