import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { qualifiedListsApi, QualifiedList } from "@/services/qualifiedListsApi";
import { Loader2, CheckCircle, Plus, Search, List as ListIcon } from "lucide-react";

interface AddToQualifiedListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCandidates: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  sourceListId?: string;  // Source list ID for finding candidates
  sourceProjectId?: string;  // Source project ID (for shared lists)
  onSuccess?: () => void;
  initialMode?: 'select-list' | 'create-new';
}

export function AddToQualifiedListModal({
  isOpen,
  onClose,
  selectedCandidates,
  sourceListId,
  sourceProjectId,
  onSuccess,
  initialMode = 'select-list'
}: AddToQualifiedListModalProps) {
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();
  const [mode, setMode] = useState<'select-list' | 'create-new'>(initialMode);
  const [qualifiedLists, setQualifiedLists] = useState<QualifiedList[]>([]);
  const [candidateInLists, setCandidateInLists] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLists, setIsFetchingLists] = useState(false);

  // Form state for creating new list
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      fetchQualifiedLists();
      if (selectedCandidates.length === 1 && selectedCandidates[0].email) {
        checkCandidateStatus(selectedCandidates[0].email);
      }
    } else {
      // Reset on close
      setMode(initialMode);
      setSearchQuery('');
      setSelectedListId(null);
      setListName('');
      setDescription('');
      setTags([]);
    }
  }, [isOpen, selectedCandidates, initialMode]);

  const fetchQualifiedLists = async () => {
    if (!currentWorkspace || !currentProject) return;

    setIsFetchingLists(true);
    try {
      const lists = await qualifiedListsApi.getProjectQualifiedLists(currentWorkspace.id, currentProject.id);
      setQualifiedLists(lists);
    } catch (error) {
      console.error('Error fetching qualified lists:', error);
      toast({
        title: "Error",
        description: "Failed to load curated lists",
        variant: "destructive"
      });
    } finally {
      setIsFetchingLists(false);
    }
  };

  const checkCandidateStatus = async (email: string) => {
    if (!currentWorkspace) return;

    try {
      const listIds = await qualifiedListsApi.checkCandidateInLists(currentWorkspace.id, email);
      setCandidateInLists(listIds);
    } catch (error) {
      console.error('Error checking candidate status:', error);
    }
  };

  const handleAddToList = async () => {
    if (!selectedListId || !currentWorkspace || !currentProject) return;

    setIsLoading(true);
    try {
      const candidateIds = selectedCandidates.map(c => c.id);
      const result = await qualifiedListsApi.addCandidatesToQualifiedList(
        currentWorkspace.id,
        currentProject.id,
        selectedListId,
        candidateIds,
        sourceListId,
        sourceProjectId
      );

      toast({
        title: "Success",
        description: `Added ${result.addedCount} candidate(s) to list${result.skippedCount > 0 ? ` (${result.skippedCount} already existed)` : ''}`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add candidates to list",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!listName.trim()) {
      toast({
        title: "Validation Error",
        description: "List name is required",
        variant: "destructive"
      });
      return;
    }

    if (!currentWorkspace || !currentProject) return;

    setIsLoading(true);
    try {
      const candidateIds = selectedCandidates.map(c => c.id);
      const result = await qualifiedListsApi.createQualifiedListWithCandidatesProject(
        currentWorkspace.id,
        currentProject.id,
        {
          name: listName,
          description,
          tags,
          candidateIds,
          sourceListId,
          sourceProjectId
        }
      );

      toast({
        title: "Success",
        description: `Created curated list "${listName}" with ${result.addedCount} candidate(s)`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create curated list",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLists = qualifiedLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background border-border rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        {mode === 'select-list' ? (
          <>
            <DialogHeader>
              <DialogTitle className=" text-lg font-bold">Add to Curated List</DialogTitle>
              <DialogDescription>
                {selectedCandidates.length === 1
                  ? `Add ${selectedCandidates[0].name} to a curated list`
                  : `Add ${selectedCandidates.length} candidates to a curated list`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search curated lists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                />
              </div>

              {/* Lists */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {isFetchingLists ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredLists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No curated lists yet.</p>
                    <p className="text-sm mt-1">Create your first one!</p>
                  </div>
                ) : (
                  filteredLists.map((list) => {
                    const isAlreadyAdded = candidateInLists.includes(list.id);
                    const isSelected = selectedListId === list.id;

                    return (
                      <div
                        key={list.id}
                        onClick={() => !isAlreadyAdded && setSelectedListId(list.id)}
                        className={`p-4 rounded border cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${
                          isAlreadyAdded
                            ? 'opacity-50 cursor-not-allowed bg-muted'
                            : isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{list.name}</h3>
                              {isAlreadyAdded && (
                                <Badge variant="secondary" className="bg-success/10 text-success">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Already Added
                                </Badge>
                              )}
                            </div>
                            {list.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {list.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs rounded">
                                {list.totalCandidates} candidates
                              </Badge>
                              {list.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs rounded">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => setMode('create-new')}
                  variant="outline"
                  className="flex-1 rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New List
                </Button>
                <Button
                  onClick={handleAddToList}
                  disabled={!selectedListId || isLoading}
                  className="flex-1 bg-ink hover:bg-ink text-paper rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Add to List
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className=" text-lg font-bold">Create New Curated List</DialogTitle>
              <DialogDescription>
                {selectedCandidates.length} candidate(s) will be added to this list
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  List Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., Senior Engineers Q4"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  autoFocus
                  className="rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe this curated list..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => setMode('select-list')} variant="outline" className="rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-semibold">
                  Back
                </Button>
                <Button onClick={handleCreateList} disabled={isLoading} className="flex-1 bg-ink hover:bg-ink text-paper rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-semibold">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create & Add
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
