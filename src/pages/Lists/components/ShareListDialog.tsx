import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CandidateList } from '@/services/listsApi';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ShareListDialogProps {
  open: boolean;
  list: CandidateList;
  onClose: () => void;
  onShare: (targetProjectIds: string[]) => void;
}

export function ShareListDialog({ open, list, onClose, onShare }: ShareListDialogProps) {
  const { currentWorkspace, projects, currentProject } = useWorkspace();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  // Get all projects in workspace except current one
  const availableProjects = projects?.filter(
    (p: any) => p.id !== currentProject?.id
  ) || [];

  useEffect(() => {
    // Pre-select already shared projects
    setSelectedProjects((list as any).sharedWith || []);
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSharing(true);
    try {
      await onShare(selectedProjects);
    } finally {
      setSharing(false);
    }
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Candidate Pool</DialogTitle>
          <DialogDescription>
            Select projects to share "{list.name}" with. They will have read-only access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {availableProjects.length === 0 ? (
              <div className="text-center py-8 text-muted">
                No other projects available in this workspace
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableProjects.map((project: any) => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={project.id}
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={() => toggleProject(project.id)}
                    />
                    <Label
                      htmlFor={project.id}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {project.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={sharing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sharing || availableProjects.length === 0}
            >
              {sharing ? 'Sharing...' : 'Share Candidate Pool'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
