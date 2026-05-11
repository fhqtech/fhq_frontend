import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

import EnhancedBlueprintDisplay from '@/components/blueprint/EnhancedBlueprintDisplay';
import { transformInterviewData } from '@/utils/blueprintTransform';
import { fetchInterviewBlueprint } from '@/services/blueprintService';
import { EnhancedBlueprintData } from '@/types/blueprintTypes';

const DynamicBlueprintPage: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [blueprintData, setBlueprintData] = useState<EnhancedBlueprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const loadBlueprint = async (isRetry = false) => {
    if (!interviewId) {
      setError('No interview ID provided');
      setLoading(false);
      return;
    }

    try {
      if (isRetry) {
        setRetrying(true);
      } else {
        setLoading(true);
      }

      setError(null);

      // Check if we have blueprint data from navigation state first (optimization)
      const navigationBlueprintData = location.state?.blueprintData;

      let rawBlueprintData;
      if (navigationBlueprintData && !isRetry) {
        // Use data from navigation state (no API call needed)
        console.log('[Blueprint] Using cached data from navigation state');
        rawBlueprintData = navigationBlueprintData;
      } else {
        // Fallback to API call (for direct URL access or retry)
        console.log('[Blueprint] Fetching data from API');
        rawBlueprintData = await fetchInterviewBlueprint(interviewId);
      }

      // Transform the API response to match component requirements
      const transformedData = transformInterviewData(rawBlueprintData);

      if (!transformedData) {
        throw new Error('Failed to transform blueprint data');
      }

      setBlueprintData(transformedData);

      if (isRetry) {
        toast({
          title: "Blueprint Loaded",
          description: "Interview blueprint has been successfully loaded.",
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load blueprint';
      setError(errorMessage);

      if (isRetry) {
        toast({
          title: "Load Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  // Load blueprint on component mount
  useEffect(() => {
    loadBlueprint();
  }, [interviewId]);

  const handleRetry = () => {
    loadBlueprint(true);
  };

  const handleGoBack = () => {
    navigate(`/interviews/${interviewId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background p-8">
        <div className="container mx-auto">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">Interview Blueprint</h1>
              <p className="text-foreground-muted">Loading blueprint data...</p>
            </div>
          </div>
        </div>

        {/* Loading content - centered */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <Spinner size="lg" variant="brand" label="Loading interview blueprint" />
          <div className="mt-6 text-center">
            <h3 className="text-lg font-semibold uppercase tracking-wider">Loading interview blueprint</h3>
            <p className="text-foreground-muted">
              Fetching blueprint data for this interview…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="container mx-auto">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">Interview Blueprint</h1>
              <p className="text-foreground-muted">Error loading blueprint</p>
            </div>
          </div>

          {/* Error content */}
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Blueprint Not Available</h3>
                  <p className="text-foreground-muted mt-2">
                    {error === 'Blueprint not found'
                      ? 'The blueprint for this interview has not been generated yet. Please check back later.'
                      : `Error: ${error}`
                    }
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="bg-[#222831] text-white hover:bg-[#393E46] rounded-sm uppercase font-bold text-xs"
                  >
                    {retrying ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGoBack}
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state - render the blueprint
  if (blueprintData) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Fixed Header - never moves */}
        <div className="flex-none bg-background px-6 pt-4 pb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">Interview Blueprint</h1>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="pt-6">
            <EnhancedBlueprintDisplay data={blueprintData} />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DynamicBlueprintPage; 
