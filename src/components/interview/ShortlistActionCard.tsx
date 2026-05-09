import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Check, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

interface ShortlistActionCardProps {
  interviewId: string;
  interviewName: string;
}

export function ShortlistActionCard({ interviewId, interviewName }: ShortlistActionCardProps) {
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();
  const navigate = useNavigate();

  const [shortlistedCount, setShortlistedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdListId, setCreatedListId] = useState<string | null>(null);

  // Fetch shortlisted count
  useEffect(() => {
    const fetchShortlistedCount = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/swipe/${interviewId}/shortlisted`
        );

        if (response.ok) {
          const data = await response.json();
          setShortlistedCount(data.shortlisted_count || 0);
          setRejectedCount(data.rejected_count || 0);
        }
      } catch (error) {
        console.error('Error fetching shortlisted count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShortlistedCount();
  }, [interviewId]);

  const handleCreateList = async () => {
    if (!currentWorkspace || !currentProject) {
      toast({
        title: 'Error',
        description: 'Workspace or project not selected',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/swipe/${interviewId}/create-shortlist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            interview_name: interviewName,
            workspace_id: currentWorkspace.id,
            project_id: currentProject.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setCreated(true);
        setCreatedListId(data.list_id);
        toast({
          title: 'List Created',
          description: `"${data.list_name}" created with ${data.added_count} candidates`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create list',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating shortlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to create candidate list',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleViewList = () => {
    if (createdListId) {
      navigate(`/lists/${createdListId}`);
    } else {
      navigate('/lists');
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="p-4 bg-gray-50 border-gray-200 mb-6">
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading shortlist data...</span>
        </div>
      </Card>
    );
  }

  // No swipe decisions yet
  if (shortlistedCount === 0 && rejectedCount === 0) {
    return (
      <Card className="p-4 bg-gray-50 border-gray-200 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-200">
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">No candidates reviewed yet</p>
            <p className="text-xs text-gray-400">Use the mobile swipe feature to review candidates</p>
          </div>
        </div>
      </Card>
    );
  }

  // No shortlisted candidates
  if (shortlistedCount === 0) {
    return (
      <Card className="p-4 bg-amber-50 border-amber-200 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <Users className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700">No candidates shortlisted</p>
            <p className="text-xs text-amber-600">{rejectedCount} candidate{rejectedCount !== 1 ? 's' : ''} reviewed but none shortlisted</p>
          </div>
        </div>
      </Card>
    );
  }

  // List already created
  if (created) {
    return (
      <Card className="p-4 bg-green-50 border-green-200 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Candidate list created!</p>
              <p className="text-xs text-green-600">Shortlisted - {interviewName}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleViewList}
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            View List
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </Card>
    );
  }

  // Has shortlisted candidates - show create button
  return (
    <Card className="p-4 bg-green-50 border-green-200 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <Users className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">
              {shortlistedCount} candidate{shortlistedCount !== 1 ? 's' : ''} shortlisted
            </p>
            <p className="text-xs text-green-600">
              Ready to create a curated candidate list
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleCreateList}
          disabled={creating}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {creating ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="mr-1 h-3 w-3" />
              Create List
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
