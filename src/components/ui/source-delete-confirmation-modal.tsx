import React from 'react';
import { X, Warning } from 'phosphor-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface SourceDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceName: string;
  candidateCount: number;
  isDeleting?: boolean;
}

export function SourceDeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  sourceName, 
  candidateCount,
  isDeleting = false 
}: SourceDeleteConfirmationModalProps) {
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed bg-ink/50 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        margin: 0,
        padding: '16px'
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-danger">
              <Warning className="w-5 h-5" weight="fill" />
              <span>Delete Candidate Source</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isDeleting}
              aria-label="Close dialog"
              className="text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-danger-light/10 border border-danger/20 rounded-lg">
            <p className="text-sm text-foreground">
              Are you sure you want to delete <strong>"{sourceName}"</strong>?
            </p>
            <p className="text-sm text-muted mt-2">
              This will remove access to <strong>{candidateCount} candidates</strong> from this interview.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete Source'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}