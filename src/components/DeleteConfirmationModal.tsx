import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileX, Users, Database } from 'lucide-react';
import { DeleteImpact } from '@/services/listsApi';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (forceDelete: boolean) => void;
  impact: DeleteImpact | null;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  impact,
  isLoading = false
}: DeleteConfirmationModalProps) {
  if (!impact) return null;

  const hasAffectedInterviews = impact.affectedInterviews.length > 0;
  const canSafeDelete = impact.canDelete;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-lg">
            <FileX className="w-5 h-5 text-danger" />
            <span>Delete List: {impact.listName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Impact Summary */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <h4 className="font-medium text-orange-800">Impact Analysis</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <Database className="w-3 h-3 text-orange-600" />
                <span className="text-orange-700">{impact.sourcesToDelete} source(s)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 text-orange-600" />
                <span className="text-orange-700">{impact.totalCandidates} candidates</span>
              </div>
            </div>
          </div>

          {/* Affected Interviews */}
          {hasAffectedInterviews && (
            <div className="p-4 bg-danger-soft rounded-lg border border-danger/30">
              <h4 className="font-medium text-red-800 mb-2">
                ⚠️ Used in {impact.affectedInterviews.length} Interview(s)
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {impact.affectedInterviews.map(interview => (
                  <div key={interview.id} className="flex items-center justify-between text-sm">
                    <span className="text-danger font-medium">{interview.title}</span>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={interview.status === 'active' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {interview.status}
                      </Badge>
                      <span className="text-danger text-xs">
                        {interview.candidateCount} candidates
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources List */}
          {impact.sources.length > 0 && (
            <div className="p-4 bg-paper-2 rounded-lg border border-rule">
              <h4 className="font-medium text-ink mb-2">
                Sources to be deleted:
              </h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {impact.sources.map(source => (
                  <div key={source.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{source.name}</span>
                    <span className="text-muted text-xs">
                      {source.candidateCount} candidates
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Message */}
          {hasAffectedInterviews && (
            <div className="p-3 bg-warning-soft rounded-lg border border-warning/30">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Force deleting will remove this list from all interviews and
                may affect their candidate counts. This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>

          {canSafeDelete ? (
            <Button
              variant="destructive"
              onClick={() => onConfirm(false)}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete List'}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => onConfirm(true)}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Force Deleting...' : 'Force Delete'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}