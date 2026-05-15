import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CandidateRating } from "./CandidateRating";
import { CandidateNotes } from "./CandidateNotes";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, X } from "lucide-react";
import { SpinnerWithCopy } from "@/components/ui/spinner";

interface RecruiterRating {
  rating: number;
  notes: string;
  ratedBy: string;
  ratedAt: string;
  lastUpdatedAt?: string;
}

interface RatingPanelProps {
  sessionId: string;
  initialRating?: RecruiterRating;
  onSave?: (rating: RecruiterRating) => void;
  compact?: boolean;
}

export function RatingPanel({
  sessionId,
  initialRating,
  onSave,
  compact = false
}: RatingPanelProps) {
  const [rating, setRating] = useState<number>(initialRating?.rating || 0);
  const [notes, setNotes] = useState<string>(initialRating?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadedRating, setLoadedRating] = useState<RecruiterRating | null>(null);
  const { toast } = useToast();

  // Fetch existing rating on mount
  useEffect(() => {
    const fetchRating = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

        const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/rating`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.success && data.has_rating) {
          setLoadedRating(data.rating);
          setRating(data.rating.rating);
          setNotes(data.rating.notes || "");
        }
      } catch (error) {
        console.error("Error fetching rating:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRating();
  }, [sessionId]);

  useEffect(() => {
    // Check if there are unsaved changes
    const ratingChanged = rating !== (loadedRating?.rating || 0);
    const notesChanged = notes !== (loadedRating?.notes || "");
    setHasChanges(ratingChanged || notesChanged);
  }, [rating, notes, loadedRating]);

  const handleSave = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("auth_token");
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/rating`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Rating Saved",
          description: "Your rating has been saved successfully",
        });

        setHasChanges(false);

        // Call onSave callback with the saved rating data
        if (onSave && data.rating) {
          onSave(data.rating);
        }
      } else {
        throw new Error(data.error || "Failed to save rating");
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save rating",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setRating(loadedRating?.rating || 0);
    setNotes(loadedRating?.notes || "");
    setHasChanges(false);
  };

  // Show loading state while fetching
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <SpinnerWithCopy size="lg" label="Loading rating…" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Your Rating</h3>
            <p className="text-xs text-muted-foreground">Rate this candidate's interview</p>
          </div>
        </div>

        <div className="w-full">
          <CandidateRating
            rating={rating}
            onChange={setRating}
            size="large"
            showNumber={true}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || rating === 0}
            className="flex-1"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Rating
              </>
            )}
          </Button>

          {hasChanges && (
            <Button
              onClick={handleClear}
              variant="outline"
              size="sm"
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recruiter Rating</CardTitle>
        <CardDescription>
          Rate this candidate's interview performance and add your notes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <CandidateRating
          rating={rating}
          onChange={setRating}
          size="large"
          showNumber={true}
        />

        <CandidateNotes
          notes={notes}
          onChange={setNotes}
          placeholder="Add your notes about this candidate..."
          lastUpdated={initialRating?.lastUpdatedAt}
        />

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || rating === 0}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Rating
              </>
            )}
          </Button>

          {hasChanges && (
            <Button
              onClick={handleClear}
              variant="outline"
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>

        {!hasChanges && loadedRating && (
          <p className="text-sm text-muted-foreground text-center">
            {loadedRating.lastUpdatedAt
              ? `Last saved on ${new Date(loadedRating.lastUpdatedAt).toLocaleString()}`
              : `Saved on ${new Date(loadedRating.ratedAt).toLocaleString()}`
            }
          </p>
        )}
      </CardContent>
    </Card>
  );
}
