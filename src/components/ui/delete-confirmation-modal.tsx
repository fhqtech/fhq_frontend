import React from 'react';
import { X, Warning } from 'phosphor-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  interviewName: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  interviewName, 
  isDeleting = false 
}: DeleteConfirmationModalProps) {

  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    onClose();
  };

  const isConfirmDisabled = isDeleting;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bg-black/50 flex items-center justify-center p-4"
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
      <Card className="w-full max-w-md border-error">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-error">
              <Warning className="w-5 h-5" weight="fill" />
              <span>Delete Interview</span>
            </CardTitle>
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="text-foreground-muted hover:text-foreground disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <CardDescription>
            This action cannot be undone. The interview will be permanently removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-error-light/10 border border-error/20 rounded-lg">
            <p className="text-sm font-medium mb-2">You are about to delete:</p>
            <p className="text-sm font-mono bg-white/80 p-2 rounded border">
              {interviewName}
            </p>
          </div>

          <p className="text-sm text-foreground-muted">
            This interview and all associated data will be permanently deleted.
          </p>

          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="flex-1 bg-error hover:bg-error/90 text-white border-error"
            >
              {isDeleting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                'Delete Interview'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}