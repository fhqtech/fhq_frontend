import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CandidateList } from '@/services/listsApi';

interface EditListDialogProps {
  open: boolean;
  list: CandidateList;
  onClose: () => void;
  onUpdate: (data: { name: string; description?: string; tags?: string[]; color?: string }) => void;
}

export function EditListDialog({ open, list, onClose, onUpdate }: EditListDialogProps) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setName(list.name);
    setDescription(list.description || '');
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUpdating(true);
    try {
      await onUpdate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Candidate Pool</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Candidate Pool Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Backend Engineers Q1"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || updating}>
              {updating ? 'Updating...' : 'Update Candidate Pool'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
